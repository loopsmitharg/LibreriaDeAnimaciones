/**
 * Scroll horizontal anclado (proyectos).
 * Base: CosmeCV, js/main.js → initMotion(), bloque de .projects.
 */
document.addEventListener("DOMContentLoaded", () => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!window.gsap || !window.ScrollTrigger || reduced) return; // queda overflow-x: auto
  gsap.registerPlugin(ScrollTrigger);
  document.body.classList.add("motion-on");

  ScrollTrigger.matchMedia({
    "(min-width: 781px)": () => {
      const section = document.querySelector(".projects");
      const track = document.querySelector(".projects__track");
      const progress = document.querySelector(".projects__progress span");
      // Cuánto hay que correr la pista: lo que sobra del viewport.
      let distance = 0;
      const measure = () => { distance = Math.max(0, track.scrollWidth - innerWidth); };
      measure();
      ScrollTrigger.addEventListener("refreshInit", measure);
      const setProgress = gsap.quickSetter(progress, "scaleX");
      const tween = gsap.to(track, {
        x: () => -distance,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance}`, // 1px de scroll = 1px de desplazamiento
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (s) => setProgress(s.progress),
        },
      });
      return () => {
        ScrollTrigger.removeEventListener("refreshInit", measure);
        tween.kill();
      };
    },
  });

  // Una fuente tardía cambia anchos: un solo refresh agrupado.
  let frame;
  const refresh = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => ScrollTrigger.refresh()); };
  document.fonts.ready.then(refresh);
});
