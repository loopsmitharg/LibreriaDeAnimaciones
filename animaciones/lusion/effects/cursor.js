window.LoopSmithMotion ??= {};
window.LoopSmithMotion.cursor = function mountCursor(root, {
  enabled = true, distance = 95, strength = .38, rotation = 15, duration = .38, ease = "power3.out"
} = {}) {
  const gsap = window.gsap;
  const halo = root.querySelector("[data-ls-halo]");
  const wrappers = [...root.querySelectorAll("[data-ls-magnet]")];
  const targets = wrappers.map((element) => element.querySelector("[data-ls-target]"));
  const initial = targets.map((target) => target.getAttribute("aria-pressed"));
  const events = new AbortController();

  targets.forEach((target) => target.addEventListener("click", () => {
    const selected = target.getAttribute("aria-pressed") === "true";
    targets.forEach((button) => button.setAttribute("aria-pressed", String(button === target && !selected)));
  }, { signal: events.signal }));

  const media = gsap?.matchMedia();
  if (enabled && halo) media?.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
    const motion = new AbortController();
    const listener = { signal: motion.signal };
    const quick = (el, property) => gsap.quickTo(el, property, { duration, ease });
    gsap.set(halo, { xPercent: -50, yPercent: -50 });
    const hx = quick(halo, "x");
    const hy = quick(halo, "y");
    const fade = quick(halo, "opacity");
    const sx = quick(halo, "scaleX");
    const sy = quick(halo, "scaleY");
    const follow = targets.map((target) => ({ x: quick(target, "x"), y: quick(target, "y"), angle: quick(target, "rotation") }));
    let geometry;
    let inside = false;
    const invalidate = () => { geometry = null; };
    const observer = new ResizeObserver(invalidate);
    observer.observe(root);
    wrappers.forEach((element) => observer.observe(element));

    root.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      geometry ??= {
        root: root.getBoundingClientRect(),
        centers: wrappers.map((element) => {
          const rect = element.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, sign: Number(element.dataset.polarity || 1) };
        })
      };
      const { clientX, clientY } = event;
      const x = clientX - geometry.root.left;
      const y = clientY - geometry.root.top;
      if (!inside) gsap.set(halo, { x, y });
      inside = true;
      hx(x);
      hy(y);
      fade(1);
      let nearest = 0;
      geometry.centers.forEach((center, index) => {
        const dx = clientX - center.x;
        const dy = clientY - center.y;
        const weight = distance > 0 ? Math.max(0, 1 - Math.hypot(dx, dy) / distance) : 0;
        const force = strength * center.sign * weight * 2;
        follow[index].x(dx * force);
        follow[index].y(dy * force);
        follow[index].angle(Math.sign(dx) * weight * rotation * center.sign);
        nearest = Math.max(nearest, weight);
      });
      sx(1 + nearest * 1.3);
      sy(1 + nearest * 1.3);
    }, listener);
    root.addEventListener("pointerleave", () => {
      inside = false;
      invalidate();
      fade(0);
      follow.forEach(({ x, y, angle }) => { x(0); y(0); angle(0); });
    }, listener);
    window.addEventListener("scroll", invalidate, { ...listener, capture: true });
    return () => { motion.abort(); observer.disconnect(); };
  }, root);

  return { destroy() {
    media?.revert();
    events.abort();
    targets.forEach((target, index) => {
      if (initial[index] === null) target.removeAttribute("aria-pressed");
      else target.setAttribute("aria-pressed", initial[index]);
    });
  } };
};
