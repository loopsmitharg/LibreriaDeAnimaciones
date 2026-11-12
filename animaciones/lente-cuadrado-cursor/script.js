/* ==========================================================================
   Lente cuadrado que sigue al cursor
   Inspirado en "Building a Mouse-Following Square Lens Effect with Three.js
   and GLSL" (Tomoyuki Nakata, Codrops). Reconstrucción propia en WebGL puro.

   Una imagen en grises cubre la pantalla; dentro de un cuadrado que sigue al
   mouse se ve la misma imagen en color, con distorsión de lente y corrimiento
   RGB radial. Afuera, la imagen ondula con una onda sin() y ruido.
   Todo sucede en un único fragment shader sobre un plano a pantalla completa.
   ========================================================================== */
(() => {
  const section = document.querySelector('[data-lens]');
  if (!section) return;
  const canvas = section.querySelector('.lens__canvas');
  const form = section.querySelector('[data-lens-form]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Valores del tutorial.
  const DEFAULTS = {
    squareSize: 0.3,       // mitad del lado, en unidades del lado corto de la pantalla (−1..1)
    lensDistortion: 1.5,   // > 0 abomba hacia afuera, < 0 hacia adentro
    rgbShiftR: 0.01,
    rgbShiftG: 0,
    rgbShiftB: -0.01,
    waveFrequency: 10,
    waveStrength: 0.01,
    waveSpeed: 1,
    randomFrequency: 1,
    randomStrength: 0.02,
    randomSpeed: 0.2,
    pointerEase: 0.1,      // factor del lerp del mouse por cuadro
  };
  const params = { ...DEFAULTS };

  /* ------------------------------------------------------------------------
     Shaders
     ------------------------------------------------------------------------ */
  const VERT = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }`;

  const FRAG = `
    precision highp float;

    uniform sampler2D u_texture;
    uniform vec2 u_meshSize;
    uniform vec2 u_textureSize;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float u_squareSize;
    uniform float u_lensDistortion;
    uniform float u_rgbShiftR;
    uniform float u_rgbShiftG;
    uniform float u_rgbShiftB;
    uniform float u_waveFrequency;
    uniform float u_waveSpeed;
    uniform float u_waveStrength;
    uniform float u_randomFrequency;
    uniform float u_randomSpeed;
    uniform float u_randomStrength;

    varying vec2 v_uv;

    // Como background-size: cover — recorta desde el centro sin deformar.
    vec2 getCoverUv(vec2 uv, vec2 meshSize, vec2 textureSize) {
      vec2 meshRatio = vec2(meshSize.x / meshSize.y, meshSize.y / meshSize.x);
      vec2 textureRatio = vec2(textureSize.x / textureSize.y, textureSize.y / textureSize.x);
      vec2 ratio = vec2(min(meshRatio.x / textureRatio.x, 1.0), min(meshRatio.y / textureRatio.y, 1.0));
      return (uv - 0.5) * ratio + 0.5;
    }

    // Lente estilo "CC Lens": escala según la distancia al centro al cuadrado.
    float getCCLensScale(float distortion, float radius2) {
      if (distortion >= 0.0) return 1.0 + distortion * radius2;
      return 1.0 / (1.0 - distortion * radius2);
    }
    vec2 getCCLensUv(vec2 uv, float distortion) {
      vec2 c = uv - 0.5;
      float scale = getCCLensScale(distortion, dot(c, c));
      vec2 distorted = c * scale + 0.5;
      return uv - (distorted - uv);
    }

    // Ruido de Nikita Miropolskiy (shadertoy.com/view/XsX3zB).
    vec3 random3(vec3 c) {
      float j = 4096.0 * sin(dot(c, vec3(17.0, 59.4, 15.0)));
      vec3 r;
      r.z = fract(512.0 * j); j *= 0.125;
      r.x = fract(512.0 * j); j *= 0.125;
      r.y = fract(512.0 * j);
      return r - 0.5;
    }

    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

    void main() {
      // --- Afuera: grises con onda y ruido ---
      vec2 outsideUv = getCoverUv(v_uv, u_meshSize, u_textureSize);
      outsideUv.y += sin(outsideUv.y * u_waveFrequency + u_time * u_waveSpeed) * u_waveStrength;
      outsideUv += random3(vec3(outsideUv * u_randomFrequency, u_time * u_randomSpeed)).x * u_randomStrength;
      float gray = luma(texture2D(u_texture, outsideUv).rgb);
      vec4 outsideColor = vec4(vec3(gray), 1.0);

      // --- Máscara cuadrada que sigue al mouse ---
      vec2 aspect = vec2(min(u_meshSize.y / u_meshSize.x, 1.0), min(u_meshSize.x / u_meshSize.y, 1.0));
      vec2 uvSquare = v_uv * 2.0 - 1.0;   // −1..1, origen al centro
      uvSquare -= u_mouse;
      uvSquare /= aspect;                 // así el cuadrado no se estira

      float h = u_squareSize;
      float mask = step(-h, uvSquare.x) * (1.0 - step(h, uvSquare.x))
                 * step(-h, uvSquare.y) * (1.0 - step(h, uvSquare.y));

      // --- Adentro: lente + RGB radial ---
      vec2 squareUv = uvSquare / (h * 2.0) + 0.5;                 // 0..1 dentro del cuadrado
      vec2 lensOffset = getCCLensUv(squareUv, u_lensDistortion) - squareUv;
      vec2 viewportOffset = lensOffset * h * aspect;              // de UV local a UV de pantalla
      vec2 lensUv = getCoverUv(v_uv + viewportOffset, u_meshSize, u_textureSize);

      vec2 dir = (squareUv - 0.5) * 2.0;                          // 0 en el centro, ±1 en los bordes
      float r = texture2D(u_texture, lensUv + dir * u_rgbShiftR).r;
      float g = texture2D(u_texture, lensUv + dir * u_rgbShiftG).g;
      float b = texture2D(u_texture, lensUv + dir * u_rgbShiftB).b;
      vec4 insideColor = vec4(r, g, b, 1.0);

      gl_FragColor = mix(outsideColor, insideColor, mask);
    }`;

  /* ------------------------------------------------------------------------
     Arte de ejemplo: se dibuja en un canvas 2D (sin imágenes externas).
     ------------------------------------------------------------------------ */
  async function crearArte() {
    const W = 2400, H = 1500;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0d1b3d');
    bg.addColorStop(.5, '#1a0f2e');
    bg.addColorStop(1, '#06222a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Manchas de color: lo que se "descubre" dentro del lente.
    const blob = (x, y, r, color) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    blob(620, 520, 620, 'rgba(255,90,60,.95)');
    blob(1750, 420, 560, 'rgba(60,200,255,.85)');
    blob(1250, 1150, 640, 'rgba(190,242,100,.75)');
    blob(300, 1300, 420, 'rgba(255,60,170,.8)');
    blob(2200, 1250, 380, 'rgba(255,200,60,.8)');

    // Cuadrícula fina: deja ver bien la curvatura de la lente.
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Círculos concéntricos y puntos.
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    for (let r = 60; r < 520; r += 70) { ctx.beginPath(); ctx.arc(1750, 420, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let y = 980; y < 1420; y += 36) for (let x = 1500; x < 2300; x += 36) { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }

    // Tipografía gigante.
    try { await document.fonts.load('700 420px "Outfit"'); } catch (_) { /* cae a sans-serif */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 420px "Outfit", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.fillText('LENTE', W / 2, H / 2 + 20);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.font = '700 120px "Outfit", system-ui, sans-serif';
    ctx.strokeText('GLSL · WEBGL · GLSL · WEBGL', W / 2, 210);
    return c;
  }

  function cargarImagen(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /* ------------------------------------------------------------------------
     WebGL
     ------------------------------------------------------------------------ */
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });

  async function init() {
    const src = section.dataset.texture;
    let fuente;
    try { fuente = src ? await cargarImagen(src) : await crearArte(); } catch (_) { fuente = await crearArte(); }

    if (!gl) return sinWebGL(fuente);

    const prog = programa(VERT, FRAG);
    if (!prog) return sinWebGL(fuente);
    gl.useProgram(prog);

    // Un triángulo que cubre toda la pantalla (más simple que un quad).
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // Textura (no potencia de 2: sin mipmaps y con CLAMP).
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fuente);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const u = {};
    ['u_texture', 'u_meshSize', 'u_textureSize', 'u_mouse', 'u_time',
      ...Object.keys(DEFAULTS).filter((k) => k !== 'pointerEase').map((k) => `u_${k}`)]
      .forEach((n) => { u[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(u.u_texture, 0);
    gl.uniform2f(u.u_textureSize, fuente.width, fuente.height);

    // --- Tamaño ---
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.u_meshSize, w, h);
    }
    new ResizeObserver(resize).observe(canvas);
    resize();

    // --- Mouse: coordenadas −1..1 con Y hacia arriba, suavizadas con lerp ---
    const mouse = { x: 0, y: 0 };
    const ease = { x: 0, y: 0 };
    section.addEventListener('pointermove', (e) => {
      if (e.target.closest('.lens__panel')) return;
      const r = section.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    });

    // --- Loop: solo corre si la sección está visible y la pestaña activa ---
    let visible = true;
    let raf = 0;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; arrancar(); }).observe(section);
    document.addEventListener('visibilitychange', arrancar);

    function arrancar() {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;

      ease.x += (mouse.x - ease.x) * params.pointerEase;
      ease.y += (mouse.y - ease.y) * params.pointerEase;

      gl.uniform2f(u.u_mouse, ease.x, ease.y);
      gl.uniform1f(u.u_time, reduce ? 0 : now * 0.001);
      for (const k in params) if (u[`u_${k}`]) gl.uniform1f(u[`u_${k}`], params[k]);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }
    arrancar();
  }

  function programa(vsSrc, fsSrc) {
    const sh = (type, srcCode) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, srcCode);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, vsSrc);
    const fs = sh(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); return null; }
    return p;
  }

  // Sin WebGL: se muestra la imagen tal cual, sin efecto.
  function sinWebGL(fuente) {
    section.querySelector('.lens__fallback').hidden = false;
    section.querySelector('.lens__panel').hidden = true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width = canvas.clientWidth;
    const h = canvas.height = canvas.clientHeight;
    const s = Math.max(w / fuente.width, h / fuente.height);
    ctx.drawImage(fuente, (w - fuente.width * s) / 2, (h - fuente.height * s) / 2, fuente.width * s, fuente.height * s);
  }

  /* ------------------------------------------------------------------------
     Panel: cada <input name> corresponde a una clave de params.
     ------------------------------------------------------------------------ */
  if (form) {
    const inputs = [...form.querySelectorAll('input[type="range"]')];
    const pintar = (input) => {
      const out = input.nextElementSibling;
      if (out) out.textContent = Number(input.value).toFixed(input.step.includes('.') ? input.step.split('.')[1].length : 0);
    };
    inputs.forEach((input) => {
      input.defaultValue = String(DEFAULTS[input.name]);   // así "Restablecer" vuelve al valor del tutorial
      input.value = input.defaultValue;
      pintar(input);
    });
    form.addEventListener('input', (e) => {
      const input = e.target;
      if (!(input.name in params)) return;
      params[input.name] = Number(input.value);
      pintar(input);
    });
    form.addEventListener('reset', () => {
      // El reset del navegador corre después del evento: leer en el siguiente tick.
      setTimeout(() => inputs.forEach((input) => { params[input.name] = Number(input.value); pintar(input); }));
    });
  }

  init();
})();
