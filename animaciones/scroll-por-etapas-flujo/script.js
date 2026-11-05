/**
 * Scroll por etapas: tablero de flujo (Análisis → Diseño → Implementación).
 * Base: Loop Smith, js/main.js → buildProcessBoard(), createStageStepper(),
 * layoutProcessWires(), sampleWire().
 */
const MOTION = {
  pinned: "(min-width: 901px)",
  flow: "(max-width: 900px)",
  reduced: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  clamp: (value, min = 0, max = 1) => Math.min(max, Math.max(min, value)),
};

/* ---- Cables ---------------------------------------------------------- */
let processWires = [];
const WIRE_SAMPLES = 96;

/**
 * Arma los cables desde el lugar de descanso de cada nodo (left/top por CSS,
 * que los offsets de GSAP nunca tocan). El viewBox del SVG es la caja en px
 * del campo, así las fracciones del dash coinciden con lo pintado.
 */
function layoutProcessWires() {
  const field = document.querySelector(".process-board__field");
  const svg = field?.querySelector(".process-board__wires");
  const group = svg?.querySelector(".process-board__links");
  if (!group) return processWires;
  const width = field.offsetWidth;
  const height = field.offsetHeight;
  if (!width || !height) return processWires;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const nodes = [...field.querySelectorAll(".process-node")];
  const byRole = (role) => nodes.filter((node) => node.dataset.role === role);
  const core = byRole("core")[0];
  const out = byRole("out")[0];
  // [desde, hasta, columna]
  const pairs = [
    ...byRole("in").map((node) => [node, core, 0]),
    ...byRole("act").map((node) => [core, node, 1]),
    ...byRole("act").map((node) => [node, out, 2]),
  ];
  if (group.children.length !== pairs.length) {
    group.replaceChildren(...pairs.map(() => document.createElementNS("http://www.w3.org/2000/svg", "path")));
  }
  // Primero TODAS las lecturas, después cuentas, después escrituras (sin layouts forzados).
  const ends = pairs.map(([from, to]) => [
    from.offsetLeft + from.offsetWidth, from.offsetTop + from.offsetHeight / 2,
    to.offsetLeft, to.offsetTop + to.offsetHeight / 2,
  ]);
  processWires = pairs.map(([, , column], index) => {
    const [x1, y1, x2, y2] = ends[index];
    const bend = (x2 - x1) * 0.55;
    const curve = sampleWire(x1, y1, x1 + bend, y1, x2 - bend, y2, x2, y2);
    return { path: group.children[index], column, d: `M${x1} ${y1} C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}`, ...curve };
  });
  processWires.forEach((wire) => wire.path.setAttribute("d", wire.d));
  return processWires;
}

/**
 * Muestrea una Bézier cúbica en JS: WIRE_SAMPLES + 1 puntos equiespaciados por
 * longitud de arco + la longitud. getPointAtLength recorre el path entero en
 * cada llamada: ~100 por cable costaban más de 1s de CPU en un teléfono.
 */
function sampleWire(x0, y0, x1, y1, x2, y2, x3, y3) {
  const at = (t) => {
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return { x: a * x0 + b * x1 + c * x2 + d * x3, y: a * y0 + b * y1 + c * y2 + d * y3 };
  };
  const STEPS = 128;
  const table = [{ t: 0, s: 0, ...at(0) }];
  for (let i = 1; i <= STEPS; i += 1) {
    const point = at(i / STEPS);
    const prev = table[i - 1];
    table.push({ t: i / STEPS, s: prev.s + Math.hypot(point.x - prev.x, point.y - prev.y), ...point });
  }
  const length = table[STEPS].s;
  const points = [];
  for (let i = 0, j = 1; i <= WIRE_SAMPLES; i += 1) {
    const target = (length * i) / WIRE_SAMPLES;
    while (j < STEPS && table[j].s < target) j += 1;
    const a = table[j - 1];
    const b = table[j];
    const k = b.s > a.s ? (target - a.s) / (b.s - a.s) : 0;
    points.push(at(a.t + (b.t - a.t) * k));
  }
  return { length: length + 1, points };
}

