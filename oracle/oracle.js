import { API_BASE } from "./config.js";
const $ = (id) => document.getElementById(id),
  form = $("birth-form");
let place = null,
  controller = null,
  searchVersion = 0;
$("period-zone").value = Intl.DateTimeFormat().resolvedOptions().timeZone;
function error(message) {
  $("form-error").textContent = message;
  $("form-error").hidden = false;
  $("form-error").focus();
}
function clearError() {
  $("form-error").hidden = true;
}
function controls(id, visible) {
  const el = $(id);
  el.hidden = !visible;
  for (const input of el.querySelectorAll("input,textarea"))
    input.disabled = !visible;
}
function update() {
  const kind = form.elements["time-kind"].value,
    question = form.elements.mode.value === "question";
  controls("exact-time", kind === "exact");
  controls("range-time", kind === "approximate");
  $("unknown-time").hidden = kind !== "unknown";
  for (const id of ["time-from", "time-to"])
    $(id).required = kind === "approximate";
  controls("question-fields", question);
  $("question").required = question;
  controls("period-fields", question && $("dated").checked);
  for (const id of ["period-start", "period-end", "period-zone"])
    $(id).required = question && $("dated").checked;
}
form.addEventListener("change", update);
update();
async function request(path, options = {}) {
  if (!API_BASE)
    throw new Error(
      "The Oracle is not open for readings yet. Please return later.",
    );
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new Error(
      "The Oracle could not be reached. Check your connection and try again.",
    );
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = new Error(
      data?.error?.message ??
        "The reading could not be completed. Please try again later.",
    );
    e.code = data?.error?.code;
    throw e;
  }
  return data;
}
$("place-query").addEventListener("input", () => {
  place = null;
  searchVersion++;
  $("chosen-place").hidden = true;
  $("place-results").replaceChildren();
});
$("place-query").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    $("find-place").click();
  }
});
$("find-place").addEventListener("click", async () => {
  clearError();
  const q = $("place-query").value.trim();
  if (q.length < 2) {
    error("Enter at least two letters of your birthplace.");
    return;
  }
  const version = ++searchVersion;
  $("find-place").disabled = true;
  $("place-help").textContent = "Finding places…";
  try {
    const data = await request(`/places?q=${encodeURIComponent(q)}`);
    if (version !== searchVersion) return;
    $("place-results").replaceChildren();
    $("place-help").textContent = data.places.length
      ? "Choose the place you mean."
      : "No places found. Try a nearby town or a different spelling.";
    for (const p of data.places) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = p.label;
      button.addEventListener("click", () => {
        place = p;
        $("chosen-place").textContent =
          `${p.label} · ${p.timeZone.replaceAll("_", " ")}`;
        $("chosen-place").hidden = false;
        $("place-results").replaceChildren();
        $("place-help").textContent =
          "Birthplace selected. Search again to change it.";
        $("place-query").value = p.label;
        $("chosen-place").setAttribute("tabindex", "-1");
        $("chosen-place").focus();
      });
      $("place-results").append(button);
    }
  } catch (e) {
    if (version === searchVersion) {
      $("place-help").textContent = "Place search could not finish.";
      error(e.message);
    }
  } finally {
    $("find-place").disabled = false;
  }
});
function edit() {
  controller?.abort();
  controller = null;
  $("waiting").hidden = true;
  $("result").hidden = true;
  form.hidden = false;
}
$("cancel").addEventListener("click", () => {
  edit();
  $("birth-date").focus();
});
$("edit").addEventListener("click", () => {
  edit();
  $("birth-date").focus();
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  if (!form.reportValidity()) return;
  if (!place) {
    error("Find and choose your birthplace before continuing.");
    return;
  }
  const kind = form.elements["time-kind"].value,
    mode = form.elements.mode.value;
  const time =
    kind === "exact"
      ? { kind, time: $("birth-time").value }
      : kind === "unknown"
        ? { kind }
        : {
            kind,
            start: $("time-from").value,
            end: $("time-to").value,
            endDayOffset: $("next-day").checked ? 1 : 0,
          };
  const body = {
    birth: { date: $("birth-date").value, time, placeId: place.id },
    mode,
  };
  if (mode === "question") {
    body.question = $("question").value.trim();
    if ($("dated").checked) {
      const start = $("period-start").value,
        end = $("period-end").value;
      const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
      if (!Number.isFinite(days) || days < 1 || days > 366) {
        error("Choose a last day on or after the first, within one year.");
        return;
      }
      body.window = {
        startDate: start,
        endDate: new Date(Date.parse(end) + 86400000)
          .toISOString()
          .slice(0, 10),
        timeZone: $("period-zone").value.trim(),
      };
    }
  }
  controller = new AbortController();
  const active = controller;
  form.hidden = true;
  $("waiting").hidden = false;
  $("result").hidden = true;
  $("waiting").focus();
  $("waiting").scrollIntoView({ block: "start" });
  try {
    const data = await request("/readings", {
      method: "POST",
      body: JSON.stringify(body),
      signal: active.signal,
    });
    if (active !== controller) return;
    if (typeof data.reading !== "string" || !data.reading.trim())
      throw new Error(
        "The reading arrived incomplete. Please try again later.",
      );
    $("reading").replaceChildren(
      ...data.reading.split(/\n\s*\n/).map((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        return p;
      }),
    );
    $("qualification").textContent = data.qualification ?? "";
    $("qualification").hidden = !data.qualification;
    $("reading-question").textContent = body.question ?? "";
    $("reading-question").hidden = !body.question;
    $("waiting").hidden = true;
    $("result").hidden = false;
    $("reading-title").focus();
    $("result").scrollIntoView({ block: "start" });
  } catch (e) {
    if (active !== controller || e.name === "AbortError") return;
    edit();
    if (e.code === "period_required") {
      $("dated").checked = true;
      update();
    }
    error(e.message);
  } finally {
    if (controller === active) controller = null;
  }
});
