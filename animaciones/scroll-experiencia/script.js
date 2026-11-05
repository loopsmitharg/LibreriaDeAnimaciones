/**
 * Scroll con foco: lista de experiencia.
 * Base: CosmeCV, js/main.js → initScrollSpy() (elegirRol) + initMotion() (medidor).
 */
document.addEventListener("DOMContentLoaded", () => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  initRoleSpy();
  if (window.gsap && window.ScrollTrigger && !reduced) initMotion();
});

/**
 * Experiencia activa: la que tiene el TÍTULO más cerca de la línea de lectura.
 * Se mide el <h3>, no la tarjeta (la tarjeta reserva espacio del hover, así que
 * su centro no dice dónde estás mirando). Siempre queda exactamente una activa.
 */
function initRoleSpy() {
  const roles = [...document.querySelectorAll(".role")];
  const titles = roles.map((rol) => rol.querySelector("h3") || rol);
  if (!roles.length) return;
  let rolActual = null;
  let pendiente = false;

  function elegirRol(rects) {
    const linea = innerHeight * 0.42;
    let mejor = null;
    let mejorDist = Infinity;
    for (let i = 0; i < roles.length; i++) {
      const t = rects[i];
      if (t.bottom < 0 || t.top > innerHeight) continue;
      const d = Math.abs(t.top + t.height / 2 - linea);
      if (d < mejorDist) { mejorDist = d; mejor = roles[i]; }
    }
    if (mejor === rolActual) return;
    rolActual = mejor;
    roles.forEach((r) => r.classList.toggle("is-current", r === mejor));
  }

  // Todas las lecturas antes de tocar clases; una vez por frame como máximo.
  const actualizar = () => elegirRol(titles.map((title) => title.getBoundingClientRect()));
  const alScrollear = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; actualizar(); });
  };
  actualizar();
  addEventListener("scroll", alScrollear, { passive: true });
  addEventListener("resize", alScrollear, { passive: true });
}

function initMotion() {
  gsap.registerPlugin(ScrollTrigger);
  // El atenuado solo se activa si el motion realmente va a correr.
  document.body.classList.add("motion-on");
  gsap.fromTo(".experience__meter span", { scaleX: 0 }, {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { trigger: ".experience", start: "top 15%", end: "bottom 85%", scrub: true },
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
