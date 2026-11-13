/* ==========================================================================
   Portfolio líquido
   Inspirado en las animaciones de eszterbial.com. Reconstrucción propia:
   ni el código ni el arte del sitio; mismas ideas, implementación nueva.

   Cada efecto es una función independiente enganchada por data-*:
     loader · revelarHero · intercambioLetras · caritaLiquida · cursor · menu
     tarjetas · magnetico · tema · temaPorScroll · ondas · puerta · palabras
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Sin GSAP: se deshace el estado inicial y queda todo visible.
  if (!window.gsap) { root.classList.remove('pl-js'); return; }
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (reduce) root.classList.remove('pl-js');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

  /* ------------------------------------------------------------------------
     1 · Loader: el contador sigue el progreso real (fuentes), sale hacia
     arriba y las columnas se recogen; mientras, crece la grilla de fondo.
     ------------------------------------------------------------------------ */
  function loader() {
    const el = $('[data-loader]');
    const count = $('[data-count]');
    const cols = $$('.pl-loader__cols i');
    const lineas = $$('.pl-grid i');
    if (reduce || !el) { if (el) el.remove(); revelarHero(); return; }

    let mostrado = 0;
    let objetivo = 10;
    // Progreso real: fuentes listas = 100. Mínimo visual ~1 s para que se lea.
    const t0 = performance.now();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { objetivo = 100; });
    setTimeout(() => { objetivo = 100; }, 6000);   // red de seguridad

    (function subir() {
      const tope = Math.min(objetivo, ((performance.now() - t0) / 1100) * 100);
      if (mostrado < tope) mostrado += Math.ceil((tope - mostrado) / 8) || 1;
      count.textContent = `${Math.min(100, Math.round(mostrado))}%`;
      if (mostrado < 100) return requestAnimationFrame(subir);
      salir();
    })();

    function salir() {
      gsap.timeline({ onComplete: () => el.remove() })
        .to(count, { y: -50, opacity: 0, duration: 0.5, ease: 'power2.in' })
        .to(cols, {
          scaleY: 0, duration: 1.2, stagger: 0.1, ease: 'power4.inOut',
          onStart: () => {
            gsap.to(lineas, { scaleY: 1, duration: 1.5, stagger: 0.08, ease: 'power3.inOut', delay: 0.6 });
            setTimeout(revelarHero, 500);
          },
        }, '-=0.2');
    }
  }

  /* ------------------------------------------------------------------------
     2 · Hero: cada línea sube desde su máscara; la carita entra con rebote.
     ------------------------------------------------------------------------ */
  function revelarHero() {
    if (reduce) return;
    gsap.to('.pl-menu-btn', { y: 0, opacity: 1, duration: 1, ease: 'power3.out' });
    gsap.to('.pl-hero__title .pl-mask__in', { y: '0%', duration: 1.2, stagger: 0.1, ease: 'power3.out' });
    gsap.to('.pl-hero__services .pl-mask__in', { y: '0%', duration: 1, stagger: 0.08, ease: 'power3.out' });
    gsap.to('.pl-smiley', { opacity: 1, scale: 1, duration: 1.5, ease: 'elastic.out(1, 0.5)' });
  }

  /* ------------------------------------------------------------------------
     3 · Intercambio de letras: cada 3–4 s, 1 o 2 letras al azar salen a la
     derecha mientras su copia entra desde la izquierda.
     ------------------------------------------------------------------------ */
  function intercambioLetras() {
    $$('[data-swap]').forEach((el) => {
      const texto = el.textContent;
      el.setAttribute('aria-label', texto);
      el.textContent = '';
      const letras = [...texto].map((ch) => {
        const c = document.createElement('span');
        c.className = 'sw';
        c.setAttribute('aria-hidden', 'true');
        const a = document.createElement('span');
        const b = document.createElement('span');
        a.className = 'sw__a';
        b.className = 'sw__b';
        a.textContent = b.textContent = ch === ' ' ? ' ' : ch;
        c.append(a, b);
        el.appendChild(c);
        return { a, b, espacio: ch === ' ' };
      }).filter((l) => !l.espacio);
      if (reduce) return;

      const animar = (l) => {
        const w = l.a.offsetWidth + 4;
        gsap.set(l.b, { x: -w });
        gsap.to(l.a, { x: w, duration: 0.5, ease: 'power2.inOut' });
        gsap.to(l.b, {
          x: 0, duration: 0.5, ease: 'power2.inOut',
          // Se intercambian los papeles: la copia queda como original.
          onComplete: () => { const t = l.a; l.a = l.b; l.b = t; },
        });
      };
      const secuencia = () => {
        const elegidas = gsap.utils.shuffle([...letras]).slice(0, Math.random() < 0.5 ? 1 : 2);
        elegidas.forEach((l, i) => setTimeout(() => animar(l), i * (150 + Math.random() * 150)));
        setTimeout(secuencia, 3000 + Math.random() * 1000);
      };
      setTimeout(secuencia, 2500 + Math.random() * 800);
    });
  }

  /* ------------------------------------------------------------------------
     4 · Carita líquida: puntos + spline Catmull-Rom. Tres capas de senos y
     un arrastre por velocidad del mouse con resorte (rebote al volver).
     ------------------------------------------------------------------------ */
  // Formas paramétricas (coordenadas del viewBox 0..500). Cambiables por tu dibujo.
  const FORMAS = {
    cara: { cerrada: true, puntos: circulo(250, 255, 205, 190, 56, 0.04) },
    'ojo-izq': { cerrada: true, puntos: circulo(195, 205, 22, 62, 18, 0) },
    'ojo-der': { cerrada: true, puntos: circulo(305, 205, 22, 62, 18, 0) },
    sonrisa: { cerrada: false, puntos: arco(250, 270, 120, 95, 0.15 * Math.PI, 0.85 * Math.PI, 24) },
  };
  function circulo(cx, cy, rx, ry, n, irregular) {
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const k = 1 + irregular * Math.sin(a * 3 + 1.2) + irregular * 0.5 * Math.cos(a * 5);
      return { x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k };
    });
  }
  function arco(cx, cy, rx, ry, a0, a1, n) {
    return Array.from({ length: n }, (_, i) => {
      const a = a0 + (a1 - a0) * (i / (n - 1));
      return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
    });
  }
  function spline(p, cerrada) {
    const n = p.length;
    const at = (i) => (cerrada ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
    let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
    const fin = cerrada ? n : n - 1;
    for (let i = 0; i < fin; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return cerrada ? `${d}Z` : d;
  }

  function caritaLiquida() {
    const svg = $('[data-liquid]');
    if (!svg) return;
    const trazos = $$('path[data-shape]', svg).map((path) => {
      const f = FORMAS[path.dataset.shape];
      const xs = f.puntos.map((q) => q.x), ys = f.puntos.map((q) => q.y);
      const tam = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      return {
        path, cerrada: f.cerrada,
        base: f.puntos,
        off: f.puntos.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 })),
        escala: Math.min(1, Math.max(0.2, tam / 500)),   // los ojos ondulan menos que la cara
      };
    });
    const dibujar = (t) => trazos.forEach((tr) => {
      const n = tr.base.length;
      const pts = tr.base.map((q, i) => {
        const pr = i / n, s = tr.escala, o = tr.off[i];
        const wx = Math.sin(t * 0.6 + pr * Math.PI * 2) * 15 + Math.sin(-t * 1.5 + pr * Math.PI * 4) * 8 + Math.sin(t * 1.2 + i * 0.3) * 5;
        const wy = Math.cos(t * 0.5 + pr * Math.PI * 2) * 15 + Math.cos(-t * 1.3 + pr * Math.PI * 4) * 8 + Math.cos(t * 1.1 + i * 0.3) * 5;
        return { x: q.x + wx * s + o.x, y: q.y + wy * s + o.y };
      });
      tr.path.setAttribute('d', spline(pts, tr.cerrada));
    });
    dibujar(0);
    if (reduce) return;

    // Mouse en coordenadas del SVG y su velocidad.
    const pt = svg.createSVGPoint();
    let ult = null;
    const vel = { x: 0, y: 0 };
    const local = { x: -9999, y: -9999 };
    addEventListener('pointermove', (e) => {
      const m = svg.getScreenCTM();
      if (!m) return;
      pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(m.inverse());
      if (ult) { vel.x = q.x - ult.x; vel.y = q.y - ult.y; }
      ult = { x: q.x, y: q.y };
      local.x = q.x; local.y = q.y;
      // Empuje: los puntos cercanos se van en la dirección del movimiento.
      const R = 160;
      trazos.forEach((tr) => tr.base.forEach((q0, i) => {
        const d = Math.hypot(local.x - q0.x, local.y - q0.y);
        if (d < R) {
          const f = (1 - d / R) * 0.9;
          tr.off[i].vx += vel.x * f;
          tr.off[i].vy += vel.y * f;
        }
      }));
    }, { passive: true });

    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(svg);
    let t = Math.random() * 100;
    gsap.ticker.add((_, dtMs) => {
      if (!visible) return;
      const dt = Math.min(dtMs, 50) / 16.67;
      t += 0.006 * dt;   // mismo ritmo que el original: 0.006 por cuadro a 60 fps
      vel.x *= 0.9; vel.y *= 0.9;
      // Resorte poco amortiguado: vuelve con rebote (como un elastic).
      trazos.forEach((tr) => tr.off.forEach((o) => {
        o.vx += -o.x * 0.035 * dt; o.vy += -o.y * 0.035 * dt;
        o.vx *= Math.pow(0.9, dt); o.vy *= Math.pow(0.9, dt);
        o.x = Math.max(-150, Math.min(150, o.x + o.vx * dt));
        o.y = Math.max(-150, Math.min(150, o.y + o.vy * dt));
      }));
      dibujar(t);
    });
  }

  /* ------------------------------------------------------------------------
     5 · Cursor: punto propio, insignia "VER" sobre tarjetas y una figura que
     sigue al título de contacto con lerp e inclinación según la velocidad.
     ------------------------------------------------------------------------ */
  function cursor() {
    if (!finePointer || reduce) return;
    const c = $('[data-cursor]'), view = $('[data-cursor-view]'), follow = $('[data-cursor-follow]');
    const titulo = $('[data-contact-title]');
    root.classList.add('pl-cursor-on');
    const fx = { x: mouse.x, y: mouse.y, sx: 0, sy: 0 };
    let siguiendo = false;

    addEventListener('pointermove', (e) => {
      c.classList.remove('is-hidden');   // oculto hasta el primer movimiento
      c.style.left = `${e.clientX}px`; c.style.top = `${e.clientY}px`;
      view.style.left = `${e.clientX}px`; view.style.top = `${e.clientY}px`;
    }, { passive: true });
    document.addEventListener('pointerleave', () => c.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => c.classList.remove('is-hidden'));

    $$('a, button').forEach((el) => {
      if (el.matches('[data-card]')) return;
      el.addEventListener('pointerenter', () => c.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => c.classList.remove('is-hover'));
    });
    $$('[data-card]').forEach((el) => {
      el.addEventListener('pointerenter', () => { c.classList.add('is-card'); view.classList.add('is-on'); });
      el.addEventListener('pointerleave', () => { c.classList.remove('is-card'); view.classList.remove('is-on'); });
    });
    if (titulo) {
      titulo.addEventListener('pointerenter', () => {
        siguiendo = true; fx.x = mouse.x; fx.y = mouse.y;
        c.classList.add('is-follow'); follow.classList.add('is-on');
      });
      titulo.addEventListener('pointerleave', () => {
        siguiendo = false; c.classList.remove('is-follow'); follow.classList.remove('is-on');
      });
    }
    gsap.ticker.add(() => {
      if (!siguiendo && !follow.classList.contains('is-on')) return;
      const vx = mouse.x - fx.x, vy = mouse.y - fx.y;
      fx.x += vx * 0.12; fx.y += vy * 0.12;
      fx.sx += (gsap.utils.clamp(-15, 15, vx * 0.3) - fx.sx) * 0.15;
      fx.sy += (gsap.utils.clamp(-15, 15, vy * 0.3) - fx.sy) * 0.15;
      follow.style.transform = `translate(${fx.x}px, ${fx.y}px) translate(-50%, -50%) skew(${fx.sx}deg, ${fx.sy}deg)`;
    });
  }

  /* ------------------------------------------------------------------------
     6 · Menú: tarjeta que aparece, links que suben, separador que crece,
     cruz que gira. Hover: cada letra sube y la copia entra desde abajo.
     ------------------------------------------------------------------------ */
  function menu() {
    const card = $('#pl-menu');
    const abrirBtn = $('[data-menu-open]');
    const cerrarBtn = $('[data-menu-close]');
    if (!card) return;
    const inners = $$('.pl-menu__inner', card);
    const sep = $('.pl-menu__sep', card);
    const pie = $$('.pl-menu__foot a', card);
    let abierto = false;

    // Letras duplicadas para el hover.
    inners.forEach((inner) => {
      const txt = inner.textContent;
      inner.setAttribute('aria-label', txt);
      const fila = (extra) => {
        const r = document.createElement('span');
        r.className = `pl-menu__row${extra}`;
        r.setAttribute('aria-hidden', 'true');
        [...txt].forEach((ch) => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; r.appendChild(s); });
        return r;
      };
      const a = fila(''), b = fila(' pl-menu__row--clone');
      inner.replaceChildren(a, b);
      const ca = $$('.ch', a), cb = $$('.ch', b);
      gsap.set(cb, { yPercent: 120 });
      const link = inner.closest('a');
      let tl;
      link.addEventListener('pointerenter', () => {
        if (tl) tl.kill();
        tl = gsap.timeline()
          .to(ca, { yPercent: -120, duration: 0.5, ease: 'power2.out', stagger: 0.04 }, 0)
          .to(cb, { yPercent: 0, duration: 0.5, ease: 'power2.out', stagger: 0.04 }, 0);
      });
      link.addEventListener('pointerleave', () => {
        const volver = () => {
          tl = gsap.timeline()
            .to(ca, { yPercent: 0, duration: 0.5, ease: 'power2.out', stagger: 0.04 }, 0)
            .to(cb, { yPercent: 120, duration: 0.5, ease: 'power2.out', stagger: 0.04 }, 0);
        };
        // Espera a que termine la entrada antes de revertir.
        if (tl && tl.isActive()) tl.then(volver); else volver();
      });
    });

    function abrir() {
      abierto = true;
      card.hidden = false;
      abrirBtn.setAttribute('aria-expanded', 'true');
      gsap.set(card, { opacity: 0, scale: 0.95 });
      gsap.set(inners, { y: '150%' });
      gsap.set(sep, { scaleX: 0 });
      gsap.set(pie, { y: 20, opacity: 0 });
      gsap.set(cerrarBtn, { rotation: -180, opacity: 0 });
      gsap.timeline()
        .to(card, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' })
        .to(inners, { y: '0%', duration: 0.8, stagger: 0.1, ease: 'power4.out' }, '-=0.3')
        .to(sep, { scaleX: 1, duration: 0.6, ease: 'power3.out' }, '-=0.6')
        .to(pie, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' }, '-=0.5')
        .to(cerrarBtn, { rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.6');
      cerrarBtn.focus();
    }
    function cerrar() {
      if (!abierto) return;
      abierto = false;
      abrirBtn.setAttribute('aria-expanded', 'false');
      gsap.timeline({ onComplete: () => { card.hidden = true; } })
        .to(inners, { y: '150%', duration: 0.4, stagger: 0.05, ease: 'power2.in' })
        .to([sep, ...pie, cerrarBtn], { opacity: 0, duration: 0.3, ease: 'power1.in' }, '-=0.3')
        .to(card, { opacity: 0, scale: 0.95, duration: 0.4, ease: 'power2.inOut' }, '-=0.2');
      abrirBtn.focus();
    }
    abrirBtn.addEventListener('click', () => (abierto ? cerrar() : abrir()));
    cerrarBtn.addEventListener('click', cerrar);
    $$('a', card).forEach((a) => a.addEventListener('click', cerrar));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
    document.addEventListener('pointerdown', (e) => {
      if (abierto && !card.contains(e.target) && !abrirBtn.contains(e.target)) cerrar();
    });
  }

  /* ------------------------------------------------------------------------
     7 · Tarjetas: al entrar, la imagen se achica y el nombre aparece letra
     por letra (impares desde abajo, pares desde arriba).
     ------------------------------------------------------------------------ */
  function tarjetas() {
    $$('[data-card]').forEach((card) => {
      const art = $('.pl-art', card);
      const nombre = $('[data-card-name]', card);
      const txt = nombre.textContent;
      nombre.setAttribute('aria-hidden', 'true');
      nombre.textContent = '';
      const chars = [...txt].map((ch) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = ch === ' ' ? ' ' : ch;
        nombre.appendChild(s);
        return s;
      });
      const impares = chars.filter((_, i) => i % 2 === 1);
      const pares = chars.filter((_, i) => i % 2 === 0);
      gsap.set(impares, { yPercent: 120 });
      gsap.set(pares, { yPercent: -120 });
      const entrar = () => {
        gsap.to(art, { scale: 1, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
        gsap.to([...impares, ...pares], { yPercent: 0, duration: 0.5, ease: 'power2.out', stagger: 0.04, overwrite: 'auto' });
      };
      const salir = () => {
        gsap.to(art, { scale: 1.12, duration: 0.8, ease: 'power3.out', overwrite: 'auto' });
        gsap.to(impares, { yPercent: 120, duration: 0.3, ease: 'power2.in', stagger: 0.02, overwrite: 'auto' });
        gsap.to(pares, { yPercent: -120, duration: 0.3, ease: 'power2.in', stagger: 0.02, overwrite: 'auto' });
      };
      card.addEventListener('pointerenter', entrar);
      card.addEventListener('pointerleave', salir);
      card.addEventListener('focus', entrar);
      card.addEventListener('blur', salir);
    });
  }

  /* ------------------------------------------------------------------------
     8 · Insignia magnética: se acerca al cursor y crece cuando está cerca.
     ------------------------------------------------------------------------ */
  function magnetico() {
    if (!finePointer || reduce) return;
    $$('[data-magnetic]').forEach((el) => {
      const qx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      const qy = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      const qs = gsap.quickTo(el, 'scale', { duration: 0.6, ease: 'power3.out' });
      addEventListener('pointermove', () => {
        // Centro sin la traslación actual, para no realimentar el movimiento.
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2 - gsap.getProperty(el, 'x');
        const cy = r.top + r.height / 2 - gsap.getProperty(el, 'y');
        const dx = mouse.x - cx, dy = mouse.y - cy;
        const radio = r.width * 1.1;
        const d = Math.hypot(dx, dy);
        if (d < radio) {
          const f = 1 - d / radio;
          qx(dx * 0.35 * (0.5 + f)); qy(dy * 0.35 * (0.5 + f)); qs(1 + f * 0.12);
        } else { qx(0); qy(0); qs(1); }
      }, { passive: true });
    });
  }

  /* ------------------------------------------------------------------------
     9 · Tema: interruptor sol/luna animado y cambio automático por scroll
     al pasar la sección de proyectos (solo en ≥768px).
     ------------------------------------------------------------------------ */
  let pintarInterruptor = () => {};
  function tema() {
    const btn = $('[data-theme-toggle]');
    if (!btn) return;
    const sol = $('.pl-theme__sun', btn), luna = $('.pl-theme__moon', btn);
    const solSvg = $('svg', sol), lunaSvg = $('svg', luna);
    let animando = false;

    pintarInterruptor = (oscuro, animar = true) => {
      btn.setAttribute('aria-pressed', String(oscuro));
      btn.setAttribute('aria-label', oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
      const d = animar && !reduce ? 0.6 : 0;
      const [sale, saleSvg, entra, entraSvg] = oscuro ? [sol, solSvg, luna, lunaSvg] : [luna, lunaSvg, sol, solSvg];
      gsap.to(sale, { backgroundColor: 'rgba(0,0,0,0)', duration: d, ease: 'power3.inOut' });
      gsap.to(saleSvg, { scale: 0, rotation: oscuro ? 360 : 180, duration: d * 0.7, ease: 'power4.in' });
      gsap.to(entra, { backgroundColor: oscuro ? 'rgba(26,26,26,.8)' : 'rgba(230,225,221,.8)', duration: d, ease: 'power3.inOut' });
      gsap.fromTo(entraSvg, { scale: 0, rotation: oscuro ? -180 : -360 }, { scale: 1, rotation: 0, duration: d, delay: d * 0.3, ease: 'elastic.out(1, 0.5)' });
      gsap.to(btn, { backgroundColor: oscuro ? 'rgba(230,225,221,.3)' : 'rgba(26,26,26,.3)', duration: d, ease: 'power3.inOut' });
    };
    gsap.set(lunaSvg, { scale: 0 });

    btn.addEventListener('click', () => {
      if (animando) return;
      animando = true;
      setTimeout(() => { animando = false; }, 700);
      const oscuro = root.dataset.theme !== 'dark';
      root.dataset.theme = oscuro ? 'dark' : 'light';
      pintarInterruptor(oscuro);
    });
  }
  function temaPorScroll() {
    const proyectos = $('.pl-projects');
    if (!proyectos || !window.ScrollTrigger) return;
    const alternar = () => {
      if (innerWidth < 768) return;
      const oscuro = root.dataset.theme !== 'dark';
      root.dataset.theme = oscuro ? 'dark' : 'light';
      pintarInterruptor(oscuro);
    };
    ScrollTrigger.create({ trigger: proyectos, start: 'bottom 60%', onEnter: alternar, onLeaveBack: alternar });
  }

  /* ------------------------------------------------------------------------
     10 · Ondas: 40 líneas en canvas; el rastro del mouse las empuja hacia
     abajo y un resorte las devuelve.
     ------------------------------------------------------------------------ */
  function ondas() {
    const canvas = $('[data-waves]');
    const seccion = $('[data-contact]');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const CFG = { lineas: 40, puntos: 120, radio: 120, fuerza: 25, suavizado: 0.08, vuelta: 0.03, margen: 16, historial: 20 };
    const m = { x: -1e3, y: -1e3 }, objetivo = { x: -1e3, y: -1e3 };
    const hist = [];
    let lineas = [], W = 0, H = 0, dpr = 1;

    function armar() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      const alto = H - CFG.margen * 2, paso = alto / (CFG.lineas + 1);
      lineas = Array.from({ length: CFG.lineas }, (_, i) => {
        const y = CFG.margen + paso * (i + 1);
        return Array.from({ length: CFG.puntos + 1 }, (_, j) => ({ x: CFG.margen + (j / CFG.puntos) * (W - CFG.margen * 2), base: y, y, v: 0 }));
      });
    }
    function paso() {
      m.x += (objetivo.x - m.x) * CFG.suavizado;
      m.y += (objetivo.y - m.y) * CFG.suavizado;
      hist.push({ x: m.x, y: m.y });
      if (hist.length > CFG.historial) hist.shift();
      for (const pts of lineas) for (const p of pts) {
        let desp = 0;
        hist.forEach((h, i) => {
          const d = Math.hypot(h.x - p.x, h.y - p.base);
          if (d < CFG.radio) {
            const f = 1 - d / CFG.radio;
            const edad = (i + 1) / hist.length;           // las posiciones viejas pesan menos
            desp += f * f * f * CFG.fuerza * edad * edad;
          }
        });
        p.v = (p.v + (p.base + desp - p.y) * 0.15) * 0.75;
        p.y += p.v;
        if (!desp) p.y += (p.base - p.y) * CFG.vuelta;
      }
    }
    function dibujar() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = getComputedStyle(root).getPropertyValue('--line').trim() || 'rgba(230,225,221,.12)';
      ctx.lineWidth = 1;
      for (const pts of lineas) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
    }
    armar();
    new ResizeObserver(armar).observe(canvas);
    seccion.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      objetivo.x = e.clientX - r.left; objetivo.y = e.clientY - r.top;
    });
    seccion.addEventListener('pointerleave', () => { objetivo.x = objetivo.y = -1e3; });

    let visible = false, raf = 0;
    const loop = () => { if (!visible) { raf = 0; return; } paso(); dibujar(); raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) loop(); }).observe(canvas);
  }

  /* ------------------------------------------------------------------------
     11 · Puerta: rayos que giran dentro del marco + cuenta regresiva a las 16:20.
     ------------------------------------------------------------------------ */
  function puerta() {
    const canvas = $('[data-rays]');
    const reloj = $('[data-countdown]');
    if (reloj) {
      const tic = () => {
        const ahora = new Date(), meta = new Date(ahora);
        meta.setHours(16, 20, 0, 0);
        if (meta <= ahora) meta.setDate(meta.getDate() + 1);
        const s = Math.floor((meta - ahora) / 1000);
        const p = (n) => String(n).padStart(2, '0');
        reloj.textContent = `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
      };
      tic(); setInterval(tic, 1000);
    }
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, RAYOS = 18;
    // Un rayo: pétalo largo con borde ondulado (forma propia).
    const rayo = new Path2D('M0,0 C20,-30 60,-24 90,-10 C120,4 150,-14 190,-6 C220,0 240,-4 260,0 C240,4 220,0 190,6 C150,14 120,-4 90,10 C60,24 20,30 0,0Z');
    let ang = 0, visible = false, raf = 0;
    const dibujar = () => {
      if (!visible) { raf = 0; return; }
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(ang);
      ctx.fillStyle = 'rgba(161, 153, 255, .5)';
      for (let i = 0; i < RAYOS; i++) { ctx.rotate((Math.PI * 2) / RAYOS); ctx.fill(rayo); }
      ctx.restore();
      if (!reduce) ang += 0.005;
      raf = requestAnimationFrame(dibujar);
    };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) dibujar(); }).observe(canvas);
  }

  /* ------------------------------------------------------------------------
     Extra · Sobre: las palabras se encienden con el scroll (scrub).
     ------------------------------------------------------------------------ */
  function palabras() {
    const el = $('[data-words]');
    if (!el || reduce || !window.ScrollTrigger) return;
    const ws = el.textContent.split(/\s+/);
    el.setAttribute('aria-label', el.textContent);
    el.innerHTML = ws.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    gsap.fromTo($$('.w', el), { opacity: 0.15 }, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  }

  // Arranque
  intercambioLetras();
  caritaLiquida();
  cursor();
  menu();
  tarjetas();
  magnetico();
  tema();
  temaPorScroll();
  ondas();
  puerta();
  palabras();
  loader();
})();
