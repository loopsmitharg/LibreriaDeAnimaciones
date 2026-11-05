/**
 * Chat que se escribe solo, con pestañas.
 * Base: Loop Smith, js/servicios.js → initializeServiceDemos(), loopingScene(), chatDemo().
 *
 * El HTML de la demo ya es su estado final: sin GSAP o con reduced-motion queda
 * quieta y completa, y las pestañas igual cambian de panel.
 */
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => initializeServiceDemo(chatDemo));

/* ---- Infraestructura común de las demos de servicio ------------------- */

// Las pestañas pueden vivir en la demo o al lado (en la .svc-feature).
const demoScope = (root) => root.closest(".svc-feature") || root;
const activeTab = (root) => demoScope(root).querySelector("[data-demo-tab].is-active")?.dataset.demoTab;

function initializeServiceDemo(createScene) {
  const root = document.querySelector("[data-svc-demo]");
  if (!root) return;
  const gsap = window.gsap;
  const env = { gsap, animate: Boolean(gsap) && !reduced() };
  const scene = createScene(root, env);

  // Pestañas: los paneles se apilan en una celda y el inactivo queda invisible
  // (visibility, no display: none, para que la demo no cambie de alto).
  const panels = [...root.querySelectorAll("[data-demo-panel]")];
  if (panels.length > 1) {
    panels[0].parentElement.classList.add("is-stacked");
    panels.forEach((panel) => {
      panel.hidden = false;
      const off = panel.dataset.demoPanel !== activeTab(root);
      panel.classList.toggle("is-off", off);
      if (off) panel.setAttribute("aria-hidden", "true");
    });
    const scope = demoScope(root);
    document.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-demo-tab]");
      if (!tab || !scope.contains(tab)) return;
      // En teléfono las opciones quedan lejos de la demo: la acerca a la vista.
      if (!root.contains(tab) && window.matchMedia("(max-width: 900px)").matches) {
        root.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
      }
      if (tab.classList.contains("is-active")) return;
      const key = tab.dataset.demoTab;
      scope.querySelectorAll("[data-demo-tab]").forEach((other) => {
        const on = other === tab;
        other.classList.toggle("is-active", on);
        other.setAttribute("aria-pressed", String(on));
      });
      panels.forEach((panel) => {
        const off = panel.dataset.demoPanel !== key;
        panel.classList.toggle("is-off", off);
        if (off) panel.setAttribute("aria-hidden", "true");
        else panel.removeAttribute("aria-hidden");
      });
      scene.show?.(key);
    });
  }

  if (!env.animate) return;
  // Corre solo en pantalla.
  let started = false;
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !started) { started = true; scene.start(); }
    else if (entry.isIntersecting) scene.resume?.();
    else scene.pause?.();
  }, { threshold: 0.3 }).observe(root);

  let timer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => scene.measure?.(started), 200);
  });
}

/** Timeline que se rearma desde cero (al empezar, al cambiar de pestaña o de tamaño) y se pausa fuera de pantalla. */
function loopingScene(build, { animate }) {
  let tl = null;
  let running = false;
  const restart = (play) => {
    tl?.kill();
    tl = animate ? build() : null;
    if (tl && play) tl.play();
  };
  return {
    start() { running = true; restart(true); },
    pause() { running = false; tl?.pause(); },
    resume() { running = true; tl?.play(); },
    measure(play) { if (tl) restart(play && running); },
    restart(play = running) { restart(play); },
  };
}

/* ---- La conversación se escribe sola ---------------------------------- */
function chatDemo(root, env) {
  const { gsap } = env;
  const typing = root.querySelector(".chat-typing");
  let key = activeTab(root);
  let thread = null;

  // La conversación que se deja vuelve a su estado final (opciones elegidas).
  const reset = () => {
    if (!thread) return;
    gsap.set(thread.children, { clearProps: "opacity,transform" });
    thread.querySelectorAll("[data-picked]").forEach((chip) => chip.classList.add("is-picked"));
  };

  const scene = loopingScene(() => {
    reset();
    thread = root.querySelector(`.chat-thread[data-demo-panel="${key}"]`);
    const msgs = [...thread.children];
    const chips = [...thread.querySelectorAll(".is-picked")];
    chips.forEach((chip) => chip.setAttribute("data-picked", ""));
    const tl = gsap.timeline({ paused: true, onComplete: () => scene.restart() });
    tl.add(() => chips.forEach((chip) => chip.classList.remove("is-picked")));
    tl.set(msgs, { opacity: 0.002, y: 10, scale: 0.96 });
    tl.set(typing, { opacity: 0 });
    msgs.forEach((msg, index) => {
      if (msg.classList.contains("chat-msg--bot")) {
        // "Escribiendo..." en el lugar donde va a aparecer la respuesta.
        tl.set(typing, { y: msg.offsetTop }, index ? ">+0.35" : ">+0.5");
        tl.add(() => typing.classList.add("is-on"));
        tl.to(typing, { opacity: 1, duration: 0.2 });
        tl.to(typing, { opacity: 0, duration: 0.15 }, ">+0.9");
        tl.add(() => typing.classList.remove("is-on"));
        tl.to(msg, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.6)" }, "<");
      } else {
        // El usuario elige la opción del mensaje anterior antes de "enviarla".
        const chip = msgs[index - 1]?.querySelector("[data-picked]");
        if (chip) tl.add(() => chip.classList.add("is-picked"), ">+0.6");
        tl.to(msg, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power3.out" }, chip ? ">+0.35" : ">+0.8");
      }
    });
    tl.to(msgs, { opacity: 0.002, duration: 0.4, stagger: 0.04 }, ">+3");
    tl.to({}, { duration: 0.4 });
    return tl;
  }, env);

  return {
    ...scene,
    show(next) {
      key = next;
      scene.restart();
    },
  };
}
