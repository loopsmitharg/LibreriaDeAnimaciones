/* ==========================================================================
   Cuento · animaciones propias (las de base vienen de cafeteria-ejemplo/shared/cafe.js)
     .cu-telon      telón bordó con el monograma entre páginas (capítulos)
     [data-type]    texto azul que se escribe a máquina al entrar en pantalla
     [data-rim]     el filete rojo de los platos se dibuja al entrar en pantalla
     [data-tilt]    el ticket "Vale por un café" se inclina con el puntero
     [data-indice]  índice del libro: la ilustración del capítulo sigue al cursor
     [data-v60]     escena anclada del filtrado: el café cae y llena la jarra con el scroll
   Todo funciona sin GSAP salvo el V60, que sin GSAP queda quieto y completo.
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) root.classList.remove('cu-js', 'cu-llegando');

  /* ---------- Telón entre capítulos ---------- */
  const telon = document.querySelector('.cu-telon');
  const CAPITULOS = {
    'index.html': ['Capítulo I', 'Había una vez'],
    'carta.html': ['Capítulo II', 'La carta'],
    'cafe.html': ['Capítulo III', 'El café'],
    'visitanos.html': ['Capítulo IV', 'Visitanos'],
  };
  const rotular = (archivo) => {
    const [num, titulo] = CAPITULOS[archivo || 'index.html'] || ['', 'Cuento'];
    telon.querySelector('small').textContent = num;
    telon.querySelector('span').textContent = titulo;
  };
  if (telon) rotular(location.pathname.split('/').pop());
  if (telon && !reduce) {
    // Llegada: si la página anterior cerró el telón, se abre hacia arriba.
    if (root.classList.contains('cu-llegando')) {
      sessionStorage.removeItem('cu-telon');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        telon.classList.add('is-saliendo');
        root.classList.remove('cu-llegando');
      }));
      telon.addEventListener('transitionend', () => telon.classList.remove('is-saliendo'), { once: true });
    }
    // Salida: links internos a otra página del sitio cierran el telón y después navegan.
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
      const url = new URL(a.href, location.href);
      const mismaPagina = url.pathname === location.pathname;
      if (url.origin !== location.origin || mismaPagina || !/\.html$|\/$/.test(url.pathname) || !url.pathname.includes('/cuento/')) return;
      e.preventDefault();
      rotular(url.pathname.split('/').pop());
      telon.classList.add('is-entrando');
      sessionStorage.setItem('cu-telon', '1');
      setTimeout(() => { location.href = url.href; }, 720);
    });
    // Volver con el botón "atrás" (bfcache): la página vuelve con el telón cerrado; se abre.
    addEventListener('pageshow', (e) => { if (e.persisted) telon.classList.remove('is-entrando'); });
  }

  /* ---------- Al entrar en pantalla ---------- */
  const alVer = (els, fn, margin = '0px 0px -15% 0px') => {
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { io.unobserve(en.target); fn(en.target); }
    }), { rootMargin: margin });
    els.forEach((el) => io.observe(el));
  };

  // Platos: el filete rojo se dibuja (transición de --rim en CSS).
  alVer($$('[data-rim]'), (el) => el.classList.add('is-drawn'));

  // Máquina de escribir: guarda el texto, lo vacía y lo tipea letra por letra.
  const tipear = $$('[data-type]');
  tipear.forEach((el) => {
    el.classList.add('cu-type');
    el.dataset.texto = el.textContent.trim();
    el.setAttribute('aria-label', el.dataset.texto);
    if (!reduce) el.textContent = ' ';
  });
  if (!reduce) alVer(tipear, (el) => {
    const texto = el.dataset.texto; let i = 0;
    el.classList.add('is-tipeando');
    const paso = () => {
      i++;
      el.textContent = texto.slice(0, i);
      if (i < texto.length) setTimeout(paso, texto[i - 1] === ' ' ? 70 : 28 + Math.random() * 40);
      else setTimeout(() => el.classList.remove('is-tipeando'), 1200);
    };
    setTimeout(paso, Number(el.dataset.type) || 200);
  }, '0px 0px -10% 0px');

  /* ---------- Ticket que se inclina ---------- */
  if (!reduce && matchMedia('(hover: hover)').matches) $$('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 18).toFixed(2)}deg) rotate(-2deg)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  /* ---------- Índice: la ilustración del capítulo sigue al cursor ---------- */
  const indice = document.querySelector('[data-indice]');
  const peek = document.querySelector('.cu-peek');
  if (indice && peek && !reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const mover = () => {
      x += (tx - x) * .16; y += (ty - y) * .16;
      peek.style.translate = `${x}px ${y}px`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > .3 ? requestAnimationFrame(mover) : 0;
    };
    addEventListener('pointermove', (e) => {
      tx = e.clientX + 110; ty = e.clientY - 20;
      if (!peek.classList.contains('is-on')) { x = tx; y = ty; }
      if (!raf) raf = requestAnimationFrame(mover);
    }, { passive: true });
    $$('a[data-peek]', indice).forEach((a) => {
      a.addEventListener('pointerenter', () => {
        peek.classList.add('is-on');
        $$('svg', peek).forEach((s) => s.classList.toggle('is-on', s.dataset.for === a.dataset.peek));
      });
      a.addEventListener('pointerleave', () => peek.classList.remove('is-on'));
    });
  }

  /* ---------- V60: escena anclada del filtrado ---------- */
  const v60 = document.querySelector('[data-v60]');
  if (!v60 || reduce) return;
  const iniciarV60 = () => {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    const q = (s) => v60.querySelector(s);
    const pasos = $$('.cu-v60__pasos li', v60);
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      v60.classList.add('cu-v60--anclado');
      // Estado inicial: molienda sin agua, jarra vacía.
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: v60, start: 'top top', end: 'bottom bottom', scrub: .6,
          onUpdate: (s) => {
            const n = Math.min(pasos.length - 1, Math.floor(s.progress * pasos.length));
            pasos.forEach((li, i) => li.classList.toggle('is-on', i === n));
          },
        },
      });
      tl.fromTo(q('.v-molienda'), { scaleY: .4, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 1 })
        .fromTo(q('.v-pava'), { x: 80, y: -40, rotate: 0, opacity: 0, svgOrigin: '228 64' }, { x: 0, y: 0, rotate: -12, opacity: 1, duration: .6, svgOrigin: '228 64' }, .7)
        .fromTo(q('.v-chorro'), { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1, duration: .3 }, 1.2)
        .fromTo(q('.v-bloom'), { scale: .7, opacity: 0, transformOrigin: '50% 100%' }, { scale: 1.06, opacity: 1, duration: .6 }, 1.3)
        .fromTo(q('.v-gotas'), { opacity: 0 }, { opacity: 1, duration: .2 }, 1.6)
        .fromTo(q('.v-cafe'), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 2 }, 1.7)
        .to(q('.v-chorro'), { scaleY: 0, transformOrigin: '50% 100%', duration: .3 }, 3.1)
        .to(q('.v-pava'), { x: 80, y: -40, rotate: 0, opacity: 0, duration: .5, svgOrigin: '228 64' }, 3.2)
        .to(q('.v-gotas'), { opacity: 0, duration: .3 }, 3.5)
        .fromTo(q('.v-vapor'), { opacity: 0 }, { opacity: 1, duration: .4 }, 3.6);
      pasos[0].classList.add('is-on');
      return () => { v60.classList.remove('cu-v60--anclado'); pasos.forEach((li) => li.classList.remove('is-on')); };
    });
    // En móvil la escena queda en flujo, completa y quieta (el estado final del dibujo).
  };
  if (document.readyState === 'complete') iniciarV60(); else addEventListener('load', iniciarV60);
})();