/* ---- Stage stepper (genérico) ----------------------------------------- */
/**
 * Convierte una escena anclada en etapas. Dentro de su rango, un gesto de rueda
 * (o flecha / página) desliza hasta la próxima parada: cada etapa se reproduce
 * completa y descansa. En los extremos la página scrollea normal. El scroll
 * sigue siendo la fuente de verdad. Devuelve { release, goTo }.
 */
function createStageStepper({ gsap, trigger, stops, durations }) {
  const EPSILON = 0.004;
  const FRESH_GAP = 140; // ms sin ruedas = gesto nuevo
  let tween = null;
  let swallowing = false; // tras un deslizamiento, el resto del gesto (inercia) se descarta
  let lastWheel = 0;
  let lastY = window.scrollY;
  let direction = 1;
  let settleTimer = 0;
  // Gestos seguidos aceleran: cada uno suma RUSH_STEP hasta RUSH_MAX.
  const RUSH_WINDOW = 450;
  const RUSH_STEP = 0.8;
  const RUSH_MAX = 3.4;
  let rush = 1;
  let target = null;
  let glideEnd = -Infinity;

  const span = () => Math.max(trigger.end - trigger.start, 1);
  const inside = () => window.scrollY >= trigger.start - 2 && window.scrollY <= trigger.end + 2;
  const progressNow = () => MOTION.clamp((window.scrollY - trigger.start) / span());
  const atStop = (progress) => stops.some((stop) => Math.abs(stop - progress) < EPSILON);
  const nextStop = (dir, progress) =>
    dir > 0 ? stops.find((stop) => stop > progress + EPSILON) : [...stops].reverse().find((stop) => stop < progress - EPSILON);

  // La duración propia de cada etapa, prorrateada por cuánto de ella cubre el viaje.
  const travelTime = (from, to) => {
    const low = Math.min(from, to);
    const high = Math.max(from, to);
    return stops.slice(0, -1).reduce((sum, stop, i) => {
      const overlap = Math.min(high, stops[i + 1]) - Math.max(low, stop);
      return overlap > 0 ? sum + (durations[i] * overlap) / (stops[i + 1] - stop) : sum;
    }, 0);
  };

  const glideTo = (stop, moving = false) => {
    const from = progressNow();
    const low = Math.min(from, stop);
    const segment = Math.max(0, stops.findIndex((value, i) => i < stops.length - 1 && low < stops[i + 1] - EPSILON));
    const duration = Math.max(travelTime(from, stop), durations[segment] * 0.4) / rush;
    tween?.kill();
    swallowing = true;
    target = stop;
    const proxy = { y: window.scrollY };
    tween = gsap.to(proxy, {
      y: trigger.start + span() * stop,
      duration,
      ease: moving ? "power2.out" : "power2.inOut",
      onUpdate: () => window.scrollTo({ top: proxy.y, behavior: "instant" }),
      onComplete: () => { tween = null; target = null; glideEnd = performance.now(); },
    });
  };

  const begin = (stop) => {
    rush = performance.now() - glideEnd < RUSH_WINDOW ? Math.min(rush + RUSH_STEP, RUSH_MAX) : 1;
    glideTo(stop);
  };
  // Gesto nuevo mientras una etapa corre: acelera y apunta a la siguiente.
  const hurry = (dir) => {
    if (target === null || Math.sign(target - progressNow()) !== dir) return;
    rush = Math.min(rush + RUSH_STEP, RUSH_MAX);
    glideTo(nextStop(dir, target) ?? target, true);
  };
  // Ir directo a una parada: nunca tarda más que la etapa más larga.
  const goTo = (stop) => {
    const time = travelTime(progressNow(), stop);
    if (time < 0.01) return;
    rush = Math.max(1, time / Math.max(...durations));
    glideTo(stop, tween !== null);
  };

  const onWheel = (event) => {
    const now = performance.now();
    const fresh = now - lastWheel > FRESH_GAP;
    lastWheel = now;
    if (event.ctrlKey || !event.deltaY) return;
    if (fresh || !inside()) swallowing = false;
    if (!inside()) return;
    if (tween || swallowing) {
      event.preventDefault();
      if (tween && fresh) hurry(Math.sign(event.deltaY));
      return;
    }
    const progress = progressNow();
    const stop = nextStop(Math.sign(event.deltaY), progress);
    if (stop === undefined) return;
    event.preventDefault();
    if (fresh || !atStop(progress)) begin(stop);
  };

  const onKey = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const el = event.target;
    const space = event.key === " ";
    if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || (space && el.tagName === "BUTTON"))) return;
    const dir = ["ArrowDown", "PageDown"].includes(event.key) || (space && !event.shiftKey) ? 1
      : ["ArrowUp", "PageUp"].includes(event.key) || (space && event.shiftKey) ? -1 : 0;
    if (!dir || !inside()) return;
    const stop = nextStop(dir, progressNow());
    if (stop === undefined) return;
    event.preventDefault();
    if (!tween) begin(stop);
    else if (!event.repeat) hurry(dir);
  };

  // Barra de scroll, touch, etc.: si el scroll descansa entre paradas, sigue a la próxima.
  const onScroll = () => {
    const y = window.scrollY;
    if (y !== lastY) direction = y > lastY ? 1 : -1;
    lastY = y;
    clearTimeout(settleTimer);
    if (tween) return;
    settleTimer = setTimeout(() => {
      if (tween || !inside()) return;
      const progress = progressNow();
      if (atStop(progress)) return;
      const stop = nextStop(direction, progress) ?? nextStop(-direction, progress);
      if (stop === undefined) return;
      rush = 1;
      glideTo(stop);
    }, 120);
  };

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);
  window.addEventListener("scroll", onScroll, { passive: true });
  const release = () => {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("scroll", onScroll);
    clearTimeout(settleTimer);
    tween?.kill();
    tween = null;
  };
  return { release, goTo };
}

