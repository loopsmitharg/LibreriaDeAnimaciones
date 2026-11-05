/**
 * Cursor con inversión de color.
 * Base: CosmeCV, js/main.js → initCursor().
 * Solo con mouse real (hover + pointer fino), GSAP disponible y sin reduced-motion.
 */
document.addEventListener("DOMContentLoaded", () => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.gsap && matchMedia("(hover: hover) and (pointer: fine)").matches && !reduced) initCursor();
});

function initCursor() {
  const ring = document.querySelector(".cursor");
  const dot = document.querySelector(".cursor-dot");
  const label = ring.querySelector(".cursor__label");
  // quickTo: una función reutilizable por eje, sin crear un tween por evento.
  // Anillo con inercia (0.45s); punto casi pegado al puntero (0.1s).
  const rx = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" });
  const ry = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
  const dx = gsap.quickTo(dot, "x", { duration: 0.1, ease: "none" });
  const dy = gsap.quickTo(dot, "y", { duration: 0.1, ease: "none" });

  addEventListener("pointermove", (e) => {
    rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    ring.style.opacity = dot.style.opacity = "1";
  });
  document.addEventListener("mouseleave", () => (ring.style.opacity = dot.style.opacity = "0"));

  // Sobre elementos interactivos: crece, se rellena y muestra una etiqueta.
  document.querySelectorAll("a,button,summary,[data-cursor]").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      ring.classList.add("is-active");
      label.textContent = el.dataset.cursor || (el.tagName === "SUMMARY" ? "OPEN" : "GO");
    });
    el.addEventListener("pointerleave", () => {
      ring.classList.remove("is-active");
      label.textContent = "";
    });
  });
}
