/**
 * Café Gutiérrez · dibujos que se trazan solos.
 * Cada <svg data-draw> tiene trazos .ln con pathLength="1": el CSS los deja con dashoffset 1 (sin dibujar)
 * y al entrar en pantalla se agrega .is-drawn (dashoffset 0). Los rellenos .fill-in aparecen después.
 * Sin IntersectionObserver o con movimiento reducido: se quita html.gz-js y todo queda dibujado.
 */
/* La barra de filtrados (1600×900) en un cuadro vertical: con "slice" se cortaban la V60 y la pava.
   En cuadros angostos se recorta el viewBox al centro de la escena (lámparas + objetos, x 340–1290)
   y se gana alto hacia arriba (pared y cables de las lámparas), así entra todo el dibujo. */
(() => {
  const svg = document.querySelector("[data-bar]");
  if (!svg) return;
  const BASE = "0 0 1600 900", W = 950, CX = 815;
  const fit = () => {
    const { width, height } = svg.getBoundingClientRect();
    if (!width || !height) return;
    const asp = width / height;
    if (asp >= 1.2) { svg.setAttribute("viewBox", BASE); return; }
    const h = W / asp;
    svg.setAttribute("viewBox", `${CX - W / 2} ${900 - h} ${W} ${h}`);
  };
  fit();
  if ("ResizeObserver" in window) new ResizeObserver(fit).observe(svg); else addEventListener("resize", fit);
})();

(() => {
  const root = document.documentElement;
  const svgs = document.querySelectorAll("[data-draw]");
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.remove("gz-js");
    return;
  }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("is-drawn");
    io.unobserve(e.target);
  }), { rootMargin: "0px 0px -15% 0px" });
  svgs.forEach((svg) => io.observe(svg));
})();
