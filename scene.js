const button = document.querySelector(".circle");
const light = document.querySelector("#light");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const activePulses = new Set();
const svgNamespace = "http://www.w3.org/2000/svg";
let atmosphere;
const canAnimate = typeof Element.prototype.animate === "function";

function revealScene() {
  document.documentElement.classList.remove("render-pending");
  button.disabled = !canAnimate;
}

function rendererReady() {
  settle();
  revealScene();
}

// iOS Safari paints behind its bars only when artwork extends past the scroll position.
if (CSS.supports("-webkit-touch-callout", "none")) {
  const browser = matchMedia("(pointer: coarse) and (display-mode: browser)");
  const root = document.documentElement;

  function fitBrowserEdges() {
    root.classList.toggle("browser-bleed", browser.matches);
    if (window.visualViewport?.scale > 1) return;
    const offset = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    if (Math.abs(scrollY - offset) > 0.5) {
      window.scrollTo({ top: offset, left: 0, behavior: "instant" });
    }
  }

  fitBrowserEdges();
  browser.addEventListener("change", fitBrowserEdges);
  window.addEventListener("pageshow", fitBrowserEdges);
  window.addEventListener("resize", fitBrowserEdges);
  window.addEventListener("scroll", fitBrowserEdges, { passive: true });
}

function circle(radius, fill) {
  const element = document.createElementNS(svgNamespace, "circle");
  element.setAttribute("r", radius);
  element.setAttribute("fill", `url(#${fill})`);
  element.style.transformOrigin = "0 0";
  element.style.opacity = "0";
  return element;
}

function releaseLight() {
  if (atmosphere?.pulse()) return;
  if (document.hidden || activePulses.size >= 3) return;

  const group = document.createElementNS(svgNamespace, "g");
  group.setAttribute("transform", "translate(1168 437)");
  light.append(group);

  const animations = [];
  const pulse = {
    dispose() {
      if (!activePulses.delete(pulse)) return;
      group.remove();
      for (const animation of animations) animation.cancel();
    },
  };
  activePulses.add(pulse);

  const bloom = circle(440, "bloom");
  group.append(bloom);
  animations.push(bloom.animate(
    [{ opacity: 0 }, { opacity: reducedMotion.matches ? 0.35 : 0.18, offset: 0.15 }, { opacity: 0 }],
    { duration: reducedMotion.matches ? 700 : 1700, easing: "ease-out" },
  ));

  if (!reducedMotion.matches) {
    const wave = circle(680, "wave-warm");
    group.append(wave);
    const frames = Array.from({ length: 61 }, (_, i) => {
      const age = i / 60 * 7.5;
      const t = age * 1.05;
      const travel = 1 - (1 + t) * Math.exp(-t);
      const scale = 0.30 + travel * 2.9;
      const fade = Math.max(0, Math.min(1, (age - 5) / 2.5));
      return {
        offset: i / 60,
        transform: `scale(${scale * 1.06}, ${scale * 0.96})`,
        opacity: 0.65 * (1 - Math.exp(-age * 10)) * Math.exp(-age * 0.28)
          * (1 - fade * fade * (3 - 2 * fade)),
      };
    });
    animations.push(wave.animate(frames, {
      duration: 7500,
      easing: "linear",
      fill: "both",
    }));
  }

  // Cancellation rejects finished; handle it so pulse disposal still runs.
  Promise.all(animations.map(animation => animation.finished.catch(() => {})))
    .then(() => pulse.dispose());
}

function settle() {
  for (const pulse of activePulses) pulse.dispose();
}

if (canAnimate) {
  button.disabled = document.documentElement.classList.contains("render-pending");
  button.addEventListener("click", releaseLight);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) settle();
});
window.addEventListener("pagehide", settle);
reducedMotion.addEventListener("change", settle);

import("./atmosphere.js")
  .then(({ createAtmosphere }) => createAtmosphere(document.querySelector("main"), button, reducedMotion, rendererReady))
  .then(renderer => {
    atmosphere = renderer;
    if (!renderer) revealScene();
  })
  .catch(error => {
    console.warn("Using the SVG landscape:", error);
    revealScene();
  });
