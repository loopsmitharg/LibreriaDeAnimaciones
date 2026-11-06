/**
 * Carrusel hero con fundido (crossfade por clase .active).
 * Base: GameOver, js/main.js → initializeCarousel() + delegación de .dot.
 * Agregado de la librería: pausa con la pestaña oculta y sin autoplay con reduced-motion.
 */
(function () {
  "use strict";
  const SLIDE_DURATION = 5000;

  function initializeCarousel(root = document) {
    const slides = root.querySelectorAll(".hero-slide");
    const dots = root.querySelectorAll(".dot");
    if (!slides.length) return null;
    const autoplay = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let current = 0;
    let timer = null;

    function changeSlide(index) {
      slides[current].classList.remove("active");
      dots[current]?.classList.remove("active");
      dots[current]?.setAttribute("aria-selected", "false");
      current = (index + slides.length) % slides.length; // da la vuelta en ambos sentidos
      slides[current].classList.add("active");
      dots[current]?.classList.add("active");
      dots[current]?.setAttribute("aria-selected", "true");
    }

    function start() {
      clearInterval(timer);
      if (autoplay) timer = setInterval(() => changeSlide(current + 1), SLIDE_DURATION);
    }

    // Ir a un slide reinicia el temporizador: el elegido dura sus 5s completos.
    function goToSlide(index) {
      changeSlide(index);
      start();
    }

    document.addEventListener("visibilitychange", () => (document.hidden ? clearInterval(timer) : start()));
    start();
    return { goToSlide, dots: [...dots] };
  }

  document.addEventListener("DOMContentLoaded", () => {
    const carousel = initializeCarousel();
    if (!carousel) return;
    // Delegación: un solo listener para todos los puntos.
    document.addEventListener("click", (e) => {
      const dot = e.target.closest(".dot");
      if (!dot) return;
      const index = carousel.dots.indexOf(dot);
      if (index !== -1) carousel.goToSlide(index);
    });
  });
})();
