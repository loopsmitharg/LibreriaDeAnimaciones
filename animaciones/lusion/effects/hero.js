window.LoopSmithMotion ??= {};
window.LoopSmithMotion.hero = function mountHero(root, {
  enabled = true, duration = .75, delay = 0, speed = 5, distance = 36,
  perspective = 780, count = Infinity, color = "#d9f678", ease = "power3.out"
} = {}) {
  const gsap = window.gsap;
  const all = [...root.querySelectorAll("[data-depth]")];
  const planets = all.slice(0, Math.max(0, count));
  const restoreHidden = all.map((planet) => planet.hidden);
  const restoreStyle = root.getAttribute("style");
  all.forEach((planet, index) => { planet.hidden = index >= planets.length; });
  root.style.setProperty("--ls-hero-color", color);
  root.style.setProperty("--ls-hero-perspective", `${perspective}px`);

  const media = gsap?.matchMedia();
  let intro;
  if (enabled) media?.add({ motion: "(prefers-reduced-motion: no-preference)", fine: "(hover: hover) and (pointer: fine)" }, ({ conditions }) => {
    if (!conditions.motion) return;
    const events = new AbortController();
    const copy = root.querySelector("[data-ls-hero-copy]");
    intro = gsap.timeline({ delay, defaults: { duration, ease } });
    if (planets.length) intro.from(planets, { scale: .78, opacity: .002, stagger: .055 });
    if (copy) intro.from(copy, { y: 25, opacity: .002 }, 0);

    const floats = planets.map((planet, index) => gsap.to(planet, {
      yPercent: index % 2 ? -7 : 6, rotation: index % 2 ? 9 : -12,
      duration: speed * (1 + index * .12), repeat: -1, yoyo: true, ease: "sine.inOut"
    }));
    const observer = new IntersectionObserver(([entry]) => {
      floats.forEach((float) => float.paused(!entry.isIntersecting));
    });
    observer.observe(root);

    if (conditions.fine && distance > 0) {
      const follow = planets.map((planet) => {
        const quick = (key) => gsap.quickTo(planet, key, { duration: .55, ease });
        return { depth: Number(planet.dataset.depth), x: quick("x"), y: quick("y"), rx: quick("rotationX"), ry: quick("rotationY") };
      });
      let rect;
      const invalidate = () => { rect = null; };
      const move = (nx, ny) => follow.forEach(({ depth, x, y, rx, ry }) => {
        x(nx * depth * distance);
        y(ny * depth * distance);
        rx(-ny * depth * distance * .25);
        ry(nx * depth * distance * .32);
      });
      root.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        rect ??= root.getBoundingClientRect();
        move((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
      }, { signal: events.signal });
      root.addEventListener("pointerleave", () => { invalidate(); move(0, 0); }, { signal: events.signal });
      window.addEventListener("resize", invalidate, { signal: events.signal });
      window.addEventListener("scroll", invalidate, { capture: true, signal: events.signal });
    }
    return () => { events.abort(); observer.disconnect(); intro = undefined; };
  }, root);

  return {
    replay: () => intro?.restart(true),
    destroy() {
      media?.revert();
      all.forEach((planet, index) => { planet.hidden = restoreHidden[index]; });
      if (restoreStyle === null) root.removeAttribute("style");
      else root.setAttribute("style", restoreStyle);
    }
  };
};
