/* ==========================================================================
   Scroll de agencia
   Inspirado en el home de cuberto.com. Reconstrucción propia con GSAP +
   ScrollTrigger (ni su código ni su arte).

   1. Títulos: palabras que suben desde su máscara.
   2. Portada: clip-path que se abre + parallax interno.
   3. Presentación: párrafo partido en líneas reales que suben.
   4. Servicios: acordeón que se abre con el scroll (gris → negro).
   5. Proyectos: tarjetas que entran + columna derecha con parallax.
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || !window.ScrollTrigger || reduce) {
    root.classList.remove('sa-js');      // todo visible y el acordeón abierto
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- 1 · Palabras con máscara ---------- */
  $$('[data-words]').forEach((el) => {
    const texto = el.textContent.trim();
    el.setAttribute('aria-label', texto);
    el.innerHTML = texto.split(/\s+/)
      .map((w) => `<span class="sa-w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
    // El CSS las deja en translateY(100%). GSAP lo leería como y en px y quedaría sumado
    // al yPercent: por eso el estado inicial fija y: 0 y mueve solo yPercent.
    gsap.fromTo($$('.sa-w > span', el), { y: 0, yPercent: 100 }, {
      yPercent: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  /* ---------- Textos que aparecen con fundido ---------- */
  $$('.sa-fade').forEach((el) => {
    gsap.to(el, { opacity: 1, y: 0, duration: 0.9, delay: 0.3, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  /* ---------- 2 · Portada: se abre y el contenido hace parallax ---------- */
  const frame = document.querySelector('[data-preview]');
  const media = document.querySelector('[data-preview-media]');
  if (frame) {
    gsap.fromTo(frame, { clipPath: 'inset(12% 9% round 2rem)' }, {
      clipPath: 'inset(0% 0% round 2rem)', ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top 85%', end: 'top 15%', scrub: true },
    });
    gsap.fromTo(media, { yPercent: -10, scale: 1.05 }, {
      yPercent: 10, ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  /* ---------- 3 · Párrafo en líneas reales ---------- */
  const lineas = $$('[data-lines]');
  const textos = new Map(lineas.map((el) => [el, el.textContent.trim()]));
  let tweensLineas = [];
  function partirLineas() {
    tweensLineas.forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
    tweensLineas = [];
    lineas.forEach((el) => {
      const texto = textos.get(el);
      el.setAttribute('aria-label', texto);
      // Primero palabras sueltas para medir en qué renglón cae cada una.
      el.innerHTML = texto.split(/\s+/).map((w) => `<span class="sa-tmp">${w}</span>`).join(' ');
      const grupos = [];
      let top = null;
      $$('.sa-tmp', el).forEach((w) => {
        if (w.offsetTop !== top) { grupos.push([]); top = w.offsetTop; }
        grupos[grupos.length - 1].push(w.textContent);
      });
      el.innerHTML = grupos.map((g) => `<span class="sa-line" aria-hidden="true"><span>${g.join(' ')}</span></span>`).join('');
      const t = gsap.fromTo($$('.sa-line > span', el), { y: 0, yPercent: 105 }, {
        yPercent: 0, duration: 1, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 80%', once: true },
      });
      tweensLineas.push(t);
    });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(partirLineas);
  let ancho = innerWidth, rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (innerWidth !== ancho) { ancho = innerWidth; partirLineas(); } }, 200);
  });

  /* ---------- 4 · Acordeón por scroll ---------- */
  $$('[data-item]').forEach((item, i) => {
    // El primero arranca abierto (como el original); los demás se abren al cruzar el 70%.
    if (i > 0) {
      ScrollTrigger.create({
        trigger: item,
        start: 'top 70%',
        onEnter: () => item.classList.add('is-open'),
        onLeaveBack: () => item.classList.remove('is-open'),
      });
    }
    // La imagen de fondo se desplaza más lento que la tarjeta.
    const bg = item.querySelector('[data-item-bg]');
    gsap.fromTo(bg, { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  // El acordeón cambia alturas: hay que recalcular los triggers que vienen después.
  let refrescar;
  $$('.sa-item__acc').forEach((acc) => acc.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'grid-template-rows') return;
    clearTimeout(refrescar);
    refrescar = setTimeout(() => ScrollTrigger.refresh(), 50);
  }));

  /* ---------- 5 · Tarjetas de proyectos ---------- */
  $$('[data-card]').forEach((card, i) => {
    gsap.to(card, {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 88%', once: true },
    });
    // Columna derecha (pares): un poco más lenta que el scroll.
    if (i % 2 === 1) {
      gsap.fromTo(card.querySelector('[data-card-img]'), { y: 40 }, {
        y: -40, ease: 'none',
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }
  });
})();
