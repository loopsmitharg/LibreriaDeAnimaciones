/**
 * Acordeón horizontal con FLIP (solo transform).
 * Base: Loop Smith, js/main.js → initializeServiceAccordion() + buildServicesReveal().
 */
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {
  initializeServiceAccordion();
  if (window.gsap && window.ScrollTrigger && !reduced()) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    // Entrada: las tarjetas suben en cascada al aparecer.
    window.gsap.from(".service-accordion__item", {
      yPercent: 14, opacity: 0, duration: 0.85, stagger: 0.055, ease: "power3.out",
      scrollTrigger: { trigger: ".services-accordion", start: "top 84%", once: true },
    });
  }
});

function initializeServiceAccordion() {
  const items = [...document.querySelectorAll(".service-accordion__item")];
  if (!items.length) return;
  const isDesktop = () => window.matchMedia("(min-width: 901px)").matches;
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const row = items[0].parentElement;
  const gsap = window.gsap;
  let flip = null;

  const settle = () => {
    flip?.kill();
    flip = null;
    row.classList.remove("is-flipping");
    items.forEach((item) => ["--accordion-counter", "--accordion-copy", "--accordion-copy-counter"].forEach((name) => item.style.removeProperty(name)));
    // Solo lo del flip: el reveal de entrada usa yPercent en las mismas tarjetas.
    if (gsap) gsap.set(items, { x: 0, scaleX: 1 });
  };

  // La fila se reacomoda UNA vez, acá; el movimiento es solo transform (FLIP).
  // Cada tarjeta arranca desde la caja que mostraba (medida con su transform puesto),
  // así un cambio a mitad de vuelo continúa desde donde estén.
  const activate = (item, animate = true) => {
    if (!isDesktop()) return;
    if (animate && item.classList.contains("is-active")) return;
    const canFlip = animate && gsap && !reduced();
    const rowLeft = row.getBoundingClientRect().left;
    const before = canFlip ? items.map((card) => {
      const box = card.getBoundingClientRect();
      return { left: box.left - rowLeft, width: box.width };
    }) : null;
    settle();

    items.forEach((candidate) => {
      const isActive = candidate === item;
      candidate.classList.toggle("is-active", isActive);
      candidate.setAttribute("aria-expanded", isActive ? "true" : "false");
    });
    if (!before) return;

    const moves = items.map((card, index) => {
      const width = Math.max(card.offsetWidth, 1);
      const copy = Math.max(card.querySelector(".service-accordion__copy")?.offsetWidth || width, 1);
      return { card, width, copy, dx: before[index].left - card.offsetLeft, from: before[index].width / width };
    });
    const state = { t: 0 };
    const render = () => {
      moves.forEach(({ card, width, copy, dx, from }) => {
        const scale = from + (1 - from) * state.t;
        // La columna de texto recibe lo que la tarjeta muestra pasado su "chrome" fijo.
        const copyOnScreen = Math.max(scale * width - (width - copy), copy * 0.01) / copy;
        gsap.set(card, { x: dx * (1 - state.t), scaleX: scale, transformOrigin: "0% 50%" });
        card.style.setProperty("--accordion-counter", (1 / scale).toFixed(4));
        card.style.setProperty("--accordion-copy", (copyOnScreen / scale).toFixed(4));
        card.style.setProperty("--accordion-copy-counter", (1 / copyOnScreen).toFixed(4));
      });
    };
    row.classList.add("is-flipping");
    render();
    flip = gsap.to(state, { t: 1, duration: 1.1, ease: "power2.out", onUpdate: render, onComplete: settle });
  };

  // Hover con retardo de 130ms, delegado (pointerover/out + relatedTarget).
  const ITEM = ".service-accordion__item";
  let hoverTimer = 0;
  if (supportsHover) {
    document.addEventListener("pointerover", (e) => {
      const item = e.target.closest(ITEM);
      if (!item || item.contains(e.relatedTarget) || !isDesktop()) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => activate(item), 130);
    });
    document.addEventListener("pointerout", (e) => {
      const item = e.target.closest(ITEM);
      if (item && !item.contains(e.relatedTarget)) clearTimeout(hoverTimer);
    });
  }
  document.addEventListener("focusin", (e) => {
    const item = e.target.closest(ITEM);
    if (item && isDesktop()) activate(item);
  });
  // Touch en tablets anchas: el click también abre.
  document.addEventListener("click", (e) => {
    const item = e.target.closest(ITEM);
    if (item && isDesktop() && !e.target.closest("a")) activate(item);
  });

  const updateStateForViewport = () => {
    if (isDesktop()) {
      activate(items.find((item) => item.classList.contains("is-active")) || items[0], false);
    } else {
      settle();
      items.forEach((item) => { item.classList.remove("is-active"); item.setAttribute("aria-expanded", "false"); });
    }
  };
  updateStateForViewport();
  window.addEventListener("resize", updateStateForViewport);
}
