window.LoopSmithMotion ??= {};
window.LoopSmithMotion.gallery = function mountGallery(root, {
  enabled = true, duration = .75, tilt = 9, zoom = 1.12, hoverVideo = true, scramble = true, ease = "power3.out"
} = {}) {
  const gsap = window.gsap;
  const cards = [...root.querySelectorAll("[data-ls-card]")];
  const layout = root.querySelector("[data-ls-layout]");
  const initialList = root.classList.contains("ls-gallery--list");
  const initialStatic = root.classList.contains("ls-gallery--static");
  const layoutText = layout?.textContent;
  const layoutPressed = layout?.getAttribute("aria-pressed");
  const events = new AbortController();
  const listener = { signal: events.signal };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const media = gsap?.matchMedia();
  const details = [];
  let flip;
  root.classList.toggle("ls-gallery--static", !enabled);

  layout?.addEventListener("click", () => {
    const animate = enabled && gsap && !reduced.matches;
    const old = animate && cards.map((card) => card.getBoundingClientRect());
    flip?.revert();
    const list = root.classList.toggle("ls-gallery--list");
    layout.setAttribute("aria-pressed", String(list));
    layout.textContent = list ? "Vista en grilla" : "Vista en lista";
    if (!animate) return;
    const next = cards.map((card) => card.getBoundingClientRect());
    flip = gsap.context(() => {
      cards.forEach((card, index) => gsap.from(card, {
        x: old[index].left - next[index].left, y: old[index].top - next[index].top,
        scaleX: old[index].width / next[index].width, transformOrigin: "top left", duration, ease
      }));
    }, root);
  }, listener);
  reduced.addEventListener("change", () => flip?.revert(), listener);

  cards.forEach((card) => {
    const trigger = card.querySelector("button[data-ls-card-link]");
    const description = trigger && document.getElementById(trigger.getAttribute("aria-controls"));
    if (description && card.contains(description)) {
      details.push({ trigger, description, hidden: description.hidden, expanded: trigger.getAttribute("aria-expanded") });
      trigger.addEventListener("click", () => {
        description.hidden = !description.hidden;
        trigger.setAttribute("aria-expanded", String(!description.hidden));
      }, listener);
    }

    const video = card.querySelector("[data-ls-video]");
    const play = card.querySelector("[data-ls-play]");
    if (!video) return;
    let hover = false;
    let focus = false;
    let visible = false;
    let override;
    const update = () => {
      const wantsVideo = override ?? (enabled && hoverVideo && !reduced.matches && (hover || focus));
      if (visible && !document.hidden && wantsVideo) video.play().catch(() => {});
      else video.pause();
    };
    const sync = () => play?.setAttribute("aria-pressed", String(!video.paused));
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) override = undefined;
      update();
    }, { threshold: .15 });
    observer.observe(video);
    events.signal.addEventListener("abort", () => {
      observer.disconnect();
      video.pause();
      if (play) play.hidden = true;
      sync();
    }, { once: true });
    video.addEventListener("play", sync, listener);
    video.addEventListener("pause", sync, listener);
    if (play) {
      play.hidden = false;
      play.addEventListener("click", () => { override = video.paused; update(); }, listener);
    }
    card.addEventListener("pointerenter", (event) => { hover = event.pointerType === "mouse"; update(); }, listener);
    card.addEventListener("pointerleave", () => { hover = false; if (!focus && override === false) override = undefined; update(); }, listener);
    trigger?.addEventListener("focus", () => { focus = trigger.matches(":focus-visible"); update(); }, listener);
    trigger?.addEventListener("blur", () => { focus = false; if (!hover && override === false) override = undefined; update(); }, listener);
    document.addEventListener("visibilitychange", update, listener);
    reduced.addEventListener("change", update, listener);
  });

  if (enabled) media?.add({ motion: "(prefers-reduced-motion: no-preference)", fine: "(hover: hover) and (pointer: fine)" }, (context) => {
    if (!context.conditions.motion) return;
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    const frames = cards.map((card) => card.querySelector("[data-ls-frame]"));
    const labels = cards.map((card) => card.querySelector(".ls-gallery__tag"));
    const arts = cards.map((card) => card.querySelector("[data-ls-media]"));
    const originalLabels = labels.map((label) => label?.textContent);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const index = frames.indexOf(entry.target);
        context.add(() => {
          gsap.to(entry.target, { rotationY: 0, y: 0, scale: 1, opacity: 1, duration, ease });
          const label = labels[index];
          const value = originalLabels[index];
          if (!scramble || !value) return;
          const spoken = document.createElement("span");
          spoken.className = "ls-gallery__spoken";
          spoken.textContent = value;
          const visual = document.createElement("span");
          visual.setAttribute("aria-hidden", "true");
          const glyphs = "^+#/!?";
          const render = (i) => {
            visual.textContent = value.slice(0, i) + value.slice(i).replace(/\S/g, (_, j) => glyphs[(i + j) % glyphs.length]);
          };
          render(0);
          label.replaceChildren(spoken, visual);
          const state = { index: 0 };
          gsap.to(state, {
            index: value.length, snap: "index", duration, ease: "none",
            onUpdate: () => render(state.index), onComplete: () => { label.textContent = value; }
          });
        });
      });
    }, { threshold: .15 });

    frames.forEach((frame, index) => {
      if (!frame) return;
      gsap.set(frame, { rotationY: index % 2 ? -13 : 13, y: 17, scale: .96, opacity: .6 });
      observer.observe(frame);
      const art = arts[index];
      if (!art) return;
      const card = cards[index];
      const quick = (key) => gsap.quickTo(art, key, { duration: duration * .65, ease });
      const sx = quick("scaleX");
      const sy = quick("scaleY");
      const scale = (value) => { sx(value); sy(value); };
      const rx = quick("rotationX");
      const ry = quick("rotationY");
      card.addEventListener("focusin", () => scale(zoom), options);
      card.addEventListener("focusout", (event) => { if (!card.contains(event.relatedTarget)) scale(1); }, options);
      if (!context.conditions.fine) return;
      let rect;
      card.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        rect ??= card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width * 2 - 1;
        const y = (event.clientY - rect.top) / rect.height * 2 - 1;
        scale(zoom);
        rx(-y * tilt);
        ry(x * tilt);
      }, options);
      card.addEventListener("pointerleave", () => { rect = null; scale(1); rx(0); ry(0); }, options);
      window.addEventListener("resize", () => { rect = null; }, options);
      window.addEventListener("scroll", () => { rect = null; }, { ...options, capture: true });
    });

    return () => {
      observer.disconnect();
      listeners.abort();
      labels.forEach((label, index) => { if (label) label.textContent = originalLabels[index]; });
    };
  }, root);

  return { destroy() {
    flip?.revert();
    media?.revert();
    events.abort();
    root.classList.toggle("ls-gallery--static", initialStatic);
    if (layout) {
      root.classList.toggle("ls-gallery--list", initialList);
      layout.textContent = layoutText;
      if (layoutPressed === null) layout.removeAttribute("aria-pressed");
      else layout.setAttribute("aria-pressed", layoutPressed);
    }
    details.forEach(({ trigger, description, hidden, expanded }) => {
      description.hidden = hidden;
      if (expanded === null) trigger.removeAttribute("aria-expanded");
      else trigger.setAttribute("aria-expanded", expanded);
    });
  } };
};
