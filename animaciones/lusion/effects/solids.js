window.LoopSmithMotion ??= {};
window.LoopSmithMotion.solids = function mountSolids(root, {
  count = 4, speed = 14, perspective = 820, distance = 36, duration = .75,
  color = "#d4e999", ease = "power3.out", enabled = true
} = {}) {
  const gsap = window.gsap;
  const all = [...root.querySelectorAll("[data-ls-solid]")];
  const visible = all.slice(0, Math.max(0, count));
  const previousHidden = all.map((object) => object.hidden);
  const previousStyle = root.getAttribute("style");
  const facets = 12;
  const faces = [];

  all.forEach((object, index) => { object.hidden = index >= visible.length; });
  root.style.setProperty("--ls-solid-color", color);
  root.style.setProperty("--ls-solid-perspective", `${perspective}px`);

  const models = visible.map((object) => {
    const rotor = object.querySelector("[data-ls-solid-rotor]");
    const pivot = object.querySelector("[data-ls-solid-pivot]");
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < facets; index++) {
      const angle = index * 360 / facets;
      const shade = Math.round(25 + (1 - Math.cos((angle + 45) * Math.PI / 180)) * 21);
      const side = document.createElement("i");
      side.className = "ls-solids__face";
      side.style.setProperty("--ls-facet-angle", `${angle}deg`);
      side.style.setProperty("--ls-facet-shade", `${shade}%`);
      const inner = side.cloneNode();
      inner.classList.add("ls-solids__face--inner");
      fragment.append(side, inner);
      faces.push(side, inner);
    }
    rotor.append(fragment);
    return { rotor, pivot };
  });

  const media = gsap?.matchMedia();
  if (enabled) media?.add({ motion: "(prefers-reduced-motion: no-preference)", fine: "(hover: hover) and (pointer: fine)" }, ({ conditions }) => {
    if (!conditions.motion) return;
    const events = new AbortController();
    const listener = { signal: events.signal };
    const copy = root.querySelector("[data-ls-solid-copy]");
    const intro = gsap.timeline({ defaults: { duration, ease } });
    if (models.length) intro.from(models.map(({ pivot }) => pivot), { z: -145, scale: .88, stagger: .08 });
    if (copy) intro.from(copy, { y: 24, opacity: .002 }, 0);

    const loops = models.flatMap(({ rotor }, index) => [
      gsap.to(rotor, { rotationY: index % 2 ? "-=360" : "+=360", duration: speed * (1 + index * .16), ease: "none", repeat: -1, paused: true }),
      gsap.to(rotor, { y: index % 2 ? -14 : 18, rotationX: index % 2 ? "-=22" : "+=26", duration: 3.2 + index * .67, ease: "sine.inOut", repeat: -1, yoyo: true, paused: true })
    ]);
    const observer = new IntersectionObserver(([entry]) => loops.forEach((loop) => loop.paused(!entry.isIntersecting)));
    observer.observe(root);

    if (conditions.fine && distance > 0) {
      const tracks = models.map(({ pivot }, index) => {
        const quick = (property) => gsap.quickTo(pivot, property, { duration: .55, ease });
        return { weight: 1 - index * .14, x: quick("x"), y: quick("y"), rx: quick("rotationX"), ry: quick("rotationY") };
      });
      let bounds;
      const invalidate = () => { bounds = null; };
      function move(nx, ny) {
        tracks.forEach(({ weight, x, y, rx, ry }) => {
          x(nx * weight * distance);
          y(ny * weight * distance);
          rx(-ny * weight * distance * .32);
          ry(nx * weight * distance * .42);
        });
      }
      root.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        bounds ??= root.getBoundingClientRect();
        move((event.clientX - bounds.left) / bounds.width * 2 - 1, (event.clientY - bounds.top) / bounds.height * 2 - 1);
      }, listener);
      root.addEventListener("pointerleave", () => { invalidate(); move(0, 0); }, listener);
      window.addEventListener("resize", invalidate, listener);
      window.addEventListener("scroll", invalidate, { ...listener, capture: true });
    }

    return () => { events.abort(); observer.disconnect(); };
  }, root);

  return { destroy() {
    media?.revert();
    faces.forEach((face) => face.remove());
    all.forEach((object, index) => { object.hidden = previousHidden[index]; });
    if (previousStyle === null) root.removeAttribute("style");
    else root.setAttribute("style", previousStyle);
  } };
};
