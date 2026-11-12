/* ==========================================================================
   WebGL + DOM · Galería esférica
   Una grilla infinita de imágenes en un único fragment shader. Las coordenadas
   de pantalla se curvan (q = p / (1 + k·r²)) para que parezca el interior de
   una esfera: chicas al centro, grandes y estiradas hacia los bordes.
   - Arrastrar / rueda: mueve la grilla (con inercia).
   - Clic en una imagen: se amplía al centro; clic o Escape: vuelve.
   - Entrada: las celdas aparecen con un disuelto pixelado, en orden aleatorio.
   ========================================================================== */
(() => {
  const A = window.Atelier;
  if (!A) return;
  const root = document.documentElement;
  const wrap = document.querySelector('[data-sphere]');
  const canvas = wrap && wrap.querySelector('canvas');
  const reduce = A.reduce;

  const gl = canvas && canvas.getContext('webgl', { antialias: true, alpha: false });
  if (!gl) { root.classList.add('no-gl'); A.descubrir(); return; }

  const CURVA = 0.72;                 // k: cuánto se curva (con k·r² < 1 la curva no se pliega)
  const CELDA = [0.27, 0.32];         // tamaño de celda en unidades de "alto de pantalla"
  const MARCO = 0.01;                 // separación entre marcos
  const BORDE = 0.026;                // grosor del marco gris alrededor de la imagen

  const VERT = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() { v_uv = a_pos; gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0); }`;

  const FRAG_ESFERA = `
    precision highp float;
    uniform sampler2D u_tex;
    uniform vec2 u_texSize;
    uniform vec2 u_res;
    uniform vec2 u_offset;      // desplazamiento de la grilla, en celdas
    uniform vec2 u_cell;
    uniform float u_curve;
    uniform float u_reveal;     // 0..1 entrada
    uniform float u_fade;       // 0..1 cuando hay una imagen ampliada
    uniform float u_time;
    varying vec2 v_uv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    vec2 cover(vec2 uv, vec2 box, vec2 tex) {
      float rb = box.x / box.y, rt = tex.x / tex.y;
      vec2 s = rb > rt ? vec2(1.0, rt / rb) : vec2(rb / rt, 1.0);
      return (uv - 0.5) * s + 0.5;
    }
    float sdRound(vec2 p, vec2 b, float r) {
      vec2 q = abs(p) - b + r;
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    }
    vec3 variante(vec3 c, float v) {
      if (v > 1.5) return vec3(dot(c, vec3(0.299, 0.587, 0.114)));
      if (v > 0.5) return 1.0 - c;
      return c;
    }

    // Color de la grilla en el punto p (centrado, en unidades de alto de pantalla).
    vec3 grilla(vec2 p) {
      float r2 = dot(p, p);
      vec2 q = p / (1.0 + u_curve * r2);
      vec2 g = q / u_cell + u_offset;
      vec2 cell = floor(g);
      vec2 lp = (fract(g) - 0.5) * u_cell;

      // Entrada: cada celda tiene su momento; dentro, un disuelto en bloques.
      float n = hash(cell);
      float rev = smoothstep(n * 0.55, n * 0.55 + 0.45, u_reveal);
      vec2 frameHalf = u_cell * 0.5 - ${MARCO.toFixed(3)};
      vec2 imgHalf = frameHalf - ${BORDE.toFixed(3)};

      // Ancho de antialias según cuánto se estira la celda en pantalla.
      float aa = 1.5 / u_res.y / (1.0 + u_curve * r2) * (1.0 + u_curve * r2);
      vec3 col = vec3(1.0);
      float marco = 1.0 - smoothstep(-aa, aa, sdRound(lp, frameHalf, 0.022));
      col = mix(col, vec3(0.925), marco * smoothstep(0.0, 0.5, rev));

      vec2 iuv = lp / (imgHalf * 2.0) + 0.5;
      float img = 1.0 - smoothstep(-aa, aa, sdRound(lp, imgHalf, 0.004));
      float bloque = hash(cell * 13.0 + floor(iuv * 12.0));
      img *= step(bloque, rev * 1.05);
      float v = mod(cell.x + cell.y, 3.0);
      vec3 foto = variante(texture2D(u_tex, cover(iuv, imgHalf * 2.0, u_texSize)).rgb, v);
      return mix(col, foto, img);
    }

    void main() {
      float aspect = u_res.x / u_res.y;
      vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
      float r2 = dot(p, p);

      // Dispersión cromática que crece hacia los bordes.
      float ca = 0.018 * r2;
      vec3 col = vec3(grilla(p * (1.0 + ca)).r, grilla(p).g, grilla(p * (1.0 - ca)).b);

      // Bordes lavados hacia blanco, como fuera de foco.
      float borde = smoothstep(0.18, 0.62, r2 / (0.25 * aspect * aspect + 0.25));
      col = mix(col, vec3(1.0), borde * 0.55);
      col = mix(col, vec3(1.0), u_fade * 0.82);
      col += (hash(gl_FragCoord.xy + fract(u_time * 7.0) * 91.0) - 0.5) * 0.07;
      gl_FragColor = vec4(col, 1.0);
    }`;

  // Imagen ampliada: un plano con rect en px.
  const VERT_PLANO = `
    attribute vec2 a_pos;
    uniform vec2 u_res;
    uniform vec4 u_rect;
    varying vec2 v_uv;
    void main() {
      v_uv = a_pos;
      vec2 px = vec2(u_rect.x + a_pos.x * u_rect.z, u_rect.y + (1.0 - a_pos.y) * u_rect.w);
      gl_Position = vec4(px.x / u_res.x * 2.0 - 1.0, 1.0 - px.y / u_res.y * 2.0, 0.0, 1.0);
    }`;
  const FRAG_PLANO = `
    precision highp float;
    uniform sampler2D u_tex;
    uniform vec2 u_texSize;
    uniform vec4 u_rect;
    uniform float u_variant;
    uniform float u_time;
    varying vec2 v_uv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    vec2 cover(vec2 uv, vec2 box, vec2 tex) {
      float rb = box.x / box.y, rt = tex.x / tex.y;
      vec2 s = rb > rt ? vec2(1.0, rt / rb) : vec2(rb / rt, 1.0);
      return (uv - 0.5) * s + 0.5;
    }
    void main() {
      vec3 c = texture2D(u_tex, cover(v_uv, u_rect.zw, u_texSize)).rgb;
      if (u_variant > 1.5) c = vec3(dot(c, vec3(0.299, 0.587, 0.114)));
      else if (u_variant > 0.5) c = 1.0 - c;
      c += (hash(gl_FragCoord.xy + fract(u_time * 7.0) * 91.0) - 0.5) * 0.07;
      gl_FragColor = vec4(c, 1.0);
    }`;

  const progEsfera = A.programa(gl, VERT, FRAG_ESFERA);
  const progPlano = A.programa(gl, VERT_PLANO, FRAG_PLANO);
  if (!progEsfera || !progPlano) { root.classList.add('no-gl'); A.descubrir(); return; }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const usar = (prog) => {
    gl.useProgram(prog);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  };

  /* ------------------------------------------------------------------------
     Estado
     ------------------------------------------------------------------------ */
  const offset = { x: 0.5, y: 0.5 };   // arranca con una celda centrada
  const vel = { x: 0, y: 0 };
  let reveal = reduce ? 1 : 0;
  let inicio = 0;                      // la entrada se mide en tiempo real (no por cuadros)
  let zoom = 0, zoomT = 0;             // 0 = esfera, 1 = imagen ampliada
  let foco = null;                     // { variant, desde: rect, hasta: rect }
  let tex = null;
  let W = 1, H = 1;

  const lerp = (a, b, t) => a + (b - a) * t;

  // Pantalla (px) → punto centrado p → grilla g. Igual que el shader.
  function aGrilla(cx, cy) {
    const px = (cx / W - 0.5) * (W / H);
    const py = (0.5 - cy / H);
    const f = 1 + CURVA * (px * px + py * py);
    const gx = px / f / CELDA[0] + offset.x;
    const gy = py / f / CELDA[1] + offset.y;
    return { gx, gy };
  }

  // Inversa radial de q = r / (1 + k r²) (Newton, converge en pocas vueltas).
  function radioDesde(rq) {
    let r = rq;
    for (let i = 0; i < 8; i++) {
      const f = r / (1 + CURVA * r * r) - rq;
      const d = (1 - CURVA * r * r) / Math.pow(1 + CURVA * r * r, 2);
      r -= f / Math.max(d, 0.05);
    }
    return r;
  }

  // Rect en pantalla de la imagen de una celda (aproximado: centro exacto, tamaño local).
  function rectCelda(cx, cy) {
    const qx = (cx + 0.5 - offset.x) * CELDA[0];
    const qy = (cy + 0.5 - offset.y) * CELDA[1];
    const rq = Math.hypot(qx, qy);
    const r = rq > 1e-5 ? radioDesde(rq) : 0;
    const s = rq > 1e-5 ? r / rq : 1;
    const px = qx * s, py = qy * s;
    const escala = 1 + CURVA * r * r;                  // cuánto se agranda localmente
    const w = (CELDA[0] - 2 * (MARCO + BORDE)) * escala * H;
    const h = (CELDA[1] - 2 * (MARCO + BORDE)) * escala * H;
    const x = (px / (W / H) + 0.5) * W;
    const y = (0.5 - py) * H;
    return { x: x - w / 2, y: y - h / 2, w, h };
  }

  function rectAmpliado() {
    const h = Math.min(H * 0.74, (W * 0.86) / (tex.width / tex.height));
    const w = h * (tex.width / tex.height);
    return { x: (W - w) / 2, y: (H - h) / 2, w, h };
  }

  function abrir(cx, cy) {
    const variant = ((cx + cy) % 3 + 3) % 3;
    foco = { variant, cx, cy, desde: rectCelda(cx, cy), hasta: rectAmpliado() };
    vel.x = vel.y = 0;
    zoomT = 1;
    if (reduce) zoom = 1;
    wrap.classList.add('is-zoomed');
  }
  function cerrar() {
    zoomT = 0;
    if (reduce) { zoom = 0; foco = null; }
    wrap.classList.remove('is-zoomed');
  }

  /* ------------------------------------------------------------------------
     Arrastre, rueda, clic, teclado
     ------------------------------------------------------------------------ */
  let drag = null;
  wrap.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, movido: 0 };
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag || zoomT) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    drag.movido += Math.abs(dx) + Math.abs(dy);
    if (drag.movido > 4) wrap.classList.add('is-dragging');
    // px → celdas (en el centro de la pantalla, donde la curva es ~1).
    vel.x = -dx / H / CELDA[0];
    vel.y = dy / H / CELDA[1];
    offset.x += vel.x;
    offset.y += vel.y;
  });
  wrap.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const fueClic = drag.movido < 6;
    drag = null;
    wrap.classList.remove('is-dragging');
    if (!fueClic) return;
    vel.x = vel.y = 0;
    if (zoomT) return cerrar();
    const { gx, gy } = aGrilla(e.clientX, e.clientY);
    // ¿Cayó dentro de la imagen (no del marco)?
    const lx = (gx - Math.floor(gx) - 0.5) * CELDA[0];
    const ly = (gy - Math.floor(gy) - 0.5) * CELDA[1];
    const mx = CELDA[0] / 2 - MARCO - BORDE, my = CELDA[1] / 2 - MARCO - BORDE;
    if (Math.abs(lx) <= mx && Math.abs(ly) <= my) abrir(Math.floor(gx), Math.floor(gy));
  });
  wrap.addEventListener('pointercancel', () => { drag = null; wrap.classList.remove('is-dragging'); });
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (zoomT) return;
    vel.x += e.deltaX / H / CELDA[0] * 0.25;
    vel.y -= e.deltaY / H / CELDA[1] * 0.25;
  }, { passive: false });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && zoomT) cerrar(); });

  // Botones accesibles: abren la celda más cercana al centro con esa variante.
  document.querySelectorAll('[data-list] button').forEach((b) => {
    b.addEventListener('click', () => {
      const v = Number(b.dataset.variant);
      const cx0 = Math.floor(offset.x), cy0 = Math.floor(offset.y);
      for (let d = 0; d < 3; d++) {
        const cx = cx0 + d;
        if ((((cx + cy0) % 3) + 3) % 3 === v) return abrir(cx, cy0);
      }
    });
  });

  /* ------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------ */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (foco) foco.hasta = rectAmpliado();
  }

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  let raf = 0;
  let ultimo = 0;
  function frame(now) {
    raf = 0;
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - (ultimo || now)) / 1000);
    ultimo = now;
    const t = now * 0.001;

    // Inercia + deriva lenta cuando nadie toca.
    if (!drag && !zoomT) {
      offset.x += vel.x;
      offset.y += vel.y;
      vel.x *= 0.92;
      vel.y *= 0.92;
      if (!reduce) offset.x += dt * 0.025;
    }
    if (!inicio) inicio = now;
    if (reveal < 1) reveal = Math.min(1, (now - inicio) / 2200);
    zoom += (zoomT - zoom) * (reduce ? 1 : 1 - Math.exp(-dt * 5.5));   // suavizado independiente de los fps
    if (!zoomT && zoom < 0.002) { zoom = 0; foco = null; }

    gl.viewport(0, 0, canvas.width, canvas.height);
    usar(progEsfera);
    let u = progEsfera.u;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(u.u_tex, 0);
    gl.uniform2f(u.u_texSize, tex.width, tex.height);
    gl.uniform2f(u.u_res, W, H);
    gl.uniform2f(u.u_offset, offset.x, offset.y);
    gl.uniform2f(u.u_cell, CELDA[0], CELDA[1]);
    gl.uniform1f(u.u_curve, CURVA);
    gl.uniform1f(u.u_reveal, easeOut(reveal));
    gl.uniform1f(u.u_fade, zoom);
    gl.uniform1f(u.u_time, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (foco) {
      const k = easeOut(Math.min(1, zoom));
      // La celda de origen se recalcula cada cuadro: si la grilla se movió, la imagen vuelve a su lugar real.
      foco.desde = rectCelda(foco.cx, foco.cy);
      const a = foco.desde, b = foco.hasta;
      usar(progPlano);
      u = progPlano.u;
      gl.uniform1i(u.u_tex, 0);
      gl.uniform2f(u.u_texSize, tex.width, tex.height);
      gl.uniform2f(u.u_res, W, H);
      gl.uniform4f(u.u_rect, lerp(a.x, b.x, k), lerp(a.y, b.y, k), lerp(a.w, b.w, k), lerp(a.h, b.h, k));
      gl.uniform1f(u.u_variant, foco.variant);
      gl.uniform1f(u.u_time, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf) { ultimo = 0; raf = requestAnimationFrame(frame); } });

  A.cargarImagen('media/foto.png').then((img) => {
    tex = A.textura(gl, img);
    resize();
    new ResizeObserver(resize).observe(canvas);
    raf = requestAnimationFrame(frame);
    A.descubrir();
  }).catch(() => { root.classList.add('no-gl'); A.descubrir(); });
})();
