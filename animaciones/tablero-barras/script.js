/**
 * Tablero de datos: las barras crecen al mostrar cada pestaña.
 * Base: Loop Smith, js/servicios.js → initializeServiceDemos(), dashboardDemo().
 */
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => initializeServiceDemo(dashboardDemo));

const demoScope = (root) => root.closest(".svc-feature") || root;
const activeTab = (root) => demoScope(root).querySelector("[data-demo-tab].is-active")?.dataset.demoTab;

/** Pestañas + arranque al entrar en pantalla (igual que en Loop Smith). */
function initializeServiceDemo(createScene) {
  const root = document.querySelector("[data-svc-demo]");
  if (!root) return;
  const gsap = window.gsap;
  const env = { gsap, animate: Boolean(gsap) && !reduced() };
  const scene = createScene(root, env);

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
      if (!tab || !scope.contains(tab) || tab.classList.contains("is-active")) return;
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

  // Agregado de la librería: botón para volver a reproducir.
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-demo-replay]")) scene.show?.(activeTab(root));
  });

  if (!env.animate) return;
  let started = false;
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !started) { started = true; scene.start(); }
  }, { threshold: 0.3 }).observe(root);
}

function dashboardDemo(root, env) {
  const { gsap, animate } = env;
  // Valor final de cada barra: el --v de su fila (function-based value de GSAP).
  // La barra misma ya tiene style: el que escribe GSAP.
  const value = (i, el) => parseFloat(el.closest('[style*="--v"]').style.getPropertyValue("--v")) || 1;
  let tl = null;
  const run = (key) => {
    if (!animate) return;
    tl?.progress(1).kill();
    const panel = root.querySelector(`[data-demo-panel="${key}"]`);
    const rows = panel.querySelectorAll(".dash-rank .dash-bar, .dash-stock .dash-bar");
    const cols = panel.querySelectorAll(".dash-col .dash-bar");
    const stack = panel.querySelector(".dash-stack");
    const notes = panel.querySelectorAll(".dash-note, .dash-alert");
    tl = gsap.timeline();
    if (rows.length) tl.fromTo(rows, { scaleX: 0 }, { scaleX: value, duration: 0.9, ease: "power3.out", stagger: 0.07 }, 0);
    if (cols.length) tl.fromTo(cols, { scaleY: 0 }, { scaleY: value, duration: 0.9, ease: "power3.out", stagger: 0.07 }, 0.15);
    if (stack) tl.fromTo(stack, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "power3.inOut" }, 0);
    if (notes.length) tl.fromTo(notes, { opacity: 0.002, y: 6 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, ">-0.2");
  };
  return { start: () => run(activeTab(root)), show: run };
}
