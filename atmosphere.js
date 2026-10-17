import { createWebGPU } from "./renderers/webgpu.js";
import { createWebGL } from "./renderers/webgl.js";

export async function createAtmosphere(root, button, reducedMotion, onReady) {
  const requested = new URLSearchParams(location.search).get("renderer");
  if (requested === "svg" || matchMedia("(forced-colors: active)").matches) return null;
  const image = button.querySelector("img");
  await image.decode();
  const mask = document.createElement("canvas");
  mask.width = 960; mask.height = 920;
  mask.getContext("2d").drawImage(image, 0, 0, mask.width, mask.height);

  const values = new Float32Array(32);
  const pulses = [];
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  let engine, canvas, frameId = 0, lastFrame = 0, elapsed = 0;
  let pressed = false, hovering = false, hoverTarget = 0, hover = 0, charge = 0;
  let pointerX = 1168, pointerY = 437, targetX = 1168, targetY = 437;
  let width = 0, height = 0, pixelWidth = 0, pixelHeight = 0;
  let quality = 1, frameAverage = 16.7, measuredFrames = 0, lastResize = 0;
  let lastPulse = -100, suspended = document.hidden, installing = false;

  function fit() {
    if (!engine) return;
    const bounds = root.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    const budget = engine.backend === "webgpu" ? 3000000 : 1600000;
    const ratio = Math.min(devicePixelRatio || 1, 2, Math.sqrt(budget / (width * height))) * quality;
    const w = Math.max(1, Math.round(width * ratio));
    const h = Math.max(1, Math.round(height * ratio));
    if (w !== pixelWidth || h !== pixelHeight) {
      pixelWidth = w; pixelHeight = h;
      engine.resize(w, h);
    }
    wake();
  }

  function wake() {
    if (!frameId && engine && !suspended) frameId = requestAnimationFrame(paint);
  }

  function paint(now) {
    frameId = 0;
    if (!engine || suspended) return;
    const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 1 / 60;
    if (lastFrame && !reducedMotion.matches) {
      frameAverage += ((now - lastFrame) - frameAverage) * 0.025;
      measuredFrames++;
      if (measuredFrames > 150 && frameAverage > 24 && now - lastResize > 5000 && quality > 0.62) {
        quality *= 0.84; lastResize = now; measuredFrames = 0; frameAverage = 16.7;
        fit();
      }
    }
    lastFrame = now;
    elapsed += delta;
    const follow = 1 - Math.exp(-delta * 5);
    pointerX += (targetX - pointerX) * follow;
    pointerY += (targetY - pointerY) * follow;
    hover += (hoverTarget - hover) * (1 - Math.exp(-delta * 4));
    charge += ((pressed ? 1 : 0) - charge) * (1 - Math.exp(-delta * (pressed ? 1.4 : 3.5)));
    while (pulses.length && elapsed - pulses[0].time > 16) pulses.shift();
    let flash = 0, resonance = 0;
    for (let i = 0; i < 4; i++) {
      const pulse = pulses[i];
      values.set(pulse ? [pulse.time, pulse.strength, 0, 0] : [-100, 0, 0, 0], 16 + i * 4);
      if (pulse) {
        const age = elapsed - pulse.time;
        flash += pulse.strength * (1 - Math.exp(-age * 10)) * Math.exp(-age * (reducedMotion.matches ? 5 : 1.6));
        resonance += pulse.strength * (1 - Math.exp(-age * 3)) * Math.exp(-age * 0.27);
      }
    }
    const scale = Math.max(width / 1536, height / 1024);
    values.set([pixelWidth, pixelHeight, elapsed, delta], 0);
    values.set([width, height, scale, 0], 4);
    values.set([pointerX, pointerY, hover, charge], 8);
    values.set([0, Math.min(flash, 1.2), reducedMotion.matches ? 0 : 1,
      reducedMotion.matches ? 0 : Math.min(resonance, 1.4)], 12);
    try {
      engine.draw(values);
      if (!root.dataset.renderer) {
        root.dataset.renderer = engine.backend;
        onReady();
      }
    } catch (error) {
      void recover(error);
      return;
    }
    const settling = Math.abs(charge - (pressed ? 1 : 0)) > 0.002 || Math.abs(hover - hoverTarget) > 0.002;
    if (!reducedMotion.matches || flash > 0.001 || settling) wake();
    else lastFrame = 0;
  }

  async function install(webgpu) {
    installing = true;
    canvas = document.createElement("canvas");
    canvas.className = "atmosphere";
    canvas.setAttribute("aria-hidden", "true");
    root.prepend(canvas);
    let earlyFailure;
    const fail = error => {
      if (installing) earlyFailure = error;
      else void recover(error);
    };
    try {
      engine = await (webgpu ? createWebGPU : createWebGL)(canvas, mask, fail);
      if (earlyFailure) throw earlyFailure;
      pixelWidth = pixelHeight = 0;
      fit();
      return true;
    } catch (error) {
      console.warn(`${webgpu ? "WebGPU" : "WebGL2"} landscape unavailable:`, error);
      engine?.dispose(); engine = null; canvas.remove();
      return false;
    } finally {
      installing = false;
    }
  }

  async function recover(error) {
    if (installing || !engine) return;
    console.warn("Restoring the landscape after a graphics interruption:", error);
    const tryWebGL = engine.backend === "webgpu";
    pause();
    engine.dispose(); engine = null; canvas.remove();
    delete root.dataset.renderer;
    suspended = document.hidden;
    if (tryWebGL) await install(false);
  }

  function pause() {
    cancelAnimationFrame(frameId); frameId = 0; lastFrame = 0;
    pressed = false; charge = 0; pulses.length = 0;
  }

  const ready = (requested !== "webgl2" && navigator.gpu && await install(true)) || await install(false);
  if (!ready) return null;
  new ResizeObserver(fit).observe(root);
  root.addEventListener("pointermove", event => {
    if (!finePointer.matches) return;
    const bounds = root.getBoundingClientRect();
    const scale = Math.max(width / 1536, height / 1024);
    targetX = (event.clientX - bounds.left - (width - 1536 * scale) * 0.82) / scale;
    targetY = (event.clientY - bounds.top - (height - 1024 * scale) * 0.5) / scale;
    wake();
  });
  function updateHighlight() {
    hoverTarget = hovering || button.matches(":focus-visible") ? 1 : 0;
    wake();
  }
  button.addEventListener("pointerenter", () => { hovering = finePointer.matches; updateHighlight(); });
  button.addEventListener("pointerleave", () => { hovering = false; updateHighlight(); });
  button.addEventListener("focus", updateHighlight);
  button.addEventListener("blur", () => { pressed = false; updateHighlight(); });
  button.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    pressed = true; button.setPointerCapture(event.pointerId); wake();
  });
  button.addEventListener("pointerup", () => { pressed = false; wake(); });
  button.addEventListener("pointercancel", () => { pressed = false; wake(); });
  button.addEventListener("keydown", event => {
    if (event.code !== "Space" && event.code !== "Enter") return;
    if (event.repeat) { event.preventDefault(); return; }
    pressed = true; wake();
  });
  button.addEventListener("keyup", () => { pressed = false; wake(); });
  reducedMotion.addEventListener("change", () => { pause(); wake(); });
  document.addEventListener("visibilitychange", () => {
    suspended = document.hidden;
    if (suspended) pause(); else wake();
  });
  window.addEventListener("pagehide", () => { suspended = true; pause(); });
  window.addEventListener("pageshow", () => { suspended = document.hidden; fit(); });

  return {
    pulse() {
      if (!engine) return false;
      if (suspended || elapsed - lastPulse < 0.14) return true;
      lastPulse = elapsed;
      const strength = 0.72 + charge * 1.0;
      pulses.push({ time: elapsed, strength });
      if (pulses.length > 4) pulses.shift();
      wake();
      return true;
    },
  };
}
