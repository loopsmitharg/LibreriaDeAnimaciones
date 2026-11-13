/* ==========================================================================
   Galería mundo arrastrable
   Inspirado en unseen.co/world. Reconstrucción propia: el original es Three.js;
   acá es CSS 3D (perspective + translate3d) + GSAP, con cada foto como <button>.

   - Grilla infinita: posición = base − cámara, envuelta con módulo al tamaño
     del mundo. Cada foto tiene un desvío al azar en x, y y z (profundidad).
   - Cámara con lerp + inercia; la velocidad inclina y aleja el plano.
   - Intro: esfera de alambre (canvas 2D) que crece hasta llenar la pantalla.
   - Detalle: FLIP desde la foto hasta el centro.
   ========================================================================== */
(() => {
  const world = document.querySelector('[data-world]');
  if (!world) return;
  const plane = world.querySelector('[data-plane]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!window.gsap;

  /* ------------------------------------------------------------------------
     Fotos. Cambiá `fondo` por `src: 'ruta/foto.jpg'` para usar imágenes reales.
     ratio = ancho / alto.
     ------------------------------------------------------------------------ */
  const FOTOS = [
    { titulo: 'Nébula', tipo: 'Campaña', anio: 2026, ratio: 0.8, fondo: 'radial-gradient(circle at 60% 40%, #ffb3c7 0 8%, transparent 30%), radial-gradient(ellipse at 30% 70%, #6a4cff, transparent 60%), linear-gradient(160deg, #1a0f3d, #3d1a5e)' },
    { titulo: 'Arena', tipo: 'Editorial', anio: 2025, ratio: 1.4, fondo: 'linear-gradient(180deg, #f4d9b0 0 55%, #d9a066 55% 70%, #8c5a3c 70%)' },
    { titulo: 'Cromo', tipo: '3D', anio: 2026, ratio: 1, fondo: 'radial-gradient(circle at 40% 35%, #fff 0 6%, #c9d6df 14%, #5c6b78 40%, #1d242b 70%)' },
    { titulo: 'Verde agua', tipo: 'Identidad', anio: 2024, ratio: 0.75, fondo: 'linear-gradient(135deg, #0f766e, #2dd4bf 60%, #ccfbf1)' },
    { titulo: 'Nocturno', tipo: 'Film', anio: 2025, ratio: 1.6, fondo: 'radial-gradient(circle at 75% 25%, #fde68a 0 3%, transparent 4%), linear-gradient(180deg, #0b1026, #1e3a8a 70%, #0b1026)' },
    { titulo: 'Coral', tipo: 'Packaging', anio: 2026, ratio: 0.85, fondo: 'radial-gradient(ellipse 60% 40% at 50% 60%, #ff7a59 0 50%, transparent 52%), linear-gradient(#ffe8df, #ffc8b4)' },
    { titulo: 'Rejilla', tipo: 'Web', anio: 2025, ratio: 1.3, fondo: 'repeating-linear-gradient(90deg, #111 0 2px, transparent 2px 22px), repeating-linear-gradient(0deg, #111 0 2px, transparent 2px 22px), linear-gradient(#e7ff4f, #a3e635)' },
    { titulo: 'Bruma', tipo: 'Fotografía', anio: 2024, ratio: 0.7, fondo: 'linear-gradient(180deg, #cbd5e1, #94a3b8 45%, #475569 46%, #64748b 60%, #1e293b)' },
    { titulo: 'Órbita', tipo: 'Motion', anio: 2026, ratio: 1, fondo: 'radial-gradient(circle at 50% 50%, #f97316 0 14%, transparent 15%), radial-gradient(circle at 50% 50%, transparent 0 30%, rgba(255,255,255,.5) 31% 32%, transparent 33%), #0a0a0a' },
    { titulo: 'Lavanda', tipo: 'Campaña', anio: 2025, ratio: 0.8, fondo: 'conic-gradient(from 210deg at 50% 60%, #c4b5fd, #f0abfc, #a5b4fc, #c4b5fd)' },
    { titulo: 'Asfalto', tipo: 'Editorial', anio: 2026, ratio: 1.5, fondo: 'linear-gradient(115deg, #262626 0 48%, #facc15 48% 50%, #262626 50% 70%, #fafafa 70% 72%, #262626 72%)' },
    { titulo: 'Durazno', tipo: 'Identidad', anio: 2024, ratio: 0.9, fondo: 'radial-gradient(circle at 35% 40%, #fff7ed 0 10%, transparent 40%), linear-gradient(145deg, #fdba74, #fb7185)' },
    { titulo: 'Glaciar', tipo: 'Fotografía', anio: 2025, ratio: 1.25, fondo: 'linear-gradient(170deg, #e0f2fe 0 40%, #7dd3fc 40% 55%, #0369a1 55% 75%, #082f49)' },
    { titulo: 'Señal', tipo: 'Web', anio: 2026, ratio: 0.8, fondo: 'repeating-radial-gradient(circle at 50% 120%, #ef4444 0 10px, #111 10px 24px)' },
    { titulo: 'Musgo', tipo: 'Packaging', anio: 2024, ratio: 1.1, fondo: 'radial-gradient(ellipse at 30% 30%, #bef264, transparent 50%), radial-gradient(ellipse at 70% 80%, #365314, transparent 60%), #4d7c0f' },
    { titulo: 'Eclipse', tipo: 'Film', anio: 2025, ratio: 1.7, fondo: 'radial-gradient(circle at 55% 50%, #000 0 18%, #fde047 19% 20%, #451a03 32%, #0c0a09 70%)' },
  ];

  const COLUMNAS = 6, FILAS = 6;            // grilla que se repite al infinito
  const CELDA = { x: 400, y: 360 };         // tamaño de celda a escala 1
  const Z_MIN = -380, Z_MAX = 140;          // profundidad de las fotos
  const LERP = reduce ? 1 : 0.075;          // suavizado de la cámara
  const ARRASTRE = 1.25;                    // px de mundo por px de mouse

  const azar = (a, b) => a + Math.random() * (b - a);
  const envolver = (v, t) => ((((v + t / 2) % t) + t) % t) - t / 2;   // a [-t/2, t/2)

  /* ---------- Construcción ---------- */
  const items = [];
  let n = 0;
  for (let fila = 0; fila < FILAS; fila++) {
    for (let col = 0; col < COLUMNAS; col++) {
      const foto = FOTOS[n % FOTOS.length];
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'gm-item';
      el.setAttribute('aria-label', `${foto.titulo} — ${foto.tipo}, ${foto.anio}`);
      const img = document.createElement('span');
      img.className = 'gm-item__img';
      img.style.backgroundImage = foto.src ? `url("${foto.src}")` : foto.fondo;
      const label = document.createElement('span');
      label.className = 'gm-item__label';
      label.setAttribute('aria-hidden', 'true');
      label.innerHTML = `<b>${foto.titulo}</b>${String(n % FOTOS.length + 1).padStart(2, '0')} · ${foto.tipo}`;
      el.append(img, label);
      plane.appendChild(el);
      // Ancho base al azar; con fotos de un lado mayor fijo se ve más variado.
      const ancho = azar(170, 260) * (foto.ratio < 1 ? 0.85 : 1);
      items.push({
        el, img, foto, num: n % FOTOS.length + 1,
        bx: col * CELDA.x + azar(-70, 70),
        by: fila * CELDA.y + azar(-60, 60),
        z: azar(Z_MIN, Z_MAX),
        w0: ancho, h0: ancho / foto.ratio,
        entrada: reduce ? 0 : 2600,          // distancia extra en z para la llegada
        w: 0, h: 0, sx: 0, sy: 0,
      });
      n++;
    }
  }
  const MUNDO = { w: COLUMNAS * CELDA.x, h: FILAS * CELDA.y };

  /* ---------- Escala según pantalla ---------- */
  let S = 1;
  function medir() {
    S = Math.min(1.15, Math.max(0.55, innerWidth / 1300));
    items.forEach((it) => {
      it.w = it.w0 * S; it.h = it.h0 * S;
      it.el.style.width = `${it.w}px`;
      it.el.style.height = `${it.h}px`;
    });
  }
  medir();
  addEventListener('resize', medir);

  /* ---------- Cámara ---------- */
  const cam = { x: MUNDO.w / 2, y: MUNDO.h / 2 };
  const objetivo = { ...cam };
  const prev = { ...cam };
  let vel = { x: 0, y: 0 };
  let inclinacion = { x: 0, y: 0, z: 0 };
  let activo = false;   // false durante la intro y con el detalle abierto

  function frame() {
    cam.x += (objetivo.x - cam.x) * LERP;
    cam.y += (objetivo.y - cam.y) * LERP;
    vel = { x: cam.x - prev.x, y: cam.y - prev.y };
    prev.x = cam.x; prev.y = cam.y;

    // Inclinación por velocidad: el plano "se deja arrastrar".
    if (!reduce) {
      const k = 0.12;
      inclinacion.x += (gsapClamp(-10, 10, -vel.y * k) - inclinacion.x) * 0.1;
      inclinacion.y += (gsapClamp(-10, 10, vel.x * k) - inclinacion.y) * 0.1;
      inclinacion.z += (Math.min(260, Math.hypot(vel.x, vel.y) * 6) - inclinacion.z) * 0.1;
      plane.style.transform = `translateZ(${-inclinacion.z}px) rotateX(${inclinacion.x}deg) rotateY(${inclinacion.y}deg)`;
    }

    const mitadW = innerWidth / 2, mitadH = innerHeight / 2;
    for (const it of items) {
      const x = envolver(it.bx - cam.x, MUNDO.w) * S;
      const y = envolver(it.by - cam.y, MUNDO.h) * S;
      const z = it.z * S - it.entrada;
      it.sx = x; it.sy = y;
      // Niebla: más lejos (z) y más cerca del borde = más transparente.
      const prof = (it.z - Z_MIN) / (Z_MAX - Z_MIN);                       // 0 lejos … 1 cerca
      const borde = Math.max(Math.abs(x) / (mitadW + 200), Math.abs(y) / (mitadH + 200));
      const op = (0.35 + 0.65 * prof) * Math.max(0, Math.min(1, (1.25 - borde) * 2)) * (1 - Math.min(1, it.entrada / 2600));
      it.el.style.opacity = op.toFixed(3);
      // La foto abierta queda oculta: su lugar lo ocupa la copia del detalle.
      it.el.style.visibility = op < 0.01 || it === detalleAbierto ? 'hidden' : 'visible';
      it.el.style.transform = `translate3d(${(x - it.w / 2).toFixed(1)}px, ${(y - it.h / 2).toFixed(1)}px, ${z.toFixed(1)}px)`;
    }
  }
  const gsapClamp = (a, b, v) => Math.max(a, Math.min(b, v));
  // Mismo reloj que las animaciones de GSAP (si no hay GSAP, requestAnimationFrame).
  if (hasGsap) gsap.ticker.add(frame);
  else (function loop() { frame(); requestAnimationFrame(loop); })();

  /* ---------- Arrastre, rueda, teclado ---------- */
  let drag = null;
  world.addEventListener('pointerdown', (e) => {
    if (!activo || e.button !== 0 || e.target.closest('a, .gm-detail, .gm-intro')) return;
    drag = { x: e.clientX, y: e.clientY, movido: 0, item: e.target.closest('.gm-item'), ult: { x: 0, y: 0 } };
    try { world.setPointerCapture(e.pointerId); } catch (_) { /* puntero ya liberado: el arrastre sigue igual */ }
  });
  world.addEventListener('pointermove', (e) => {
    moverCursor(e);
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    drag.movido += Math.abs(dx) + Math.abs(dy);
    drag.ult = { x: dx, y: dy };
    if (drag.movido > 5) world.classList.add('is-dragging');
    objetivo.x -= (dx * ARRASTRE) / S;
    objetivo.y -= (dy * ARRASTRE) / S;
  });
  const soltar = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    world.classList.remove('is-dragging');
    if (d.movido < 6) { if (d.item) abrir(items.find((it) => it.el === d.item)); return; }
    // Inercia: el objetivo sigue un poco en la dirección del último movimiento.
    if (!reduce) { objetivo.x -= (d.ult.x * 14) / S; objetivo.y -= (d.ult.y * 14) / S; }
  };
  world.addEventListener('pointerup', soltar);
  world.addEventListener('pointercancel', soltar);
  world.addEventListener('wheel', (e) => {
    if (!activo) return;
    e.preventDefault();
    objetivo.x += (e.deltaX * 0.9) / S;
    objetivo.y += (e.deltaY * 0.9) / S;
  }, { passive: false });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detalleAbierto) return cerrar();
    if (!activo) return;
    const paso = 220 / S;
    const mov = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
    if (mov && (world.contains(document.activeElement) || document.activeElement === document.body)) {
      e.preventDefault();
      objetivo.x += mov[0]; objetivo.y += mov[1];
    }
  });
  // Foco con Tab: la cámara viaja hasta la foto enfocada (por el camino más corto).
  items.forEach((it) => it.el.addEventListener('focus', () => {
    if (!activo) return;
    objetivo.x = cam.x + envolver(it.bx - cam.x, MUNDO.w);
    objetivo.y = cam.y + envolver(it.by - cam.y, MUNDO.h);
  }));
  // Enter / Espacio sobre la foto (el clic del mouse lo maneja el arrastre).
  items.forEach((it) => it.el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(it); }
  }));
  items.forEach((it) => it.el.addEventListener('click', (e) => { if (e.detail === 0) abrir(it); }));

  /* ---------- Cursor ---------- */
  const cursor = world.querySelector('[data-cursor]');
  const cursorLabel = world.querySelector('[data-cursor-label]');
  if (fine && !reduce) world.classList.add('has-cursor');
  function moverCursor(e) {
    if (!cursor) return;
    const r = world.getBoundingClientRect();
    cursor.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`;
    const sobre = !drag && e.target.closest && e.target.closest('.gm-item');
    cursor.classList.toggle('is-view', !!sobre);
    cursor.classList.toggle('is-hidden', !activo || !!e.target.closest('.gm__ui a, .gm-detail'));
    cursorLabel.textContent = sobre ? 'Ver' : 'Arrastrar';
  }
  world.addEventListener('pointerleave', () => cursor && cursor.classList.add('is-hidden'));

  /* ---------- Detalle con FLIP ---------- */
  const detalle = world.querySelector('[data-detail]');
  const dImg = world.querySelector('[data-detail-img]');
  const dNum = world.querySelector('[data-detail-num]');
  const dTit = world.querySelector('[data-detail-title]');
  const dMeta = world.querySelector('[data-detail-meta]');
  const dCerrar = world.querySelector('[data-detail-close]');
  let detalleAbierto = null;

  function cajaFinal(foto) {
    // Deja libre la franja de abajo para el título y los datos.
    const arriba = 70, abajo = 230;
    const maxW = innerWidth * 0.62, maxH = Math.min(innerHeight * 0.7, innerHeight - arriba - abajo);
    let w = maxW, h = w / foto.ratio;
    if (h > maxH) { h = maxH; w = h * foto.ratio; }
    return { x: (innerWidth - w) / 2, y: arriba + (innerHeight - arriba - abajo - h) / 2, w, h };
  }
  function abrir(it) {
    if (!it || detalleAbierto) return;
    detalleAbierto = it;
    activo = false;
    const desde = it.img.getBoundingClientRect();
    const f = cajaFinal(it.foto);
    dImg.style.backgroundImage = it.foto.src ? `url("${it.foto.src}")` : it.foto.fondo;
    Object.assign(dImg.style, { left: `${f.x}px`, top: `${f.y}px`, width: `${f.w}px`, height: `${f.h}px` });
    dNum.textContent = `${String(it.num).padStart(2, '0')} / ${String(FOTOS.length).padStart(2, '0')}`;
    dTit.textContent = it.foto.titulo;
    dMeta.textContent = `${it.foto.tipo} · ${it.foto.anio}`;
    detalle.hidden = false;
    it.el.style.visibility = 'hidden';
    if (cursor) cursor.classList.add('is-hidden');
    if (hasGsap && !reduce) {
      gsap.fromTo(detalle, { backgroundColor: 'rgba(5,5,5,0)' }, { backgroundColor: 'rgba(5,5,5,.82)', duration: 0.6 });
      gsap.fromTo(dImg, {
        x: desde.left - f.x, y: desde.top - f.y, scaleX: desde.width / f.w, scaleY: desde.height / f.h, transformOrigin: '0 0',
      }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.9, ease: 'expo.out' });
      gsap.fromTo([dNum, dTit, dMeta, dCerrar], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, delay: 0.25, ease: 'power3.out' });
    }
    dCerrar.focus();
  }
  function cerrar() {
    const it = detalleAbierto;
    if (!it) return;
    const fin = () => {
      detalle.hidden = true;
      it.el.style.visibility = '';
      detalleAbierto = null;
      activo = true;
      it.el.focus({ preventScroll: true });
    };
    if (!hasGsap || reduce) return fin();
    const a = it.img.getBoundingClientRect();
    const f = dImg.getBoundingClientRect();
    gsap.to([dNum, dTit, dMeta, dCerrar], { opacity: 0, duration: 0.25 });
    gsap.to(detalle, { backgroundColor: 'rgba(5,5,5,0)', duration: 0.6 });
    gsap.to(dImg, {
      x: a.left - parseFloat(dImg.style.left), y: a.top - parseFloat(dImg.style.top),
      scaleX: a.width / f.width, scaleY: a.height / f.height, duration: 0.7, ease: 'expo.inOut', onComplete: fin,
    });
  }
  dCerrar.addEventListener('click', cerrar);
  detalle.addEventListener('click', (e) => { if (e.target === detalle || e.target === dImg) cerrar(); });

  /* ---------- Intro: esfera de alambre ---------- */
  const intro = world.querySelector('[data-intro]');
  const globe = world.querySelector('[data-globe]');
  const ctx = globe.getContext('2d');
  let rot = 0, introViva = true;
  function dibujarEsfera() {
    if (!introViva) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const size = globe.clientWidth;
    if (globe.width !== Math.round(size * dpr)) { globe.width = globe.height = Math.round(size * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const R = size * 0.46, c = size / 2, tilt = 0.32;
    const proyectar = (lat, lon) => {
      // Esfera rotada en y (rot) e inclinada en x (tilt), proyección ortográfica.
      let x = Math.cos(lat) * Math.sin(lon + rot), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon + rot);
      const y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      return [c + x * R, c - y2 * R, z2];
    };
    const trazo = (pts) => {
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0, z0] = pts[i - 1], [x1, y1, z1] = pts[i];
        const zz = (z0 + z1) / 2;
        ctx.strokeStyle = `rgba(242,239,233,${zz > 0 ? 0.55 : 0.12})`;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    };
    ctx.lineWidth = 1;
    for (let l = -75; l <= 75; l += 15) {          // paralelos
      const pts = [];
      for (let o = 0; o <= 360; o += 8) pts.push(proyectar((l * Math.PI) / 180, (o * Math.PI) / 180));
      trazo(pts);
    }
    for (let o = 0; o < 180; o += 15) {             // meridianos
      const pts = [];
      for (let l = -90; l <= 270; l += 8) pts.push(proyectar((l * Math.PI) / 180, (o * Math.PI) / 180));
      trazo(pts);
    }
    if (!reduce) rot += 0.004;
    requestAnimationFrame(dibujarEsfera);
  }

  function entrar() {
    if (!introViva) return;
    const listo = () => {
      introViva = false;
      intro.hidden = true;
      activo = true;
      const hint = world.querySelector('[data-hint]');
      if (hint && hasGsap) gsap.from(hint, { opacity: 0, y: -8, duration: 0.8 });
    };
    // Las fotos llegan desde el fondo, primero las del centro.
    const llegar = () => {
      if (!hasGsap || reduce) { items.forEach((it) => { it.entrada = 0; }); return; }
      const orden = [...items].sort((a, b) => Math.hypot(a.sx, a.sy) - Math.hypot(b.sx, b.sy));
      orden.forEach((it, i) => gsap.to(it, { entrada: 0, duration: 1.8, delay: i * 0.025, ease: 'expo.out' }));
    };
    if (!hasGsap || reduce) { llegar(); return listo(); }
    gsap.timeline({ onComplete: listo })
      .to('.gm-intro__title, .gm-intro__enter', { opacity: 0, y: -10, duration: 0.5, ease: 'power2.in' })
      .to(globe, { scale: 9, opacity: 0, duration: 1.6, ease: 'expo.inOut' }, 0.1)
      .to(intro, { backgroundColor: 'rgba(5,5,5,0)', duration: 1, ease: 'power2.inOut' }, 0.6)
      .add(llegar, 0.7);
  }

  if (reduce) { introViva = false; intro.hidden = true; items.forEach((it) => { it.entrada = 0; }); activo = true; }
  else {
    requestAnimationFrame(dibujarEsfera);
    world.querySelector('[data-enter]').addEventListener('click', entrar);
    // Arrastrar sobre la intro también entra (como el "Drag to explore" del original).
    let inicio = null;
    intro.addEventListener('pointerdown', (e) => { inicio = { x: e.clientX, y: e.clientY }; });
    intro.addEventListener('pointermove', (e) => {
      if (inicio && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 40) { inicio = null; entrar(); }
    });
    intro.addEventListener('pointerup', () => { inicio = null; });
  }
})();
