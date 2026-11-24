/* ==========================================================================
   Granel · animaciones propias de la página
   Las de base vienen de la librería (cafe.js, scroll-horizontal, menu-carta-pedidos).
   Las que siguen adaptan piezas de ejemplos/brasa:
     [data-imantado]  botones que se acercan al puntero
     [data-estante]   los frascos del hero se inclinan y se separan con el puntero
     [data-pila]      frutos secos con física: se arrastran, se tiran y se empujan
     [data-cinta]     cinta que se inclina y acelera con la velocidad del scroll
     [data-mix]       escena sticky: cae cada ingrediente, el frasco se llena,
                      la balanza sube y la etiqueta se completa
   Con prefers-reduced-motion o sin GSAP todo queda quieto y completo.
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const plata = (n) => '$' + Math.round(n).toLocaleString('es-AR');

  // Corre fn(dt) en cada frame solo mientras el elemento está en pantalla.
  const enPantalla = (el, fn) => {
    let raf = 0, last = 0;
    const loop = (t) => { const dt = Math.min(.05, (t - (last || t)) / 1000); last = t; fn(dt, t); raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !raf) { last = 0; raf = requestAnimationFrame(loop); }
      else if (!en.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(el);
  };

  /* ---------- Anclas con desplazamiento suave (sin scroll-behavior en CSS) ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const destino = document.querySelector(a.getAttribute('href'));
    if (!destino) return;
    e.preventDefault();
    const nav = document.getElementById('site-header');
    // El pin de los pasillos agrega su espaciador: se mide la posición en el momento.
    const y = destino.getBoundingClientRect().top + scrollY - (nav ? nav.offsetHeight : 0) + 1;
    scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', a.getAttribute('href'));
  });

  /* ---------- Botones imantados ---------- */
  if (mouse && !reduce) $$('[data-imantado]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.translate = `${((e.clientX - r.left - r.width / 2) * .3).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * .45).toFixed(1)}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  });

  /* ---------- Estante: frascos que siguen al puntero ---------- */
  const estante = $('[data-estante]');
  if (estante && mouse && !reduce) {
    const frascos = $$('.gr-frasco', estante);
    const hero = estante.closest('section');
    hero.addEventListener('pointermove', (e) => {
      const r = estante.getBoundingClientRect();
      const x = clamp((e.clientX - r.left - r.width / 2) / r.width, -1, 1);
      const y = clamp((e.clientY - r.top - r.height / 2) / r.height, -1, 1);
      frascos.forEach((f, i) => {
        const k = i - 1;   // el del medio casi no se mueve
        f.style.transform = `translate(${(x * 10 + k * Math.abs(x) * 14).toFixed(1)}px, ${(y * 6).toFixed(1)}px) rotateY(${(x * 14).toFixed(1)}deg) rotate(${(x * (2 + k)).toFixed(1)}deg)`;
      });
    });
    hero.addEventListener('pointerleave', () => frascos.forEach((f) => { f.style.transform = ''; }));
  }

  /* ---------- Cinta: velocidad e inclinación según el scroll ---------- */
  const cinta = $('[data-cinta]');
  if (cinta && !reduce) {
    const riel = cinta.firstElementChild;
    cinta.classList.add('is-js');
    let x = 0, vel = 0, ultimoY = scrollY;
    enPantalla(cinta, (dt) => {
      const dy = scrollY - ultimoY; ultimoY = scrollY;
      vel += (clamp(dy / Math.max(dt, .001) / 1000, -6, 6) - vel) * .12;
      // Período = distancia real entre la primera pieza y su copia (incluye el gap).
      const hijos = riel.children, periodo = hijos[hijos.length / 2].offsetLeft - hijos[0].offsetLeft;
      x -= (60 + Math.abs(vel) * 380) * dt * (vel < -0.05 ? -1 : 1);
      if (x <= -periodo) x += periodo; if (x > 0) x -= periodo;
      riel.style.transform = `translateX(${x.toFixed(1)}px) skewX(${(-vel * 4).toFixed(2)}deg)`;
    });
  }

  /* ---------- Pila de frutos secos con física (de la parrilla de Brasa) ---------- */
  const pila = $('[data-pila]');
  if (pila && !reduce) {
    pila.classList.add('is-viva');
    let W = 0, H = 0, escala = 1;
    const medir = () => { W = pila.clientWidth; H = pila.clientHeight; escala = clamp(W / 1280, .7, 1.15); };
    medir(); addEventListener('resize', medir);
    const cuerpos = $$('.gr-suelto', pila).map((el, i) => {
      const r = (Number(el.dataset.r) || 28) * escala;
      el.style.width = el.style.height = `${r * 2}px`;
      return { el, r, x: W * (.45 + .53 * ((i * .618) % 1)), y: -H - i * 26, vx: (Math.random() - .5) * 160, vy: 0, a: Math.random() * 360, va: 0, agarrada: false };
    });
    const G = 2400, REBOTE = .35, ROCE = .96;
    let ptr = null;
    pila.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.gr-suelto'); if (!el) return;
      const b = cuerpos.find((c) => c.el === el); const r = pila.getBoundingClientRect();
      ptr = { b, id: e.pointerId, ox: e.clientX - r.left - b.x, oy: e.clientY - r.top - b.y, hist: [] };
      b.agarrada = true; el.setPointerCapture(e.pointerId);
    });
    addEventListener('pointermove', (e) => {
      const r = pila.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (ptr && e.pointerId === ptr.id) {
        ptr.b.x = x - ptr.ox; ptr.b.y = y - ptr.oy;
        ptr.hist.push({ x: ptr.b.x, y: ptr.b.y, t: performance.now() });
        if (ptr.hist.length > 5) ptr.hist.shift();
      } else if (mouse && x > 0 && x < W && y > -60 && y < H) {
        const vx = e.movementX || 0, vy = e.movementY || 0;
        if (Math.hypot(vx, vy) > 2) cuerpos.forEach((b) => {
          const d = Math.hypot(b.x - x, b.y - y);
          if (d < b.r + 18) { b.vx += vx * 30; b.vy += vy * 30 - 160; }
        });
      }
    });
    const soltar = (e) => {
      if (!ptr || e.pointerId !== ptr.id) return;
      const h = ptr.hist, b = ptr.b;
      if (h.length > 1) { const a = h[0], z = h[h.length - 1], dt = Math.max(16, z.t - a.t) / 1000; b.vx = (z.x - a.x) / dt; b.vy = (z.y - a.y) / dt; }
      b.agarrada = false; ptr = null;
    };
    addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);

    enPantalla(pila, (dt) => {
      const PASOS = 4, h = dt / PASOS;
      for (let s = 0; s < PASOS; s++) {
        cuerpos.forEach((b) => {
          if (b.agarrada) { b.vx = b.vy = 0; return; }
          b.vy += G * h; b.x += b.vx * h; b.y += b.vy * h;
          if (b.y + b.r > H) { b.y = H - b.r; b.vy *= -REBOTE; b.vx *= ROCE; if (Math.abs(b.vy) < 40) b.vy = 0; }
          if (b.x - b.r < 0) { b.x = b.r; b.vx *= -REBOTE; }
          if (b.x + b.r > W) { b.x = W - b.r; b.vx *= -REBOTE; }
        });
        for (let i = 0; i < cuerpos.length; i++) for (let j = i + 1; j < cuerpos.length; j++) {
          const a = cuerpos[i], b = cuerpos[j];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.r + b.r) * .92;
          if (d >= min || d === 0) continue;
          const nx = dx / d, ny = dy / d, sol = min - d;
          const ma = a.agarrada ? 0 : 1, mb = b.agarrada ? 0 : 1, m = ma + mb || 1;
          a.x -= nx * sol * ma / m; a.y -= ny * sol * ma / m;
          b.x += nx * sol * mb / m; b.y += ny * sol * mb / m;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) {
            const imp = -(1 + REBOTE) * rv / m;
            a.vx -= imp * nx * ma; a.vy -= imp * ny * ma;
            b.vx += imp * nx * mb; b.vy += imp * ny * mb;
          }
        }
      }
      // Ruedan: los frutos secos se ven bien en cualquier ángulo.
      cuerpos.forEach((b) => {
        if (!b.agarrada) b.va = b.va * .9 + (b.vx / b.r * 57.3) * .1;
        b.a += b.va * dt;
        b.el.style.transform = `translate(${(b.x - b.r).toFixed(1)}px, ${(b.y - b.r).toFixed(1)}px) rotate(${b.a.toFixed(1)}deg)`;
      });
    });
  }

  /* ---------- El mix: frasco que se llena con el scroll ---------- */
  const mix = $('[data-mix]');
  const iniciarMix = () => {
    if (!mix) return;
    if (!window.gsap || !window.ScrollTrigger || reduce) { root.classList.remove('gr-js'); return; }
    gsap.registerPlugin(ScrollTrigger);
    const capas = $$('.gr-capa', mix), chorros = $$('.gr-chorro', mix), lineas = $$('[data-linea]', mix);
    const tapa = $('.gr-mix__tapa', mix), aguja = $('.gr-balanza__aguja', mix);
    const estado = $('[data-estado]', mix), total = $('[data-total]', mix), gramos = $('[data-gramos]', mix);
    const datos = lineas.map((li) => ({ nombre: $('span', li).textContent, g: +li.dataset.g, kg: +li.dataset.kg }));
    const GRAMOS = datos.reduce((a, d) => a + d.g, 0);
    const LLENA = .15, DURA = .6, FIN = .75;   // dentro de cada paso de 1 s: empieza a llenar, cuánto tarda, termina el chorro

    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    capas.forEach((rect, i) => {
      // Se anima con attr (y, height) del <rect>: sin transform-origin que se pisen.
      const y = +rect.getAttribute('y'), h = +rect.getAttribute('height'), fondo = y + h, s = i + .1;
      const chorro = chorros[i];
      tl.fromTo(chorro, { attr: { y: -40, height: 0 } }, { attr: { height: fondo + 40 }, duration: .2, ease: 'power1.in' }, s)
        .fromTo(rect, { attr: { y: fondo, height: 0 } }, { attr: { y, height: h }, duration: DURA }, s + LLENA)
        .to(chorro, { attr: { y, height: 0 }, duration: .2, ease: 'power1.in' }, s + FIN - .2);
    });
    const n = capas.length;
    tl.fromTo(tapa, { y: -240, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: 'bounce.out' }, n + .1)
      .to({}, { duration: .6 });

    let anterior = -1;
    const actualizar = () => {
      const t = tl.time();
      // Gramos continuos: cada capa aporta según cuánto se llenó.
      const g = datos.reduce((a, d, i) => a + d.g * clamp((t - (i + .1 + LLENA)) / DURA, 0, 1), 0);
      aguja.setAttribute('transform', `rotate(${(-90 + 180 * g / GRAMOS).toFixed(2)} 100 100)`);
      gramos.textContent = Math.round(g);
      let k = 0;
      while (k < n && t >= k + .1 + FIN) k++;
      const listo = t >= n + .6;
      if (k !== anterior) {
        lineas.forEach((li, i) => {
          li.classList.toggle('is-on', i < k);
          li.classList.toggle('is-nueva', i === k - 1);
          li.classList.toggle('is-ultima', i === Math.max(0, k - 1));
        });
        total.textContent = plata(datos.slice(0, k).reduce((a, d) => a + d.g * d.kg / 1000, 0));
        anterior = k;
      }
      mix.classList.toggle('is-listo', listo);
      const paso = Math.min(n - 1, Math.floor(t));
      if (listo) estado.textContent = 'Listo para llevar';
      else if (t < .12) estado.textContent = 'Frasco vacío';
      else if (k === n) estado.textContent = 'Cerrando el frasco';
      else estado.textContent = `Pesando: ${datos[paso].nombre.toLowerCase()}`;
    };
    ScrollTrigger.create({ trigger: mix, start: 'top top', end: 'bottom bottom', scrub: .5, animation: tl, onUpdate: actualizar, onRefresh: actualizar });
    tl.eventCallback('onUpdate', actualizar);
    actualizar();
    // Las medidas cambian cuando cargan las fuentes y se parten los párrafos: se vuelve a medir.
    setTimeout(() => ScrollTrigger.refresh(), 120);
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  };
  if (document.readyState === 'complete') iniciarMix(); else addEventListener('load', iniciarMix);
})();
