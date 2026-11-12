/* ==========================================================================
   WebGL + DOM · Portada
   Inspirado en "Atelier UI: Mixing WebGL and the DOM in a React UI Library"
   (Jérémie Nallet, Codrops). Reconstrucción propia sin React ni Three.js.

   - Un canvas WebGL global, fijo detrás de la página.
   - Cada [data-gl] queda en el DOM (opacity 0) y se dibuja como plano WebGL.
   - Scroll suave propio: DOM y canvas usan el mismo valor en el mismo cuadro.
   - Flowmap: el mouse deja una estela de velocidad que distorsiona [data-fluid].
   - Efectos por imagen: liquid, pixel, lens.
   ========================================================================== */
(() => {
  const A = window.Atelier;
  if (!A) return;
  const root = document.documentElement;
  const canvas = document.querySelector('.agl');
  const content = document.querySelector('[data-scroll]');
  const reduce = A.reduce;

  iniciarLetras();

  const gl = !reduce && canvas && canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
  if (!gl) { A.descubrir(); return; }

  /* ------------------------------------------------------------------------
     Shaders
     ------------------------------------------------------------------------ */
  const VERT_PLANO = `
    attribute vec2 a_pos;            // 0..1, y hacia arriba
    uniform vec2 u_res;              // viewport en px CSS
    uniform vec4 u_rect;             // x, y (arriba-izquierda), ancho, alto en px CSS
    varying vec2 v_uv;
    void main() {
      v_uv = a_pos;
      vec2 px = vec2(u_rect.x + a_pos.x * u_rect.z, u_rect.y + (1.0 - a_pos.y) * u_rect.w);
      gl_Position = vec4(px.x / u_res.x * 2.0 - 1.0, 1.0 - px.y / u_res.y * 2.0, 0.0, 1.0);
    }`;

  const FRAG_PLANO = `
    precision highp float;
    uniform sampler2D u_tex;
    uniform sampler2D u_flow;
    uniform vec2 u_res;
    uniform vec2 u_resPx;            // viewport en px del dispositivo
    uniform vec4 u_rect;
    uniform vec2 u_texSize;
    uniform float u_kind;            // 0 = texto, 1 = imagen
    uniform float u_effect;          // 0 hero, 1 liquid, 2 pixel, 3 lens
    uniform float u_variant;         // 0 color, 1 invertido, 2 grises
    uniform float u_fluid;
    uniform float u_hover;           // 0..1 suavizado
    uniform float u_time;
    uniform vec2 u_pointer;          // cursor en UV local del plano
    varying vec2 v_uv;

    // background-size: cover
    vec2 cover(vec2 uv, vec2 box, vec2 tex) {
      float rb = box.x / box.y, rt = tex.x / tex.y;
      vec2 s = rb > rt ? vec2(1.0, rt / rb) : vec2(rb / rt, 1.0);
      return (uv - 0.5) * s + 0.5;
    }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 variante(vec3 c) {
      if (u_variant > 1.5) return vec3(dot(c, vec3(0.299, 0.587, 0.114)));
      if (u_variant > 0.5) return 1.0 - c;
      return c;
    }
    vec3 muestra(vec2 uv) { return texture2D(u_tex, cover(uv, u_rect.zw, u_texSize)).rgb; }

    void main() {
      vec2 uv = v_uv;

      // Distorsión fluida: la velocidad del flowmap (en UV de pantalla) pasa a UV local.
      if (u_fluid > 0.5) {
        vec2 f = (texture2D(u_flow, gl_FragCoord.xy / u_resPx).rg - 0.5) * 2.0;
        uv -= f * 0.08 * u_res / u_rect.zw;
      }

      if (u_kind < 0.5) {
        float dentro = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        gl_FragColor = texture2D(u_tex, uv) * dentro;
        return;
      }

      float aspect = u_rect.z / u_rect.w;
      vec2 d = (uv - u_pointer) * vec2(aspect, 1.0);
      float dist = length(d);
      vec2 dir = normalize(d + 1e-5) / vec2(aspect, 1.0);
      vec3 col;

      if (u_effect > 2.5) {
        // Lens: lupa circular con dispersión RGB hacia el borde.
        float R = 0.26 * u_hover;
        float m = R > 0.001 ? clamp(dist / R, 0.0, 1.0) : 1.0;
        float dentro = 1.0 - step(1.0, m);
        vec2 luv = mix(uv, u_pointer + (uv - u_pointer) * mix(0.55, 1.0, m * m), dentro);
        float disp = 0.018 * dentro * m * m;
        col = vec3(muestra(luv + dir * disp).r, muestra(luv).g, muestra(luv - dir * disp).b);
        col += dentro * smoothstep(0.92, 1.0, m) * 0.12;
      } else {
        if (u_effect > 1.5) {
          // Pixel: bloques más grandes cuanto más cerca del cursor.
          float k = u_hover * smoothstep(0.6, 0.0, dist);
          float paso = floor(k * 6.0) / 6.0;
          if (paso > 0.0) {
            vec2 celdas = u_rect.zw / mix(2.0, 44.0, paso);
            uv = (floor(uv * celdas) + 0.5) / celdas;
          }
        } else if (u_effect > 0.5) {
          // Liquid: ondas concéntricas alrededor del cursor.
          float w = sin(dist * 38.0 - u_time * 5.0) * exp(-dist * 5.0) * 0.02 * u_hover;
          uv += dir * w;
        }
        col = muestra(uv);
      }

      col = variante(col);
      col += (hash(gl_FragCoord.xy + fract(u_time * 7.0) * 100.0) - 0.5) * 0.09; // grano
      gl_FragColor = vec4(col, 1.0);
    }`;

  const VERT_FULL = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() { v_uv = a_pos; gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0); }`;

  // Flowmap: guarda la velocidad del mouse (codificada 0..1) y la disipa cada cuadro.
  const FRAG_FLOW = `
    precision highp float;
    uniform sampler2D u_prev;
    uniform vec2 u_mouse;      // UV de pantalla, y hacia arriba
    uniform vec2 u_vel;
    uniform float u_aspect;
    varying vec2 v_uv;
    void main() {
      vec2 v = (texture2D(u_prev, v_uv).rg - 0.5) * 2.0;
      // Disipación multiplicativa + resta mínima: con 8 bits por canal, sin la resta
      // quedarían restos que nunca llegan a cero.
      v = sign(v) * max(abs(v) * 0.975 - 0.005, 0.0);
      vec2 c = (v_uv - u_mouse) * vec2(u_aspect, 1.0);
      v += u_vel * exp(-dot(c, c) / 0.006);
      v = clamp(v, -1.0, 1.0);
      gl_FragColor = vec4(v * 0.5 + 0.5, 0.0, 1.0);
    }`;

  const progPlano = A.programa(gl, VERT_PLANO, FRAG_PLANO);
  const progFlow = A.programa(gl, VERT_FULL, FRAG_FLOW);
  if (!progPlano || !progFlow) { A.descubrir(); return; }

  // Un quad 0..1 compartido.
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const usarQuad = (prog) => {
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  };

  /* ------------------------------------------------------------------------
     Flowmap (ping-pong de dos texturas 128×128)
     ------------------------------------------------------------------------ */
  const FLOW = 128;
  const flow = [0, 1].map(() => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FLOW, FLOW, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, FLOW, FLOW);
    gl.clearColor(0.5, 0.5, 0, 1);   // 0.5 = velocidad cero
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb };
  });
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  let flowIdx = 0;

  /* ------------------------------------------------------------------------
     Planos: uno por [data-gl]
     ------------------------------------------------------------------------ */
  const EFECTOS = { hero: 0, liquid: 1, pixel: 2, lens: 3 };
  const planos = [...document.querySelectorAll('[data-gl]')].map((el) => ({
    el,
    kind: el.dataset.gl === 'text' ? 0 : 1,
    effect: EFECTOS[el.dataset.effect] ?? 0,
    variant: Number(el.dataset.variant || 0),
    fluid: el.hasAttribute('data-fluid') ? 1 : 0,
    reflow: el.hasAttribute('data-reflow'),
    clip: el.closest('[data-gl-clip]'),   // ancestro con overflow:hidden que el canvas debe respetar
    z: Number(el.dataset.z || 0),
    x: 0, y: 0, w: 0, h: 0, pad: 0,
    hover: 0, hoverT: 0, px: 0.5, py: 0.5,
    tex: null,
  })).sort((a, b) => a.z - b.z);

  // Posición en coordenadas de página: después solo se resta el scroll.
  function medir(p) {
    const r = p.el.getBoundingClientRect();
    p.x = r.left - p.pad;
    p.y = r.top + current - p.pad;
    p.w = r.width + p.pad * 2;
    p.h = r.height + p.pad * 2;
  }

  // Texto → canvas 2D → textura, con los estilos calculados del elemento.
  function texturaTexto(p) {
    const el = p.el;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    p.pad = Math.ceil(fs * 0.2);               // margen para glifos que se salen de la caja
    p.el.style.opacity = '';
    const r = el.getBoundingClientRect();
    const w = r.width + p.pad * 2;
    const h = r.height + p.pad * 2;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * dpr);
    c.height = Math.ceil(h * dpr);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    ctx.fillStyle = cs.color;
    ctx.textBaseline = 'alphabetic';
    const texto = el.textContent.trim();
    const m = ctx.measureText(texto);
    const asc = m.fontBoundingBoxAscent ?? fs * 0.8;
    const desc = m.fontBoundingBoxDescent ?? fs * 0.2;
    const lh = parseFloat(cs.lineHeight) || fs * 1.2;
    // Igual que el navegador: el área de contenido se centra en la línea.
    const base = p.pad + parseFloat(cs.paddingTop) + (lh - (asc + desc)) / 2 + asc;
    ctx.fillText(texto, p.pad + parseFloat(cs.paddingLeft), base);
    if (p.tex) gl.deleteTexture(p.tex);
    p.tex = A.textura(gl, c, true);
  }

  /* ------------------------------------------------------------------------
     Scroll suave: el contenido se traslada; body conserva el alto para que
     la barra de scroll y la rueda sigan siendo nativas.
     ------------------------------------------------------------------------ */
  let target = scrollY;
  let current = scrollY;
  root.classList.add('has-smooth');
  const fijarAlto = () => { document.body.style.height = `${content.offsetHeight}px`; };
  // Posición de un elemento en la página, sin importar el scroll ni la traslación actual.
  const yPagina = (el) => el.getBoundingClientRect().top - content.getBoundingClientRect().top;
  addEventListener('scroll', () => { target = scrollY; }, { passive: true });

  // Anclas y foco con teclado: el contenido es fixed, así que se scrollea a mano.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const dest = document.querySelector(a.getAttribute('href'));
    if (!dest) return;
    e.preventDefault();
    scrollTo({ top: yPagina(dest) });
  });
  document.addEventListener('focusin', (e) => {
    if (!content.contains(e.target)) return;
    const r = e.target.getBoundingClientRect();
    if (r.top < 80 || r.bottom > innerHeight - 80) scrollTo({ top: yPagina(e.target) - innerHeight / 3 });
  });

  // Footer con parallax: el contenedor interno sube de −50% a 0%.
  const foot = document.querySelector('[data-foot]');
  const footInner = document.querySelector('[data-foot-inner]');
  function parallax() {
    if (!foot) return;
    const r = foot.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / r.height));
    footInner.style.transform = `translate3d(0, ${-50 * (1 - p)}%, 0)`;
  }

  /* ------------------------------------------------------------------------
     Mouse
     ------------------------------------------------------------------------ */
  const mouse = { x: -9999, y: -9999, px: -9999, py: -9999, movido: false };
  addEventListener('pointermove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.movido = true;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

  /* ------------------------------------------------------------------------
     Tamaño
     ------------------------------------------------------------------------ */
  let dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    // clientWidth (no innerWidth): el canvas fijo no incluye la barra de scroll.
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    fijarAlto();
    planos.forEach((p) => { if (p.kind === 0) texturaTexto(p); medir(p); });
  }

  /* ------------------------------------------------------------------------
     Cuadro
     ------------------------------------------------------------------------ */
  function actualizarFlow() {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    let vx = 0, vy = 0, mx = 0, my = 0;
    if (mouse.movido && mouse.px > -9000 && mouse.x > -9000) {
      vx = ((mouse.x - mouse.px) / W) * 9;
      vy = (-(mouse.y - mouse.py) / H) * 9;
      const len = Math.hypot(vx, vy);
      if (len > 1) { vx /= len; vy /= len; }
    }
    if (mouse.x > -9000) { mx = mouse.x / W; my = 1 - mouse.y / H; }
    mouse.px = mouse.x;
    mouse.py = mouse.y;
    mouse.movido = false;

    const src = flow[flowIdx];
    const dst = flow[1 - flowIdx];
    gl.useProgram(progFlow);
    usarQuad(progFlow);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(0, 0, FLOW, FLOW);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(progFlow.u.u_prev, 0);
    gl.uniform2f(progFlow.u.u_mouse, mx, my);
    gl.uniform2f(progFlow.u.u_vel, vx, vy);
    gl.uniform1f(progFlow.u.u_aspect, W / H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    flowIdx = 1 - flowIdx;
  }

  function dibujar(t) {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // texturas de texto premultiplicadas

    gl.useProgram(progPlano);
    usarQuad(progPlano);
    const u = progPlano.u;
    gl.uniform2f(u.u_res, W, H);
    gl.uniform2f(u.u_resPx, canvas.width, canvas.height);
    gl.uniform1f(u.u_time, t);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, flow[flowIdx].tex);
    gl.uniform1i(u.u_flow, 1);
    gl.uniform1i(u.u_tex, 0);

    for (const p of planos) {
      if (!p.tex) continue;
      const y = p.y - current;
      if (y > H || y + p.h < 0) continue;            // fuera de pantalla

      // Hover suavizado y cursor en UV local (y hacia arriba).
      const lx = (mouse.x - p.x) / p.w;
      const ly = 1 - (mouse.y - y) / p.h;
      const dentro = lx >= 0 && lx <= 1 && ly >= 0 && ly <= 1;
      p.hoverT = dentro ? 1 : 0;
      p.hover += (p.hoverT - p.hover) * 0.08;
      if (dentro) { p.px += (lx - p.px) * 0.25; p.py += (ly - p.py) * 0.25; }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, p.tex);
      gl.uniform4f(u.u_rect, p.x, y, p.w, p.h);
      gl.uniform2f(u.u_texSize, p.tex.width, p.tex.height);
      gl.uniform1f(u.u_kind, p.kind);
      gl.uniform1f(u.u_effect, p.effect);
      gl.uniform1f(u.u_variant, p.variant);
      gl.uniform1f(u.u_fluid, p.fluid);
      gl.uniform1f(u.u_hover, p.hover);
      gl.uniform2f(u.u_pointer, p.px, p.py);
      if (p.clip) {
        // El canvas no conoce el overflow del DOM: se recorta con scissor (en px del dispositivo, y desde abajo).
        const c = p.clip.getBoundingClientRect();
        const k = canvas.width / W;
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(Math.round(c.left * k), Math.round((H - c.bottom) * k), Math.round(c.width * k), Math.round(c.height * k));
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (p.clip) gl.disable(gl.SCISSOR_TEST);
    }
  }

  let raf = 0;
  function frame(now) {
    raf = 0;
    if (document.hidden) return;
    current += (target - current) * 0.1;
    if (Math.abs(target - current) < 0.05) current = target;
    content.style.transform = `translate3d(0, ${-current}px, 0)`;
    parallax();
    for (const p of planos) if (p.reflow) medir(p);   // el padre se mueve con transform
    actualizarFlow();
    dibujar(now * 0.001);
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf) raf = requestAnimationFrame(frame); });

  /* ------------------------------------------------------------------------
     Arranque: fuentes + imágenes → texturas → mostrar
     ------------------------------------------------------------------------ */
  (async () => {
    const fuentes = document.fonts ? document.fonts.ready : Promise.resolve();
    const srcs = [...new Set(planos.filter((p) => p.kind === 1).map((p) => p.el.getAttribute('src')))];
    let imgs;
    try {
      [, imgs] = await Promise.all([fuentes, Promise.all(srcs.map(A.cargarImagen))]);
    } catch (_) { A.descubrir(); root.classList.remove('has-smooth'); return; }
    const texs = new Map(srcs.map((s, i) => [s, A.textura(gl, imgs[i])]));
    planos.forEach((p) => { if (p.kind === 1) p.tex = texs.get(p.el.getAttribute('src')); });

    root.classList.add('gl-ready');   // antes de medir: el canvas tiene display:none hasta acá
    resize();
    new ResizeObserver(() => { fijarAlto(); planos.forEach(medir); }).observe(content);
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });

    // Llegada con #ancla (p. ej. desde la galería a la ficha): el contenido es fixed, se ubica a mano.
    const ancla = location.hash && document.querySelector(location.hash);
    if (ancla) {
      scrollTo(0, yPagina(ancla));
      target = current = scrollY;
      content.style.transform = `translate3d(0, ${-current}px, 0)`;
    }

    raf = requestAnimationFrame(frame);
    A.descubrir();
  })();

  /* ------------------------------------------------------------------------
     Letras que ruedan (solo DOM): cada letra entra desde arriba o abajo,
     al azar, con stagger de 0.05 s cuando la palabra entra en pantalla.
     ------------------------------------------------------------------------ */
  function iniciarLetras() {
    const palabras = document.querySelectorAll('[data-roll]');
    if (!palabras.length || reduce) return;
    root.classList.add('js-roll');
    let n = 0;
    palabras.forEach((w) => {
      const texto = w.textContent;
      w.setAttribute('aria-label', texto);
      w.replaceChildren(...[...texto].map((ch) => {
        const ventana = document.createElement('span');
        ventana.className = 'aroll__l';
        ventana.setAttribute('aria-hidden', 'true');
        const letra = document.createElement('span');
        letra.textContent = ch;
        letra.style.setProperty('--from', Math.random() < 0.5 ? '105%' : '-105%');
        letra.style.setProperty('--d', `${(n++) * 0.05}s`);
        ventana.appendChild(letra);
        return ventana;
      }));
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle('is-rolled', en.isIntersecting));
    }, { threshold: 0.4 });
    palabras.forEach((w) => io.observe(w));
  }
})();
