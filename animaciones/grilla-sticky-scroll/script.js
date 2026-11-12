/* ==========================================================================
   Grilla sticky con scroll
   Inspirado en "Sticky Grid Scroll: Building a Scroll-Driven Animated Grid"
   (Theo Plawinski, Codrops). Reconstrucción propia con GSAP + ScrollTrigger.

   Progreso del scroll → estado visual
     0% – 45%   la grilla entra por columnas
     45% – 90%  zoom: la grilla se agranda y se abre
     90% – 95%  aparece el contenido (título, texto, botón)
     95% – 100% la escena se estabiliza
   ========================================================================== */
(() => {
  const block = document.querySelector('[data-sg]');
  if (!block || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const wrapper = block.querySelector('.sg__wrapper');
  const content = block.querySelector('.sg__content');
  const title = block.querySelector('.sg__title');
  const description = block.querySelector('.sg__desc');
  const button = block.querySelector('.sg__button');
  const grid = block.querySelector('.sg__grid');
  const items = gsap.utils.toArray('.sg__item', block);

  // Con movimiento reducido no se arma la escena: queda todo en flujo y legible.
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    document.documentElement.classList.add('is-sg');

    // 3 columnas: el ítem i va a la columna i % 3.
    const NUM_COLUMNAS = 3;
    const columnas = Array.from({ length: NUM_COLUMNAS }, () => []);
    items.forEach((item, i) => columnas[i % NUM_COLUMNAS].push(item));

    /* ---------- Estado inicial del contenido ---------- */
    let tituloOffsetY = 0;
    function centrarTitulo() {
      // Cuánto hay que bajar el título para que quede en el centro del contenedor, en %.
      const dy = (content.offsetHeight - title.offsetHeight) / 2 - title.offsetTop;
      tituloOffsetY = (dy / title.offsetHeight) * 100;
    }
    centrarTitulo();
    gsap.set([description, button], { opacity: 0, pointerEvents: 'none' });
    gsap.set(title, { yPercent: tituloOffsetY });
    let visible = false;

    /* ---------- Contenido: no se scrubea, se dispara según la dirección ---------- */
    function alternarContenido(mostrar) {
      if (mostrar === visible) return;
      visible = mostrar;
      button.tabIndex = mostrar ? 0 : -1;
      // overwrite 'auto' (no true): solo corta tweens de las mismas propiedades. Con true
      // mataría también el fundido de opacidad del título y lo dejaría a medio aparecer.
      gsap.timeline({ defaults: { overwrite: 'auto' } })
        .to(title, { yPercent: mostrar ? 0 : tituloOffsetY, duration: 0.7, ease: 'power2.inOut' })
        .to([description, button], {
          opacity: mostrar ? 1 : 0,
          duration: 0.4,
          ease: `power1.${mostrar ? 'inOut' : 'out'}`,
          pointerEvents: mostrar ? 'all' : 'none',
        }, mostrar ? '-=90%' : '<');
    }
    button.tabIndex = -1;

    /* ---------- Entrada: columnas pares desde arriba, impares desde abajo ---------- */
    function entradaGrilla() {
      const tl = gsap.timeline();
      // Distancia para que la grilla arranque completamente fuera de pantalla.
      // Es función: con invalidateOnRefresh se recalcula al cambiar el tamaño.
      const dy = () => innerHeight - (innerHeight - grid.offsetHeight) / 2;
      columnas.forEach((columna, c) => {
        const desdeArriba = c % 2 === 0;
        // fromTo (no from): con invalidateOnRefresh, un from volvería a leer su valor
        // final desde la posición de arranque y la grilla quedaría quieta.
        tl.fromTo(columna, { y: () => dy() * (desdeArriba ? -1 : 1) }, {
          y: 0,
          stagger: { each: 0.06, from: desdeArriba ? 'end' : 'start' },
          ease: 'power1.inOut',
        }, 'entrada');
      });
      return tl;
    }

    /* ---------- Zoom: la grilla crece y se abre ---------- */
    function zoomGrilla() {
      const tl = gsap.timeline({ defaults: { duration: 1, ease: 'power3.inOut' } });
      tl.to(grid, { scale: 2.05 })
        .to(columnas[0], { xPercent: -40 }, '<')
        .to(columnas[2], { xPercent: 40 }, '<')
        .to(columnas[1], {
          // Mitad de arriba sube, mitad de abajo baja.
          yPercent: (i) => (i < Math.floor(columnas[1].length / 2) ? -1 : 1) * 40,
          duration: 0.5,
          ease: 'power1.inOut',
        }, '-=0.5');
      return tl;
    }

    /* ---------- Timeline maestro ---------- */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: block,
        start: 'top 25%',
        end: 'bottom bottom',
        scrub: true,
        invalidateOnRefresh: true,
        // Red de seguridad: si se salta el callback con un scroll muy rápido, el contenido queda bien.
        onLeave: () => alternarContenido(true),
        onLeaveBack: () => alternarContenido(false),
      },
    });
    tl.add(entradaGrilla())
      .add(zoomGrilla(), '-=0.6')
      .add(() => alternarContenido(tl.scrollTrigger.direction === 1), '-=0.32');

    /* ---------- Parallax de entrada: la escena parece ya fija mientras el bloque sube ---------- */
    gsap.from(wrapper, {
      yPercent: -100,
      ease: 'none',
      scrollTrigger: { trigger: block, start: 'top bottom', end: 'top top', scrub: true },
    });

    /* ---------- El título aparece con un fundido al acercarse ---------- */
    gsap.from(title, {
      opacity: 0,
      duration: 0.7,
      ease: 'power1.out',
      scrollTrigger: { trigger: block, start: 'top 57%', toggleActions: 'play none none reset' },
    });

    const alRefrescar = () => {
      centrarTitulo();
      if (!visible) gsap.set(title, { yPercent: tituloOffsetY });
    };
    ScrollTrigger.addEventListener('refreshInit', alRefrescar);

    // Limpieza si cambia la preferencia de movimiento.
    return () => {
      ScrollTrigger.removeEventListener('refreshInit', alRefrescar);
      document.documentElement.classList.remove('is-sg');
      gsap.set([title, description, button, grid, ...items, wrapper], { clearProps: 'all' });
      button.removeAttribute('tabindex');
    };
  });
})();
