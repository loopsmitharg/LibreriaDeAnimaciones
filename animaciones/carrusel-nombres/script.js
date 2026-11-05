/**
 * Carrusel de nombres en contrafase ("Sincronía").
 * Base: Loop Smith, js/main.js → buildTeamScene() + initializeTeamRails().
 * Usa una copia de createStageStepper() (ver la demo "Scroll por etapas").
 */
const MOTION = {
  pinned: "(min-width: 901px)",
  flow: "(max-width: 900px)",
  reduced: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  clamp: (value, min = 0, max = 1) => Math.min(max, Math.max(min, value)),
};

document.addEventListener("DOMContentLoaded", () => {
  // Muestra los rieles recién con sus dos fuentes cargadas (sin saltos por swap).
  const show = () => document.documentElement.classList.add("rails-ready");
  if (document.fonts?.load) Promise.all(['500 1em "Outfit"', '500 1em "Space Grotesk"'].map((f) => document.fonts.load(f))).then(show, show);
  else show();

  if (MOTION.reduced() || !window.gsap || !window.ScrollTrigger) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  buildTeamScene({ gsap, ScrollTrigger, clamp: MOTION.clamp, media: gsap.matchMedia() });
  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
});

function buildTeamScene({ gsap, ScrollTrigger, clamp, media }) {
  const scene = document.querySelector(".sync-hero");
  const rails = [document.querySelector(".sync-rail--a"), document.querySelector(".sync-rail--b")];
  const cards = [document.querySelector(".sync-card--a"), document.querySelector(".sync-card--b")];
  const axisLine = document.querySelector(".sync-axis i");
  const axisNode = document.querySelector(".sync-axis b");
  const heading = document.querySelector(".sync-heading");
  if (!scene || rails.some((r) => !r) || cards.some((c) => !c)) return;

  // Paso de una repetición, medido del layout (offsetLeft ignora transforms).
  const pitch = (rail) => (rail.children.length > 1 ? rail.children[1].offsetLeft - rail.children[0].offsetLeft : 0);
  if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(() => ScrollTrigger.refresh());

  /**
   * Deriva en reposo, contada en repeticiones y mantenida en [0, 1): la vuelta cae
   * sobre una copia idéntica. Basada en tiempo; se pausa fuera de pantalla.
   */
  const startDrift = (repeatsPerSecond, onDrift) => {
    let drift = 0;
    let visible = false;
    const tick = (time, deltaTime) => {
      if (!visible) return;
      drift = (drift + (repeatsPerSecond * Math.min(deltaTime, 50)) / 1000) % 1;
      onDrift(drift);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(scene);
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); observer.disconnect(); };
  };

  media.add(MOTION.pinned, () => {
    const stage = document.querySelector(".sync-stage");
    let progress = 0;
    let drift = 0;
    let pitches = rails.map(pitch);
    // Separación vertical mientras están fuera de fase, proporcional al escenario
    // y con tope: el borde de cada riel nunca sale de su mitad.
    let spread = 90;
    const measure = () => {
      const height = stage ? stage.offsetHeight : 0;
      const room = height / 2 - Math.max(...rails.map((rail) => rail.offsetHeight)) - 12;
      spread = Math.max(0, Math.min(Math.max(28, Math.min(height * 0.17, 120)), room));
      pitches = rails.map(pitch);
    };
    measure();

    const applyRails = () => {
      // phase: 0 = separados y corriendo, 1 = trabados sobre el eje.
      const phase = gsap.parseEase("sine.inOut")(clamp(progress / 0.24));
      const recede = gsap.parseEase("sine.inOut")(clamp((progress - 0.3) / 0.4));
      // Al retroceder se achican: una repetición en pantalla mide pitch * scale.
      const scale = 1 - recede * 0.08;
      rails.forEach((rail, index) => {
        const side = index === 0 ? -1 : 1;
        gsap.set(rail, {
          xPercent: -side * 9 * (1 - phase), // contrafase
          x: -pitches[index] * scale * (2 + side * drift),
          yPercent: index === 0 ? -100 : 0, // A arriba del centro, B abajo
          y: side * (4 + (1 - phase) * spread),
          opacity: (0.55 + phase * 0.45) * (1 - recede * 0.55),
          scale,
        });
      });
      if (axisLine) gsap.set(axisLine, { scaleY: phase, opacity: 0.25 + phase * 0.75 });
      if (axisNode) {
        const lock = clamp((progress - 0.16) / 0.12) * (1 - recede);
        gsap.set(axisNode, { opacity: lock, scale: 0.4 + lock * 0.6 });
      }
    };

    const CHOREO = 0.72;
    const render = (value) => {
      progress = value * CHOREO;
      const deal = [clamp((progress - 0.2) / 0.32), clamp((progress - 0.3) / 0.32)];
      cards.forEach((card, index) => {
        const side = index === 0 ? -1 : 1;
        const open = gsap.parseEase("power2.out")(deal[index]);
        gsap.set(card, {
          xPercent: side * (1 - open) * 14,
          yPercent: (1 - open) * (index === 0 ? 26 : -26),
          rotation: side * (1 - open) * 2.5,
          scale: 0.94 + open * 0.06,
          // Nunca 0: Chrome descarta la capa y la rasteriza entera al aparecer.
          opacity: Math.max(open, 0.002),
          pointerEvents: open > 0.6 ? "auto" : "none",
        });
      });
      if (heading) gsap.set(heading, { y: -20 * value, opacity: 1 - clamp((value - 0.7) / 0.3) * 0.25 });
      applyRails();
    };

    render(0);
    const stopDrift = startDrift(0.16, (value) => { drift = value; applyRails(); });

    const trigger = ScrollTrigger.create({
      trigger: scene,
      start: "top top",
      end: "bottom bottom",
      invalidateOnRefresh: true,
      onRefresh: (self) => { measure(); render(self.progress); },
      onUpdate: (self) => render(self.progress),
    });
    // Un gesto reproduce toda la secuencia: las tarjetas nunca quedan a medio repartir.
    const stepper = createStageStepper({ gsap, trigger, stops: [0, 1], durations: [2.6] });

    return () => {
      stepper.release();
      stopDrift();
      gsap.set([rails, cards, axisLine, axisNode, heading].flat().filter(Boolean), { clearProps: "all" });
    };
  });

  media.add(MOTION.flow, () => {
    let pitches = rails.map(pitch);
    const measure = () => { pitches = rails.map(pitch); };
    ScrollTrigger.addEventListener("refresh", measure);
    const stopDrift = startDrift(0.18, (drift) => {
      gsap.set(rails[0], { x: -pitches[0] * (2 + drift) });
      gsap.set(rails[1], { x: -pitches[1] * (3 - drift) });
    });
    cards.forEach((card, index) => {
      gsap.from(card, { y: 46, opacity: 0, duration: 0.75, delay: index * 0.08, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 88%", once: true } });
    });
    return () => {
      stopDrift();
      ScrollTrigger.removeEventListener("refresh", measure);
      gsap.set(rails, { clearProps: "all" });
    };
  });
}

/** Copia de createStageStepper (Loop Smith, js/main.js). Ver comentarios en "Scroll por etapas". */
function createStageStepper({ gsap, trigger, stops, durations }) {
  const EPSILON = 0.004;
  const FRESH_GAP = 140;
  const RUSH_WINDOW = 450, RUSH_STEP = 0.8, RUSH_MAX = 3.4;
  let tween = null, swallowing = false, lastWheel = 0, lastY = window.scrollY, direction = 1, settleTimer = 0;
  let rush = 1, target = null, glideEnd = -Infinity;
  const span = () => Math.max(trigger.end - trigger.start, 1);
  const inside = () => window.scrollY >= trigger.start - 2 && window.scrollY <= trigger.end + 2;
  const progressNow = () => MOTION.clamp((window.scrollY - trigger.start) / span());
  const atStop = (p) => stops.some((s) => Math.abs(s - p) < EPSILON);
  const nextStop = (dir, p) => (dir > 0 ? stops.find((s) => s > p + EPSILON) : [...stops].reverse().find((s) => s < p - EPSILON));
  const travelTime = (from, to) => {
    const low = Math.min(from, to), high = Math.max(from, to);
    return stops.slice(0, -1).reduce((sum, s, i) => {
      const overlap = Math.min(high, stops[i + 1]) - Math.max(low, s);
      return overlap > 0 ? sum + (durations[i] * overlap) / (stops[i + 1] - s) : sum;
    }, 0);
  };
  const glideTo = (stop, moving = false) => {
    const from = progressNow();
    const low = Math.min(from, stop);
    const segment = Math.max(0, stops.findIndex((v, i) => i < stops.length - 1 && low < stops[i + 1] - EPSILON));
    const duration = Math.max(travelTime(from, stop), durations[segment] * 0.4) / rush;
    tween?.kill();
    swallowing = true;
    target = stop;
    const proxy = { y: window.scrollY };
    tween = gsap.to(proxy, {
      y: trigger.start + span() * stop, duration, ease: moving ? "power2.out" : "power2.inOut",
      onUpdate: () => window.scrollTo({ top: proxy.y, behavior: "instant" }),
      onComplete: () => { tween = null; target = null; glideEnd = performance.now(); },
    });
  };
  const begin = (stop) => {
    rush = performance.now() - glideEnd < RUSH_WINDOW ? Math.min(rush + RUSH_STEP, RUSH_MAX) : 1;
    glideTo(stop);
  };
  const hurry = (dir) => {
    if (target === null || Math.sign(target - progressNow()) !== dir) return;
    rush = Math.min(rush + RUSH_STEP, RUSH_MAX);
    glideTo(nextStop(dir, target) ?? target, true);
  };
  const onWheel = (e) => {
    const now = performance.now();
    const fresh = now - lastWheel > FRESH_GAP;
    lastWheel = now;
    if (e.ctrlKey || !e.deltaY) return;
    if (fresh || !inside()) swallowing = false;
    if (!inside()) return;
    if (tween || swallowing) { e.preventDefault(); if (tween && fresh) hurry(Math.sign(e.deltaY)); return; }
    const p = progressNow();
    const stop = nextStop(Math.sign(e.deltaY), p);
    if (stop === undefined) return;
    e.preventDefault();
    if (fresh || !atStop(p)) begin(stop);
  };
  const onKey = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const el = e.target, space = e.key === " ";
    if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || (space && el.tagName === "BUTTON"))) return;
    const dir = ["ArrowDown", "PageDown"].includes(e.key) || (space && !e.shiftKey) ? 1 : ["ArrowUp", "PageUp"].includes(e.key) || (space && e.shiftKey) ? -1 : 0;
    if (!dir || !inside()) return;
    const stop = nextStop(dir, progressNow());
    if (stop === undefined) return;
    e.preventDefault();
    if (!tween) begin(stop); else if (!e.repeat) hurry(dir);
  };
  const onScroll = () => {
    const y = window.scrollY;
    if (y !== lastY) direction = y > lastY ? 1 : -1;
    lastY = y;
    clearTimeout(settleTimer);
    if (tween) return;
    settleTimer = setTimeout(() => {
      if (tween || !inside()) return;
      const p = progressNow();
      if (atStop(p)) return;
      const stop = nextStop(direction, p) ?? nextStop(-direction, p);
      if (stop === undefined) return;
      rush = 1;
      glideTo(stop);
    }, 120);
  };
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);
  window.addEventListener("scroll", onScroll, { passive: true });
  return {
    release() {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(settleTimer);
      tween?.kill();
      tween = null;
    },
  };
}
