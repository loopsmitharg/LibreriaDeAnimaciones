window.LoopSmithMotion ??= {};
window.LoopSmithMotion.story = function mountStory(root, {
  enabled = true, distance = 1250, scrub = .35, zoom = 2.8, twist = 38, pin = true, scroller
} = {}) {
  const { gsap, ScrollTrigger } = window;
  if (!enabled || !gsap || !ScrollTrigger) return { destroy() {} };
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  const stage = root.querySelector("[data-ls-stage]");
  const scene = root.querySelector("[data-ls-scene]");
  const wash = root.querySelector("[data-ls-wash]");
  const progress = root.querySelector("[data-ls-progress]");
  const planes = [...root.querySelectorAll("[data-ls-depth]")];
  const captions = [...root.querySelectorAll("[data-ls-caption]")];

  media.add({ motion: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 901px)" }, ({ conditions }) => {
    if (!conditions.motion) return;
    const anchored = pin && conditions.wide;
    const previousStyle = root.getAttribute("style");
    root.classList.add(anchored ? "ls-story--pinned" : "ls-story--sticky");
    root.style.setProperty("--ls-story-distance", `${distance}px`);

    if (captions.length > 1) gsap.set(captions.slice(1), { opacity: 0 });
    const timeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { scroller, trigger: root, pin: anchored ? stage : false, start: "top top", end: `+=${distance}`, scrub: scrub || true }
    });
    timeline.fromTo(scene, { scale: .65, rotation: -twist * .18 }, { scale: zoom, rotation: twist, duration: 1 }, 0)
      .fromTo(wash, { opacity: 0 }, { opacity: 1, duration: .65 }, .35)
      .fromTo(progress, { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0);
    if (planes.length) timeline.fromTo(planes, { z: (index) => -index * 170 }, { z: (index) => 80 - index * 105, duration: 1 }, 0);
    captions.forEach((caption, index) => {
      const step = 1 / captions.length;
      if (index) timeline.fromTo(caption, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: step * .48 }, index * step);
      if (index < captions.length - 1) timeline.to(caption, { y: -22, opacity: 0, duration: step * .4 }, (index + 1) * step - step * .4);
    });

    return () => {
      root.classList.remove("ls-story--pinned", "ls-story--sticky");
      if (previousStyle === null) root.removeAttribute("style");
      else root.setAttribute("style", previousStyle);
    };
  }, root);

  return { destroy: () => media.revert() };
};