/* ---- Escena ----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  layoutProcessWires();
  window.addEventListener("resize", layoutProcessWires);
  window.addEventListener("load", layoutProcessWires, { once: true });
  if (MOTION.reduced() || !window.gsap || !window.ScrollTrigger) {
    document.body.classList.add("no-gsap");
    return;
  }
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  buildProcessBoard({ gsap, ScrollTrigger, clamp: MOTION.clamp, media: gsap.matchMedia() });
  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
});

function buildProcessBoard({ gsap, ScrollTrigger, clamp, media }) {
  const section = document.querySelector(".process-story");
  const field = document.querySelector(".process-board__field");
  if (!section || !field) return;
  const copies = [...document.querySelectorAll(".process-board__copy")];
  const steps = [...document.querySelectorAll(".process-index li")];
  const count = document.querySelector(".process-board__count b");
  const grid = field.querySelector(".process-board__grid");
  const scan = field.querySelector(".process-board__scan");
  const pulseLayer = field.querySelector(".process-board__pulses");

  // Paradas de cada etapa. El texto cambia al EMPEZAR el deslizamiento.
  const STOPS = [0, 0.3, 0.68, 1];
  const stageAt = (progress) => (progress <= STOPS[1] + 0.01 ? 0 : progress <= STOPS[2] + 0.01 ? 1 : 2);

  // Salida de cada pieza hacia el flujo: las repetidas primero.
  const DEPART = { repeat: 0.37, in: 0.4, act: 0.44 };
  const TRAVEL = 0.13;
  // Momento en que se enciende cada columna.
  const LIVE = { in: 0.71, core: 0.755, act: 0.8, out: 0.845 };
  const COLUMN_LIVE = [LIVE.in, LIVE.core, LIVE.act];
  const WIRE_DRAW = [[0.55, 0.62], [0.585, 0.645], [0.615, 0.665]];

  const travelEase = gsap.parseEase("power3.inOut");
  const popEase = gsap.parseEase("back.out(2.2)");
  const counters = {};
  const nodes = [...field.querySelectorAll(".process-node")].map((el, order) => {
    const role = el.dataset.role;
    const [fromX, fromY, spin] = (el.dataset.from || "").split(" ").map(Number);
    counters[role] = (counters[role] || 0) + 1;
    return {
      el,
      role,
      from: el.dataset.from ? { x: fromX, y: fromY, spin } : null,
      x: parseFloat(el.style.getPropertyValue("--x")),
      y: parseFloat(el.style.getPropertyValue("--y")),
      depart: (DEPART[role] ?? 0) + (counters[role] - 1) * 0.016,
      seed: order * 1.7,
    };
  });

  let width = 0;
  let height = 0;
  let pulses = [];
  const measure = () => {
    width = field.offsetWidth;
    height = field.offsetHeight;
    const wires = layoutProcessWires();
    if (pulses.length !== wires.length) {
      pulses = wires.map(() => document.createElementNS("http://www.w3.org/2000/svg", "circle"));
      pulses.forEach((pulse) => pulse.setAttribute("r", "3.5"));
      pulseLayer.replaceChildren(...pulses);
    }
    wires.forEach((wire) => (wire.path.style.strokeDasharray = `${wire.length}`));
  };

  let lastActive = -1;
  const markStage = (active) => {
    if (active === lastActive) return;
    lastActive = active;
    copies.forEach((copy, i) => {
      copy.classList.toggle("is-active", i === active);
      copy.classList.toggle("is-past", i < active);
    });
    steps.forEach((step, i) => {
      step.classList.toggle("is-active", i === active);
      step.classList.toggle("is-done", i < active);
      if (i === active) step.firstElementChild?.setAttribute("aria-current", "step");
      else step.firstElementChild?.removeAttribute("aria-current");
    });
    if (count) count.textContent = `0${active + 1}`;
  };

  // `time` mueve la vida en reposo: el caos deriva y los pulsos corren.
  const render = (progress, time = 0) => {
    markStage(stageAt(progress));
    steps.forEach((step, i) => {
      const fill = clamp((progress - STOPS[i]) / (STOPS[i + 1] - STOPS[i])).toFixed(3);
      if (step.dataset.fill === fill) return;
      step.dataset.fill = fill;
      step.style.setProperty("--stage-fill", fill);
    });

    const sweep = clamp((progress - 0.04) / 0.22);
    gsap.set(scan, { x: sweep * width, opacity: Math.sin(Math.PI * sweep) });
    gsap.set(grid, { opacity: clamp((progress - 0.38) / 0.16) });

    nodes.forEach((node) => {
      const { el, role, from } = node;
      if (!from) {
        // Núcleo y salida nacen en la etapa de diseño en vez de viajar.
        const pop = popEase(clamp((progress - (role === "core" ? 0.48 : 0.6)) / 0.07));
        gsap.set(el, { scale: Math.max(pop, 0.001), opacity: clamp(pop * 3) });
        el.classList.toggle("is-seen", pop > 0.5);
        el.classList.toggle("is-live", progress >= LIVE[role]);
        return;
      }
      const t = travelEase(clamp((progress - node.depart) / TRAVEL));
      const rest = 1 - t;
      // Cada pieza viaja por un arco suave, no en línea recta.
      const arc = Math.sin(Math.PI * t) * height * 0.09 * (node.y < from.y ? 1 : -1);
      const merging = role === "repeat" ? clamp((t - 0.6) / 0.4) : 0;
      gsap.set(el, {
        x: (from.x - node.x) * width * rest + Math.sin(time * 0.7 + node.seed) * 7 * rest,
        y: (from.y - node.y) * height * rest + arc + Math.cos(time * 0.55 + node.seed) * 6 * rest,
        rotation: from.spin * rest + Math.sin(time * 0.4 + node.seed) * 5 * rest,
        scale: (0.86 + t * 0.14) * (1 - merging * 0.5),
        opacity: 1 - merging,
      });
      el.classList.toggle("is-seen", sweep >= from.x || progress > 0.3);
      el.classList.toggle("is-live", role !== "repeat" && progress >= LIVE[role]);
    });

    processWires.forEach((wire, i) => {
      const [start, end] = WIRE_DRAW[wire.column];
      const drawn = clamp((progress - start) / (end - start));
      wire.path.style.strokeDashoffset = `${wire.length * (1 - drawn)}`;
      wire.path.classList.toggle("is-live", progress >= COLUMN_LIVE[wire.column]);

      const pulse = pulses[i];
      if (!pulse) return;
      const on = clamp((progress - COLUMN_LIVE[wire.column]) / 0.04);
      const u = (time * 0.42 + wire.column * 0.33 + i * 0.13) % 1;
      const f = u * WIRE_SAMPLES;
      const a = wire.points[Math.floor(f)];
      const b = wire.points[Math.min(Math.floor(f) + 1, WIRE_SAMPLES)];
      const k = f - Math.floor(f);
      pulse.style.transform = `translate(${(a.x + (b.x - a.x) * k).toFixed(1)}px, ${(a.y + (b.y - a.y) * k).toFixed(1)}px)`;
      pulse.style.opacity = (on * Math.sin(Math.PI * u)).toFixed(3);
    });
  };

  // Los botones del índice llevan a una etapa (habilitados solo con escena viva).
  let goToStep = null;
  document.addEventListener("click", (e) => {
    const button = e.target.closest(".process-index__step");
    if (!button || button.disabled || !goToStep) return;
    const index = steps.indexOf(button.closest("li"));
    if (index !== -1) goToStep(index);
  });
  const enableSteps = (go) => {
    goToStep = go;
    const buttons = steps.map((step) => step.querySelector("button")).filter(Boolean);
    buttons.forEach((button) => (button.disabled = false));
    return () => {
      if (goToStep === go) goToStep = null;
      buttons.forEach((button) => (button.disabled = true));
    };
  };

  // Un reloj compartido que solo corre con la sección en pantalla.
  const scene = (getProgress) => {
    let running = false;
    const tick = () => render(getProgress(), gsap.ticker.time);
    const toggle = (on) => {
      if (on === running) return;
      running = on;
      if (on) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    };
    const watch = ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => toggle(self.isActive),
      onRefresh: () => { measure(); render(getProgress(), gsap.ticker.time); },
    });
    measure();
    render(getProgress());
    return () => {
      toggle(false);
      watch.kill();
      lastActive = -1;
      gsap.set([scan, grid, ...nodes.map((node) => node.el)], { clearProps: "transform,opacity" });
      nodes.forEach((node) => node.el.classList.remove("is-seen", "is-live"));
      processWires.forEach((wire) => {
        wire.path.style.strokeDasharray = "";
        wire.path.style.strokeDashoffset = "";
        wire.path.classList.remove("is-live");
      });
      pulseLayer.replaceChildren();
      pulses = [];
    };
  };

  media.add(MOTION.pinned, () => {
    let progress = 0;
    const cleanup = scene(() => progress);
    // Sin scrub: el deslizamiento del stepper ya es el movimiento temporizado.
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      invalidateOnRefresh: true,
      onUpdate: (self) => { progress = self.progress; },
    });
    const stepper = createStageStepper({ gsap, trigger, stops: STOPS, durations: [1.2, 1.6, 1.35] });
    const releaseSteps = enableSteps((i) => stepper.goTo(STOPS[i + 1]));
    return () => { releaseSteps(); stepper.release(); cleanup(); };
  });

  media.add(MOTION.flow, () => {
    // Sin pin: el tablero se reproduce entero (9s) al entrar en pantalla.
    const state = { progress: 0 };
    const cleanup = scene(() => state.progress);
    const DURATION = 9;
    const autoplay = gsap.to(state, { progress: 1, duration: DURATION, ease: "none", scrollTrigger: { trigger: field, start: "top 75%", once: true } });
    const releaseSteps = enableSteps((i) => {
      autoplay.scrollTrigger?.kill();
      autoplay.kill();
      const stop = STOPS[i + 1];
      gsap.to(state, { progress: stop, duration: Math.max(Math.abs(stop - state.progress) * DURATION, 0.6), ease: "power2.inOut", overwrite: true });
    });
    return () => { releaseSteps(); cleanup(); };
  });
}
