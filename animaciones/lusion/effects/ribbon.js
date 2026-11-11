window.LoopSmithMotion ??= {};
window.LoopSmithMotion.ribbon = function mountRibbon(root, {
  enabled = true, scrub = .25, color = "#a4bc54", width = 18, reverse = false, scroller
} = {}) {
  const { gsap, ScrollTrigger } = window;
  const path = root.querySelector("[data-ls-path]");
  const previousStyle = path.getAttribute("style");
  path.style.stroke = color;
  path.style.strokeWidth = width;
  const media = gsap?.matchMedia();

  if (enabled && gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(path, { strokeDasharray: "1 1", strokeDashoffset: reverse ? -1 : 1 }, {
        strokeDashoffset: 0, autoRound: false, ease: "none",
        scrollTrigger: { scroller, trigger: root, start: "top top", end: "bottom bottom", scrub: scrub || true }
      });
    }, root);
  }

  return { destroy() {
    media?.revert();
    if (previousStyle === null) path.removeAttribute("style");
    else path.setAttribute("style", previousStyle);
  } };
};
