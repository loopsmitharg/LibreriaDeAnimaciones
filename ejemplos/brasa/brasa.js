/* ==========================================================================
   Brasa · animaciones propias (las de base vienen de cafeteria-ejemplo/shared/cafe.js)
     .bz-papel       papel de envoltorio a cuadros entre páginas
     [data-imantado] botones que se acercan al puntero
     [data-cinta]    cinta que se inclina y acelera con la velocidad del scroll
     [data-explota]  hero: la hamburguesa se despliega en capas cuando el mouse se acerca
     [data-salsa]    hero: el puntero deja un trazo de salsa que gotea (clic: cambia de salsa)
     [data-armador]  escena sticky: caen los ingredientes y se completa el ticket
     [data-calor]    tarjetas: un halo de calor sigue al puntero
     [data-parrilla] locales: fichas de ingredientes con física (arrastrar y tirar)
   Con prefers-reduced-motion o sin GSAP todo queda quieto y completo.
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const plata = (n) => '$' + n.toLocaleString('es-AR');
  if (reduce) root.classList.remove('bz-llegando');

  // Corre fn(dt) en cada frame solo mientras el elemento está en pantalla.
  const enPantalla = (el, fn) => {
    let raf = 0, last = 0;
    const loop = (t) => { const dt = Math.min(.05, (t - (last || t)) / 1000); last = t; fn(dt, t); raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !raf) { last = 0; raf = requestAnimationFrame(loop); }
      else if (!en.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(el);
  };

  /* ---------- Papel de envoltorio entre páginas ---------- */
  const papel = $('.bz-papel');
  const PAGINAS = { 'index.html': 'Inicio', 'carta.html': 'La carta', 'locales.html': 'Locales' };
  const rotular = (archivo) => { if (papel) papel.querySelector('span').textContent = PAGINAS[archivo || 'index.html'] || 'Brasa'; };
  if (papel && !reduce) {
    rotular(location.pathname.split('/').pop());
    if (root.classList.contains('bz-llegando')) {
      sessionStorage.removeItem('bz-papel');
      requestAnimationFrame(() => requestAnimationFrame(() => { papel.classList.add('is-saliendo'); root.classList.remove('bz-llegando'); }));
      papel.addEventListener('transitionend', () => papel.classList.remove('is-saliendo'), { once: true });
    }
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname || !/\.html$|\/$/.test(url.pathname) || !url.pathname.includes('/brasa/')) return;
      e.preventDefault();
      rotular(url.pathname.split('/').pop());
      papel.classList.add('is-entrando');
      sessionStorage.setItem('bz-papel', '1');
      setTimeout(() => { location.href = url.href; }, 620);
    });
    addEventListener('pageshow', (e) => { if (e.persisted) papel.classList.remove('is-entrando'); });
  }

  /* ---------- Botones imantados ---------- */
  if (mouse && !reduce) $$('[data-imantado]').forEach((el) => {
    el.style.transition = 'translate .45s cubic-bezier(.22,1,.36,1), box-shadow .25s ease, background-color .25s ease';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.translate = `${((e.clientX - r.left - r.width / 2) * .3).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * .45).toFixed(1)}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  });

  /* ---------- Calor que sigue al puntero ---------- */
  if (mouse) $$('[data-calor]').forEach((card) => {
    const img = $('.cf-card__img', card) || card;
    card.addEventListener('pointermove', (e) => {
      const r = img.getBoundingClientRect();
      img.style.setProperty('--cx', `${e.clientX - r.left}px`);
      img.style.setProperty('--cy', `${e.clientY - r.top}px`);
    });
  });

  /* ---------- Cinta: velocidad e inclinación según el scroll ---------- */
  const cinta = $('[data-cinta]');
  if (cinta && !reduce) {
    const riel = $('.bz-cinta__riel', cinta);
    cinta.classList.add('is-js');
    let x = 0, vel = 0, ultimoY = scrollY;
    enPantalla(cinta, (dt) => {
      const dy = scrollY - ultimoY; ultimoY = scrollY;
      vel += (clamp(dy / Math.max(dt, .001) / 1000, -6, 6) - vel) * .12;   // suavizado
      // Período = distancia real entre la primera pieza y su copia (incluye el gap).
      const hijos = riel.children, mitad = hijos[hijos.length / 2].offsetLeft - hijos[0].offsetLeft;
      x -= (70 + Math.abs(vel) * 420) * dt * (vel < -0.05 ? -1 : 1);
      if (x <= -mitad) x += mitad; if (x > 0) x -= mitad;
      riel.style.transform = `translateX(${x.toFixed(1)}px) skewX(${(-vel * 4).toFixed(2)}deg)`;
    });
  }

  /* ---------- Hero: hamburguesa que se despliega ---------- */
  const hero = $('[data-explota]');
  if (hero) {
    const caja = $('.bz-hero__burger', hero);
    const svg = $('.bz-pila', caja);
    const capas = $$('.bz-capa', svg);
    const lista = $('.bz-callouts', caja);
    const VB = svg.viewBox.baseVal;
    // Etiquetas: una por capa con data-etiqueta, alternando lados.
    const etiquetas = capas.map((g, i) => {
      if (!g.dataset.etiqueta) return null;
      const li = document.createElement('li');
      li.className = i % 2 ? 'is-der' : 'is-izq';
      li.innerHTML = `<span>${g.dataset.etiqueta}</span>`;
      lista.appendChild(li);
      return li;
    });
    const c = (capas.length - 1) / 2;
    let abre = 0, meta = 0, px = 0, py = 0, tx = 0, ty = 0, tocado = false;
    const pintar = (t) => {
      abre += (meta - abre) * .09; px += (tx - px) * .08; py += (ty - py) * .08;
      const flota = reduce ? 0 : Math.sin(t / 900) * 3;
      svg.style.transform = `rotateY(${(px * 14).toFixed(2)}deg) rotateX(${(-py * 10).toFixed(2)}deg)`;
      capas.forEach((g, i) => {
        const k = i - c;
        const y = -k * 20 * abre + flota * (i / capas.length);
        const x = px * k * 5 * abre;
        const rot = px * k * 1.1 * abre;
        g.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
        const li = etiquetas[i];
        if (li) {
          const bb = g.getBBox();
          const centro = bb.y + bb.height / 2 + y;
          li.style.top = `${((centro - VB.y) / VB.height * 100).toFixed(2)}%`;
          li.style[li.classList.contains('is-der') ? 'left' : 'right'] = `${(86 + (i % 3) * 3)}%`;
          li.style.translate = '0 -50%';
          li.classList.toggle('is-on', abre > .55);
        }
      });
    };
    if (reduce) { pintar(0); }
    else {
      enPantalla(hero, (dt, t) => pintar(t));
      if (mouse) {
        hero.addEventListener('pointermove', (e) => {
          const r = caja.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          tx = clamp((e.clientX - cx) / (r.width / 2), -1.2, 1.2);
          ty = clamp((e.clientY - cy) / (r.height / 2), -1.2, 1.2);
          // Más cerca = más abierta. Dentro de la caja, abierta del todo.
          const d = Math.hypot(tx, ty);
          meta = clamp(1.6 - d, 0, 1);
        });
        hero.addEventListener('pointerleave', () => { meta = 0; tx = ty = 0; });
      } else {
        caja.addEventListener('click', () => { tocado = !tocado; meta = tocado ? 1 : 0; });
      }
    }
  }

  /* ---------- Hero: trazo de salsa ---------- */
  const lienzo = $('[data-salsa]');
  if (lienzo && mouse && !reduce) {
    const ctx = lienzo.getContext('2d');
    const sec = lienzo.parentElement;
    const nombre = $('[data-salsa-nombre]');
    const SALSAS = [
      { n: 'Ketchup', c: '#d7261e', b: '#ff6a52' },
      { n: 'Mostaza', c: '#f2a900', b: '#ffe07a' },
      { n: 'Barbacoa', c: '#5a2410', b: '#a65430' },
    ];
    let salsa = 0, dpr = 1, puntos = [], gotas = [], trazo = 0, ant = null, raf = 0;
    const medir = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      lienzo.width = sec.clientWidth * dpr; lienzo.height = sec.clientHeight * dpr;
    };
    medir(); addEventListener('resize', medir);
    const VIDA = 1500;
    sec.addEventListener('pointermove', (e) => {
      const r = lienzo.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now(), s: trazo, c: salsa };
      if (ant && ant.s === trazo) {
        const v = Math.hypot(p.x - ant.x, p.y - ant.y);
        p.w = clamp(22 - v * .35, 7, 20);          // rápido = trazo fino, lento = grueso
        // Donde el trazo es grueso, a veces se forma una gota que chorrea.
        if (p.w > 13 && Math.random() < .07) gotas.push({ x: p.x, y: p.y, l: 0, v: 8 + Math.random() * 18, w: p.w * .45, t: p.t, c: salsa });
      } else p.w = 12;
      puntos.push(p); ant = p;
      if (!raf) raf = requestAnimationFrame(dibujar);
    });
    sec.addEventListener('pointerleave', () => { trazo++; ant = null; });
    sec.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      salsa = (salsa + 1) % SALSAS.length; trazo++; ant = null;
      if (nombre) nombre.textContent = SALSAS[salsa].n;
    });
    function dibujar() {
      const ahora = performance.now();
      puntos = puntos.filter((p) => ahora - p.t < VIDA);
      gotas = gotas.filter((g) => ahora - g.t < VIDA + 600);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      ctx.lineCap = ctx.lineJoin = 'round';
      // Dos pasadas: la salsa y su brillo, más fino y corrido hacia arriba.
      [0, 1].forEach((brillo) => {
        for (let i = 1; i < puntos.length; i++) {
          const a = puntos[i - 1], b = puntos[i];
          if (a.s !== b.s) continue;
          const vida = 1 - (ahora - b.t) / VIDA;
          const S = SALSAS[b.c];
          ctx.strokeStyle = brillo ? S.b : S.c;
          ctx.globalAlpha = brillo ? vida * .6 : Math.min(1, vida * 1.6);
          ctx.lineWidth = brillo ? b.w * .22 * vida : b.w * (.35 + vida * .65);
          ctx.beginPath();
          const o = brillo ? -b.w * .22 : 0;
          ctx.moveTo(a.x - o * .3, a.y + o); ctx.lineTo(b.x - o * .3, b.y + o); ctx.stroke();
        }
      });
      // Gotas: caen frenándose y se secan.
      gotas.forEach((g) => {
        const edad = (ahora - g.t) / 1000;
        g.l = g.v * edad * (2.2 - Math.min(1.6, edad));
        const vida = 1 - (ahora - g.t) / (VIDA + 600);
        ctx.globalAlpha = Math.min(1, vida * 1.5);
        ctx.strokeStyle = ctx.fillStyle = SALSAS[g.c].c;
        ctx.lineWidth = g.w;
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x, g.y + g.l); ctx.stroke();
        ctx.beginPath(); ctx.arc(g.x, g.y + g.l, g.w * .75, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      raf = puntos.length || gotas.length ? requestAnimationFrame(dibujar) : 0;
      if (!raf) ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    }
  }

  /* ---------- El armador ---------- */
  const armador = $('[data-armador]');
  const iniciarArmador = () => {
    if (!armador) return;
    if (!window.gsap || !window.ScrollTrigger || reduce) { root.classList.remove('bz-js'); return; }
    gsap.registerPlugin(ScrollTrigger);
    const pila = $('.bz-armador__escena .bz-pila', armador);
    const cae = $$('.bz-cae', armador);
    const lineas = $$('[data-linea]', armador);
    const datos = lineas.map((li) => ({
      nombre: $('span', li).textContent,
      precio: Number($('b', li).textContent.replace(/\D/g, '')),
      kcal: Number($('small', li).textContent.replace(/\D/g, '')),
    }));
    const estado = $('[data-estado]', armador), total = $('[data-total]', armador);
    const kcal = $('[data-kcal]', armador), cuenta = $('[data-cuenta]', armador), barra = $('[data-barra]', armador);
    const ATERRIZA = .78;   // momento (dentro de cada paso de 1 s) en que la capa toca la pila

    gsap.set(pila, { transformOrigin: '50% 100%' });
    // Caída y giro en el <g>; el estirado (queso, salsa) y el temblor del palillo en su <use>,
    // así cada uno tiene su propio origen y no se pisan.
    gsap.set(cae, { transformOrigin: '50% 100%' });
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    cae.forEach((g, i) => {
      const pesado = g.hasAttribute('data-peso');
      const giro = (i % 2 ? 1 : -1) * (8 + (i * 7) % 18);
      const hijo = g.firstElementChild;
      if (g.hasAttribute('data-clava')) {
        gsap.set(hijo, { transformOrigin: '50% 100%' });
        tl.fromTo(g, { y: -700 }, { y: 0, duration: ATERRIZA, ease: 'power3.in' }, i)
          .fromTo(hijo, { rotation: 9 }, { rotation: 0, duration: .5, ease: 'elastic.out(1.2, .35)' }, i + ATERRIZA);
      } else {
        tl.fromTo(g, { y: -900, x: giro * 3, rotation: giro }, { y: 0, x: 0, rotation: 0, duration: ATERRIZA, ease: pesado ? 'bounce.out' : 'back.out(1.5)' }, i);
      }
      // El cheddar se estira al derretirse sobre la carne.
      if (g.hasAttribute('data-derrite') || g.hasAttribute('data-chorrea')) {
        gsap.set(hijo, { transformOrigin: '50% 0%' });
        tl.fromTo(hijo, { scaleY: g.hasAttribute('data-chorrea') ? .3 : .55 }, { scaleY: 1, duration: .35, ease: 'power2.out' }, i + ATERRIZA - .1);
      }
      // Lo pesado aplasta la pila un instante.
      if (pesado) tl.to(pila, { scaleY: .955, scaleX: 1.02, duration: .07 }, i + ATERRIZA - .12).to(pila, { scaleY: 1, scaleX: 1, duration: .25, ease: 'back.out(3)' }, i + ATERRIZA - .05);
    });
    tl.to({}, { duration: .7 });   // la hamburguesa lista se queda un rato en pantalla

    let anterior = -1;
    const actualizar = () => {
      const t = tl.time();
      let n = 0;
      while (n < lineas.length && t >= n + ATERRIZA) n++;
      const lista = t >= cae.length - 1 + ATERRIZA;
      const paso = Math.min(cae.length - 1, Math.floor(t));
      if (n !== anterior) {
        lineas.forEach((li, i) => {
          li.classList.toggle('is-on', i < n);
          li.classList.toggle('is-nueva', i === n - 1 && !lista);
          li.classList.toggle('is-ultima', i === Math.max(0, n - 1));
        });
        const suma = datos.slice(0, n).reduce((a, d) => ({ p: a.p + d.precio, k: a.k + d.kcal }), { p: 0, k: 0 });
        total.textContent = plata(suma.p);
        kcal.textContent = suma.k.toLocaleString('es-AR');
        cuenta.textContent = n;
        barra.style.transform = `scaleX(${n / lineas.length})`;
        anterior = n;
      }
      armador.classList.toggle('is-lista', lista);
      if (lista) estado.textContent = '¡Lista para salir!';
      else if (t <= 0.02) estado.textContent = 'Esperando el pan…';
      else estado.textContent = `${t - paso < ATERRIZA ? 'Cae' : 'Listo'}: ${paso < datos.length ? datos[paso].nombre.toLowerCase() : 'palillo'}`;
    };
    ScrollTrigger.create({ trigger: armador, start: 'top top', end: 'bottom bottom', scrub: .5, animation: tl, onUpdate: actualizar, onRefresh: actualizar });
    tl.eventCallback('onUpdate', actualizar);
    actualizar();
    // Las medidas cambian cuando cargan las fuentes (Anton) y se parten los párrafos: se vuelve a medir.
    setTimeout(() => ScrollTrigger.refresh(), 120);
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  };
  if (document.readyState === 'complete') iniciarArmador(); else addEventListener('load', iniciarArmador);

  /* ---------- Parrilla: fichas con física ---------- */
  const parrilla = $('[data-parrilla]');
  if (parrilla && !reduce) {
    const fichas = $$('.bz-ficha', parrilla);
    parrilla.classList.add('is-viva');
    let W = 0, H = 0, escala = 1;
    const medir = () => { W = parrilla.clientWidth; H = parrilla.clientHeight; escala = clamp(W / 1100, .62, 1); };
    medir(); addEventListener('resize', medir);
    const cuerpos = fichas.map((el, i) => {
      const r = (Number(el.dataset.r) || 56) * escala;
      el.style.width = el.style.height = `${r * 2}px`;
      return { el, r, x: W * (.15 + .7 * ((i * .37) % 1)), y: -r - i * 90, vx: (Math.random() - .5) * 200, vy: 0, a: 0, va: 0, agarrada: false };
    });
    let soltadas = false;
    const G = 2200, REBOTE = .42, ROCE = .985;
    // Puntero: arrastrar una ficha, o empujarlas al pasar rápido (como una espátula).
    let ptr = null;
    parrilla.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.bz-ficha'); if (!el) return;
      const b = cuerpos.find((c) => c.el === el); const r = parrilla.getBoundingClientRect();
      ptr = { b, id: e.pointerId, ox: e.clientX - r.left - b.x, oy: e.clientY - r.top - b.y, hist: [] };
      b.agarrada = true; el.classList.add('is-agarrada'); el.setPointerCapture(e.pointerId);
    });
    addEventListener('pointermove', (e) => {
      const r = parrilla.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (ptr && e.pointerId === ptr.id) {
        ptr.b.x = x - ptr.ox; ptr.b.y = y - ptr.oy;
        ptr.hist.push({ x: ptr.b.x, y: ptr.b.y, t: performance.now() });
        if (ptr.hist.length > 5) ptr.hist.shift();
      } else if (mouse && x > 0 && y > 0 && x < W && y < H) {
        const v = { x: e.movementX || 0, y: e.movementY || 0 };
        cuerpos.forEach((b) => {
          const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy);
          if (d < b.r + 26 && d > 0 && Math.hypot(v.x, v.y) > 2) { b.vx += v.x * 38; b.vy += v.y * 38 - 120; }
        });
      }
    });
    const soltar = (e) => {
      if (!ptr || e.pointerId !== ptr.id) return;
      const h = ptr.hist, b = ptr.b;
      if (h.length > 1) { const a = h[0], z = h[h.length - 1], dt = Math.max(16, z.t - a.t) / 1000; b.vx = (z.x - a.x) / dt; b.vy = (z.y - a.y) / dt; }
      b.agarrada = false; b.el.classList.remove('is-agarrada'); ptr = null;
    };
    addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
    new IntersectionObserver(([en]) => { if (en.isIntersecting) soltadas = true; }, { threshold: .3 }).observe(parrilla);

    enPantalla(parrilla, (dt) => {
      if (!soltadas) return;
      const PASOS = 4, h = dt / PASOS;
      for (let s = 0; s < PASOS; s++) {
        cuerpos.forEach((b) => {
          if (b.agarrada) { b.vx = b.vy = 0; return; }
          b.vy += G * h; b.x += b.vx * h; b.y += b.vy * h;
          if (b.y + b.r > H) { b.y = H - b.r; b.vy *= -REBOTE; b.vx *= ROCE; if (Math.abs(b.vy) < 40) b.vy = 0; }
          if (b.x - b.r < 0) { b.x = b.r; b.vx *= -REBOTE; }
          if (b.x + b.r > W) { b.x = W - b.r; b.vx *= -REBOTE; }
          if (b.y - b.r < -400) { b.y = -400 + b.r; b.vy = Math.abs(b.vy) * .3; }
        });
        // Choques entre fichas (círculos): separación + impulso.
        for (let i = 0; i < cuerpos.length; i++) for (let j = i + 1; j < cuerpos.length; j++) {
          const a = cuerpos[i], b = cuerpos[j];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
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
      cuerpos.forEach((b) => {
        // Se inclinan según la velocidad y vuelven a quedar derechas (las ilustraciones son de costado).
        const meta = clamp(b.vx / 28, -32, 32);
        b.va += ((meta - b.a) * 90 - b.va * 9) * dt;   // resorte amortiguado
        b.a += b.va * dt;
        b.el.style.transform = `translate(${(b.x - b.r).toFixed(1)}px, ${(b.y - b.r).toFixed(1)}px) rotate(${b.a.toFixed(1)}deg)`;
      });
    });
  }
})();
