/**
 * Scroll manual: tres paneles giran sobre una rueda invisible y el borde de la
 * rueda es la línea de progreso, con un cabezal arrastrable.
 * Base: Loop Smith, js/main.js → buildWorkWheel() + paintPhilosophy().
 */
const MOTION = {
  scrub: 0.68,
  pinned: "(min-width: 901px)",
  flow: "(max-width: 900px)",
  reduced: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  clamp: (value, min = 0, max = 1) => Math.min(max, Math.max(min, value)),
};

/** Dibuja un path SVG hasta `progress` (stroke-dashoffset). La longitud se lee una vez. */
const pathLengths = new WeakMap();
function setPathProgress(path, progress) {
  if (!path) return;
  if (!pathLengths.has(path)) pathLengths.set(path, path.getTotalLength());
  const length = pathLengths.get(path);
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length * (1 - progress)}`;
}

/** Punto de un path SVG en coordenadas locales de `reference`. */
function pathPointIn(path, fraction, reference) {
  const length = path.getTotalLength();
  if (!length) return null;
  const point = path.getPointAtLength(length * MOTION.clamp(fraction));
  const matrix = path.getScreenCTM();
  if (!matrix) return null;
  const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
  const box = reference.getBoundingClientRect();
  return { x: screen.x - box.left, y: screen.y - box.top };
}

/** Parte la frase en tres "beats": primera palabra normal, el resto en <em>. */
function preparePhilosophyBeats() {
  const quote = document.querySelector(".work-philosophy");
  if (!quote) return;
  const source = quote.textContent.trim().replace(/^["“]|["”]$/g, "");
  const fragments = source.match(/[^.]+\./g) || [source];
  quote.replaceChildren(...fragments.map((fragment) => {
    const words = fragment.trim().split(/\s+/);
    const beat = document.createElement("span");
    beat.className = "philosophy-beat";
    beat.append(document.createTextNode(`${words.shift() || ""} `));
    const emphasis = document.createElement("em");
    emphasis.textContent = words.join(" ");
    beat.append(emphasis);
    return beat;
  }));
}

/** Colores leídos de las custom properties (no hardcodeados en JS), cacheados. */
let palette = null;
function philosophyColors() {
  if (!palette) {
    const styles = getComputedStyle(document.body);
    palette = {
      muted: styles.getPropertyValue("--color-ghost").trim() || "rgba(148,163,184,.3)",
      text: styles.getPropertyValue("--color-text").trim() || "#f8fafc",
      accent: styles.getPropertyValue("--color-accent").trim() || "#a3e635",
    };
  }
  return palette;
}
function paintPhilosophy(gsap, progress) {
  const beats = [...document.querySelectorAll(".philosophy-beat")];
  const colors = philosophyColors();
  const spread = progress * beats.length;
  beats.forEach((beat, index) => {
    const fill = MOTION.clamp(spread - index);
    beat.style.color = gsap.utils.interpolate(colors.muted, colors.text, fill);
    const em = beat.querySelector("em");
    if (em) em.style.color = gsap.utils.interpolate(colors.muted, colors.accent, fill);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  preparePhilosophyBeats();
  if (MOTION.reduced() || !window.gsap || !window.ScrollTrigger) {
    document.body.classList.add("no-gsap");
    return;
  }
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  buildWorkWheel({ gsap, ScrollTrigger, clamp: MOTION.clamp, media: gsap.matchMedia() });
  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
});

function buildWorkWheel({ gsap, ScrollTrigger, clamp, media }) {
  const section = document.querySelector(".work-wheel");
  const pin = document.querySelector(".work-wheel__pin");
  const area = document.querySelector(".work-wheel__panels");
  const panels = [...document.querySelectorAll(".work-wheel__panel")];
  const stages = [...document.querySelectorAll(".work-wheel__stage")];
  const railBase = document.querySelector(".work-wheel__rail-base");
  const railProgress = document.querySelector(".work-wheel__rail-progress");
  const railHead = document.querySelector(".work-wheel__rail-head");
  if (!section || !pin || !area || panels.length !== 3) return;

  media.add(MOTION.pinned, () => {
    // Geometría: SWEEP = cuánto recorre cada paso del borde; ROTATION amortiguada para leer.
    const SWEEP = 1.16;
    const ROTATION = 13;

    // Scroll → escena, con mesetas: cada paso descansa al centro. Nudos [scroll, escena].
    const KNOTS = [[0, 0], [0.03, 0], [0.46, 0.5], [0.54, 0.5], [0.97, 1], [1, 1]];
    // Mitad lineal, mitad seno: un seno completo se arrastra demasiado al entrar a cada meseta.
    const swing = (t) => 0.5 * t + 0.25 * (1 - Math.cos(Math.PI * t));
    const sceneAt = (raw) => {
      const value = clamp(raw);
      for (let i = 1; i < KNOTS.length; i += 1) {
        const [x0, y0] = KNOTS[i - 1];
        const [x1, y1] = KNOTS[i];
        if (value <= x1) return y0 + (y1 - y0) * swing((value - x0) / Math.max(x1 - x0, 0.0001));
      }
      return 1;
    };
    // Inversa (para el cabezal): un valor en meseta cae al medio de la meseta.
    const scrollAt = (scene) => {
      const value = clamp(scene);
      const segments = KNOTS.slice(1).map((knot, i) => [KNOTS[i], knot]);
      const rest = segments.find(([[, y0], [, y1]]) => y0 === y1 && Math.abs(value - y0) < 0.0001);
      if (rest) return (rest[0][0] + rest[1][0]) / 2;
      const [[x0, y0], [x1, y1]] = segments.find(([[, y0], [, y1]]) => y0 !== y1 && value >= y0 && value <= y1);
      const target = (value - y0) / (y1 - y0);
      let low = 0;
      let high = 1;
      for (let i = 0; i < 24; i += 1) {
        const mid = (low + high) / 2;
        if (swing(mid) < target) low = mid;
        else high = mid;
      }
      return x0 + (x1 - x0) * low;
    };

    // Tabla y → progreso del riel, en coordenadas del pin. Se arma en cada refresh:
    // medir el path en cada frame, después de escribir transforms, forzaba un layout.
    const samples = [];
    const buildSamples = () => {
      samples.length = 0;
      const length = railProgress.getTotalLength();
      const matrix = railProgress.getScreenCTM();
      if (!length || !matrix) return;
      const box = pin.getBoundingClientRect();
      for (let i = 0; i <= 140; i += 1) {
        const fraction = i / 140;
        const point = railProgress.getPointAtLength(length * fraction);
        const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
        samples.push({ fraction, x: screen.x - box.left, y: screen.y - box.top });
      }
    };
    const railPointAt = (progress) => {
      if (samples.length < 2) buildSamples();
      if (samples.length < 2) return null;
      const f = clamp(progress) * (samples.length - 1);
      const a = samples[Math.floor(f)];
      const b = samples[Math.min(Math.floor(f) + 1, samples.length - 1)];
      const k = f - Math.floor(f);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    };
    const progressAtY = (localY) => {
      if (samples.length < 2) buildSamples();
      if (samples.length < 2) return null;
      if (localY >= samples[0].y) return 0;
      if (localY <= samples[samples.length - 1].y) return 1;
      for (let i = 1; i < samples.length; i += 1) {
        const a = samples[i - 1];
        const b = samples[i];
        if (localY <= a.y && localY >= b.y) return a.fraction + (b.fraction - a.fraction) * ((a.y - localY) / Math.max(a.y - b.y, 0.0001));
      }
      return null;
    };

    const placeStages = () => {
      buildSamples();
      [0.02, 0.5, 0.98].forEach((fraction, index) => {
        const point = pathPointIn(railBase, fraction, pin);
        if (!point || !stages[index]) return;
        stages[index].style.left = `${Math.round(point.x + 26)}px`;
        stages[index].style.top = `${Math.round(point.y)}px`;
      });
    };

    const render = (progress) => {
      const box = area.getBoundingClientRect();
      const radiusX = box.width * 0.46;
      const radiusY = box.height * 1.04;
      const active = progress < 0.25 ? 0 : progress < 0.75 ? 1 : 2;

      panels.forEach((panel, index) => {
        // -1 = subiendo, 0 = al centro, +1 = salió por arriba.
        const t = clamp(progress * 2 - index, -1.4, 1.4);
        const angle = -t * SWEEP;
        const distance = Math.min(Math.abs(t), 1);
        gsap.set(panel, {
          x: (Math.cos(angle) - 1) * radiusX,
          y: Math.sin(angle) * radiusY,
          rotation: -t * ROTATION,
          scale: 1 - distance * 0.2,
          opacity: 1 - clamp((Math.abs(t) - 0.55) / 0.4),
          zIndex: Math.round((1 - distance) * 10) + 2,
          pointerEvents: index === active ? "auto" : "none",
        });
        panel.classList.toggle("is-active", index === active);
      });

      stages.forEach((stage, index) => {
        stage.classList.toggle("is-active", index === active);
        stage.classList.toggle("is-done", progress > index / 2);
      });

      setPathProgress(railProgress, progress);
      const point = railPointAt(progress);
      if (point) gsap.set(railHead, { x: point.x, y: point.y, xPercent: -50, yPercent: -50 });
      railHead.setAttribute("aria-valuenow", Math.round(progress * 100));
      paintPhilosophy(gsap, clamp((progress - 0.72) / 0.26));
    };

    render(0);
    requestAnimationFrame(placeStages);

    let dragging = false;
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: MOTION.scrub,
      invalidateOnRefresh: true,
      onRefresh: (self) => {
        placeStages();
        render(sceneAt(self.progress));
      },
      // Mientras se arrastra, el cabezal es dueño del render (sin el retraso del scrub).
      onUpdate: (self) => { if (!dragging) render(sceneAt(self.progress)); },
    });

    const scrollForProgress = (p) => trigger.start + (trigger.end - trigger.start) * clamp(p);
    // Recibe progreso de ESCENA (lo que muestra el riel), no de scroll.
    const seek = (p) => {
      const value = clamp(p);
      window.scrollTo({ top: Math.round(scrollForProgress(scrollAt(value))), behavior: "instant" });
      render(value);
    };

    const onHeadDown = (event) => {
      dragging = true;
      railHead.classList.add("is-grabbed");
      try { railHead.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
    };
    const onHeadMove = (event) => {
      if (!dragging) return;
      const next = progressAtY(event.clientY - pin.getBoundingClientRect().top);
      if (next !== null) seek(next);
    };
    const onHeadUp = (event) => {
      if (!dragging) return;
      dragging = false;
      railHead.classList.remove("is-grabbed");
      try { railHead.releasePointerCapture(event.pointerId); } catch (_) {}
    };
    const onHeadKey = (event) => {
      const step = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.2, PageDown: -0.2 }[event.key];
      if (step !== undefined) {
        seek(sceneAt(trigger.progress) + step);
        event.preventDefault();
      } else if (event.key === "Home" || event.key === "End") {
        seek(event.key === "Home" ? 0 : 1);
        event.preventDefault();
      }
    };

    railHead.addEventListener("pointerdown", onHeadDown);
    railHead.addEventListener("pointermove", onHeadMove);
    railHead.addEventListener("pointerup", onHeadUp);
    railHead.addEventListener("pointercancel", onHeadUp);
    railHead.addEventListener("keydown", onHeadKey);

    // Limpieza al cruzar el breakpoint: sin esto quedan transforms a medio aplicar.
    return () => {
      railHead.removeEventListener("pointerdown", onHeadDown);
      railHead.removeEventListener("pointermove", onHeadMove);
      railHead.removeEventListener("pointerup", onHeadUp);
      railHead.removeEventListener("pointercancel", onHeadUp);
      railHead.removeEventListener("keydown", onHeadKey);
      gsap.set(panels, { clearProps: "all" });
      gsap.set(railHead, { clearProps: "all" });
      stages.forEach((stage) => { stage.style.left = ""; stage.style.top = ""; });
      setPathProgress(railProgress, 0);
      document.querySelectorAll(".philosophy-beat, .philosophy-beat em").forEach((node) => (node.style.color = ""));
    };
  });

  media.add(MOTION.flow, () => {
    // Sin pin: la misma narrativa, con entradas al aparecer.
    panels.forEach((panel) => {
      gsap.from(panel, { y: 46, opacity: 0, duration: 0.75, ease: "power3.out", scrollTrigger: { trigger: panel, start: "top 88%", once: true } });
    });
  });
}
