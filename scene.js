const button = document.querySelector(".circle");
const light = document.querySelector("#light");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const activePulses = new Set();
const svgNamespace = "http://www.w3.org/2000/svg";

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
  // Keep rapid tapping bounded without interrupting a wave already in flight.
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
    [{ opacity: 0 }, { opacity: 0.65, offset: 0.15 }, { opacity: 0 }],
    { duration: reducedMotion.matches ? 700 : 1700, easing: "ease-out" },
  ));

  if (!reducedMotion.matches) {
    for (const [index, fill] of ["wave-warm", "wave-sage"].entries()) {
      const wave = circle(600, fill);
      group.append(wave);
      animations.push(wave.animate([
        { transform: "scale(0.08)", opacity: 0 },
        { transform: "scale(0.22)", opacity: 0.8, offset: 0.1 },
        { transform: "scale(0.8)", opacity: 0.7, offset: 0.38 },
        { transform: "scale(1.65)", opacity: 0.4, offset: 0.72 },
        { transform: "scale(2.5)", opacity: 0 },
      ], {
        duration: 4000,
        delay: index * 420,
        easing: "cubic-bezier(0.22, 0.65, 0.3, 1)",
        fill: "both",
      }));
    }
  }

  // Cancellation also settles the cleanup path; no animation loop runs at rest.
  Promise.all(animations.map(animation => animation.finished.catch(() => {})))
    .then(() => pulse.dispose());
}

function settle() {
  for (const pulse of activePulses) pulse.dispose();
}

if (typeof Element.prototype.animate === "function") {
  button.disabled = false;
  button.addEventListener("click", releaseLight);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) settle();
});
window.addEventListener("pagehide", settle);
reducedMotion.addEventListener("change", settle);
