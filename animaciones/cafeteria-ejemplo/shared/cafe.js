/* ==========================================================================
   Cafetería de ejemplo · animaciones de página (GSAP + ScrollTrigger)
   Reutiliza las piezas del "Scroll de agencia":
     [data-words]  título que sube palabra por palabra
     [data-lines]  párrafo que sube línea por línea (líneas reales)
     .cf-fade      fundido + desplazamiento
     [data-frame]  portada que se abre con clip-path + parallax interno
     [data-item]   tarjetas-acordeón que se abren con el scroll (y con clic si el encabezado es <button>)
     [data-card]   tarjetas que entran; la columna derecha con parallax
   Más: menú de navegación (barra que se oculta al bajar + panel móvil).
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Menú (multi-page): funciona aunque no haya GSAP ---------- */
  const nav = document.querySelector('[data-nav]');
  const drawer = document.querySelector('[data-drawer]');
  const burger = document.querySelector('[data-burger]');
  if (nav) {
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      drawer.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open);
      drawer.inert = !open;
      document.body.style.overflow = open ? 'hidden' : '';
    };
    drawer.inert = true;
    burger.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); burger.focus(); } });
    $$('a', drawer).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    // Barra sólida fuera del hero; se esconde al bajar y vuelve al subir.
    let last = scrollY;
    const onScroll = () => {
      const y = scrollY, limit = nav.dataset.solidAfter === 'top' ? 10 : innerHeight * .85;
      nav.classList.toggle('is-solid', y > limit);
      nav.classList.toggle('is-hidden', y > last && y > innerHeight * .5 && !nav.classList.contains('is-open'));
      last = y;
    };
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* ---------- Acordeón con clic (carta): independiente de GSAP ---------- */
  $$('[data-item] .cf-item__toggle').forEach((btn) => {
    const item = btn.closest('[data-item]');
    const sync = () => btn.setAttribute('aria-expanded', item.classList.contains('is-open') || !root.classList.contains('cf-js'));
    btn.addEventListener('click', () => { item.classList.toggle('is-open'); item.dataset.manual = '1'; sync(); });
    new MutationObserver(sync).observe(item, { attributes: true, attributeFilter: ['class'] }); sync();
  });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || !window.ScrollTrigger || reduce) {
    root.classList.remove('cf-js');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Palabras con máscara ---------- */
  $$('[data-words]').forEach((el) => {
    const texto = el.textContent.trim();
    el.setAttribute('aria-label', texto);
    el.innerHTML = texto.split(/\s+/).map((w) => `<span class="cf-w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
    gsap.fromTo($$('.cf-w > span', el), { y: 0, yPercent: 100 }, {
      yPercent: 0, duration: 1, ease: 'power3.out', stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  $$('.cf-fade').forEach((el) => {
    gsap.to(el, { opacity: 1, y: 0, duration: 0.9, delay: 0.3, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });

  /* ---------- Portada: clip-path que se abre + parallax interno ---------- */
  $$('[data-frame]').forEach((frame) => {
    gsap.fromTo(frame, { clipPath: 'inset(12% 9% round 2rem)' }, {
      clipPath: 'inset(0% 0% round 2rem)', ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top 85%', end: 'top 15%', scrub: true },
    });
    const media = frame.querySelector('[data-frame-media]');
    if (media) gsap.fromTo(media, { yPercent: -6, scale: 1.05 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* ---------- Párrafos en líneas reales ---------- */
  const lineas = $$('[data-lines]');
  const textos = new Map(lineas.map((el) => [el, el.textContent.trim()]));
  let tweensLineas = [];
  function partirLineas() {
    tweensLineas.forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
    tweensLineas = [];
    lineas.forEach((el) => {
      const texto = textos.get(el);
      el.setAttribute('aria-label', texto);
      el.innerHTML = texto.split(/\s+/).map((w) => `<span class="cf-tmp">${w}</span>`).join(' ');
      const grupos = []; let top = null;
      $$('.cf-tmp', el).forEach((w) => {
        if (w.offsetTop !== top) { grupos.push([]); top = w.offsetTop; }
        grupos[grupos.length - 1].push(w.textContent);
      });
      el.innerHTML = grupos.map((g) => `<span class="cf-line" aria-hidden="true"><span>${g.join(' ')}</span></span>`).join('');
      tweensLineas.push(gsap.fromTo($$('.cf-line > span', el), { y: 0, yPercent: 105 }, {
        yPercent: 0, duration: 1, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 82%', once: true },
      }));
    });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(partirLineas);
  let ancho = innerWidth, rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (innerWidth !== ancho) { ancho = innerWidth; partirLineas(); } }, 200);
  });

  /* ---------- Tarjetas-acordeón por scroll ---------- */
  $$('[data-items]').forEach((list) => {
    $$('[data-item]', list).forEach((item, i) => {
      if (i > 0 || list.dataset.items === 'all-closed') {
        ScrollTrigger.create({
          trigger: item, start: 'top 70%',
          onEnter: () => item.classList.add('is-open'),
          // Al volver hacia arriba se cierra, salvo que el usuario la haya abierto o cerrado a mano.
          onLeaveBack: () => { if (!item.dataset.manual) item.classList.remove('is-open'); },
        });
      }
      const bg = item.querySelector('[data-item-bg]');
      if (bg) gsap.fromTo(bg, { yPercent: -8 }, {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  });
  let refrescar;
  $$('.cf-item__acc').forEach((acc) => acc.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'grid-template-rows') return;
    clearTimeout(refrescar);
    refrescar = setTimeout(() => ScrollTrigger.refresh(), 50);
  }));

  /* ---------- Tarjetas en dos columnas ---------- */
  $$('[data-card]').forEach((card, i) => {
    gsap.to(card, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 88%', once: true } });
    const img = card.querySelector('img');
    if (img) gsap.fromTo(img, { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true },
    });
    // Columna derecha: el marco se mueve un poco más lento que el scroll.
    const box = card.querySelector('.cf-card__img');
    if (box && i % 2 === 1 && matchMedia('(min-width: 720px)').matches) {
      gsap.fromTo(box, { y: 40 }, { y: -40, ease: 'none',
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  });

  // Las escenas 3D de scroll agregan altura al montarse: avisan con este evento.
  addEventListener('cf:layout', () => ScrollTrigger.refresh());
})();
