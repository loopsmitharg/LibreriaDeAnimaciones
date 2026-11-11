window.LoopSmithMotion ??= {};
window.LoopSmithMotion.particles = function mountParticles(root, {
  count = 560, spread = 125, distance = 25, duration = .8, color = "#a9d8e4", enabled = true
} = {}) {
  const gsap = window.gsap;
  const art = root.querySelector("[data-ls-cloud-art]");
  const shape = art.querySelector("[data-ls-cloud-shape]");
  const shadow = art.querySelector("[data-ls-cloud-shadow]");
  const dots = art.querySelector("[data-ls-cloud-dots]");
  const toggle = root.querySelector("[data-ls-cloud-toggle]");
  const previousStyle = root.getAttribute("style");
  const initialButton = { text: toggle.textContent, hidden: toggle.hidden };
  const events = new AbortController();
  const total = Math.min(1000, Math.max(1, Math.floor(count)));
  const box = shape.getBBox();
  const perimeter = shape.getTotalLength();
  const point = new DOMPoint();
  const svg = "http://www.w3.org/2000/svg";
  let seed = 8147;
  let scattered = false;

  function sample() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function samplePoint(index) {
    // Reservamos una secuencia regular para que el perfil siga siendo legible.
    if (index % 6 === 0) {
      const edge = shape.getPointAtLength((index / 6 + sample() * .65) / Math.ceil(total / 6) * perimeter);
      return { x: edge.x + (sample() - .5) * 8, y: edge.y + (sample() - .5) * 8, outline: true };
    }
    const halo = index % 13 === 0;
    if (!halo) {
      for (let attempt = 0; attempt < 32; attempt++) {
        point.x = box.x + sample() * box.width;
        point.y = box.y + sample() * box.height;
        if (shape.isPointInFill(point)) return { x: point.x, y: point.y, shaded: shadow?.isPointInFill(point), halo };
      }
    }
    const edge = shape.getPointAtLength(sample() * perimeter);
    return { x: edge.x + (sample() - .5) * 90, y: edge.y + (sample() - .5) * 75, shaded: false, halo: true };
  }

  const layers = Array.from({ length: 4 }, () => {
    const drift = document.createElementNS(svg, "g");
    const layer = document.createElementNS(svg, "g");
    layer.append(drift);
    return { layer, drift };
  });

  for (let index = 0; index < total; index++) {
    const { x, y, shaded, halo, outline } = samplePoint(index);
    const dot = document.createElementNS(svg, "circle");
    const layer = halo ? 0 : 1 + Math.floor(sample() * 3);
    const light = Math.max(.16, (x - box.x) / box.width * .44 + (1 - (y - box.y) / box.height) * .33 + sample() * .31 + (outline ? .16 : 0));
    const angle = Math.atan2(y - box.y - box.height * .44, x - box.x - box.width * .5) + (sample() - .5) * .8;
    const travel = spread * (.35 + sample() * .95);
    dot.classList.add("ls-cloud__dot");
    dot.setAttribute("cx", x.toFixed(2));
    dot.setAttribute("cy", y.toFixed(2));
    dot.setAttribute("r", (halo ? .75 + sample() * 2 : 1.6 + sample() ** 1.5 * 3.2).toFixed(2));
    dot.style.setProperty("--ls-dot-tint", `${Math.min(100, (shaded ? .54 : 1) * light * 100)}%`);
    dot.style.setProperty("--ls-dot-alpha", halo ? ".5" : ".96");
    dot.style.setProperty("--ls-dot-x", `${(Math.cos(angle) * travel).toFixed(1)}px`);
    dot.style.setProperty("--ls-dot-y", `${(Math.sin(angle) * travel).toFixed(1)}px`);
    dot.style.setProperty("--ls-dot-delay", `${(sample() * duration * .18).toFixed(3)}s`);
    layers[layer].drift.append(dot);
  }

  dots.append(...layers.map(({ layer }) => layer));
  root.classList.add("ls-cloud--ready");
  root.classList.toggle("ls-cloud--motion", enabled);
  root.style.setProperty("--ls-cloud-color", color);
  root.style.setProperty("--ls-cloud-duration", `${duration}s`);

  function showScatter(value) {
    scattered = value;
    root.classList.toggle("ls-cloud--scattered", value);
    toggle.textContent = value ? "Recomponer retrato" : "Dispersar partículas";
  }

  toggle.hidden = false;
  showScatter(false);
  toggle.addEventListener("click", () => showScatter(!scattered), { signal: events.signal });

  const media = gsap?.matchMedia();
  if (enabled) media?.add({ motion: "(prefers-reduced-motion: no-preference)", fine: "(hover: hover) and (pointer: fine)" }, ({ conditions }) => {
    if (!conditions.motion) return;
    const hover = new AbortController();
    const drifts = layers.map(({ drift }, index) => gsap.to(drift, {
      x: (index - 1) * 2, y: index % 2 ? 5 : -6, duration: 3.1 + index * .85,
      ease: "sine.inOut", repeat: -1, yoyo: true, paused: true
    }));
    const observer = new IntersectionObserver(([entry]) => drifts.forEach((drift) => drift.paused(!entry.isIntersecting)));
    observer.observe(root);

    if (conditions.fine && distance > 0) {
      const tracks = layers.map(({ layer }, index) => ({
        weight: (index + 1) / layers.length,
        x: gsap.quickTo(layer, "x", { duration: .5, ease: "power3.out" }),
        y: gsap.quickTo(layer, "y", { duration: .5, ease: "power3.out" })
      }));
      let bounds;
      const listener = { signal: hover.signal };
      const invalidate = () => { bounds = null; };
      function move(x, y) {
        tracks.forEach((track) => { track.x(x * track.weight * distance); track.y(y * track.weight * distance); });
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

    return () => { hover.abort(); observer.disconnect(); };
  }, root);

  return {
    setScattered: showScatter,
    destroy() {
      media?.revert();
      events.abort();
      layers.forEach(({ layer }) => layer.remove());
      root.classList.remove("ls-cloud--ready", "ls-cloud--motion", "ls-cloud--scattered");
      toggle.hidden = initialButton.hidden;
      toggle.textContent = initialButton.text;
      if (previousStyle === null) root.removeAttribute("style");
      else root.setAttribute("style", previousStyle);
    }
  };
};
