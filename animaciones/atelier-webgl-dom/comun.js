/* ==========================================================================
   Atelier WebGL + DOM · piezas compartidas por las dos páginas
   - Atelier.programa(): compila shaders.
   - Atelier.cargarImagen() / Atelier.textura(): carga la foto y la sube a WebGL.
   - Transición de píxeles entre páginas (cubre → navega → descubre).
   ========================================================================== */
window.Atelier = (() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CLAVE = 'atelier-transicion';

  function programa(gl, vsSrc, fsSrc) {
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
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
    // Mapa de uniforms por nombre, para no repetir getUniformLocation.
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    p.u = {};
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name;
      p.u[name] = gl.getUniformLocation(p, name);
    }
    return p;
  }

  function cargarImagen(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Sube una imagen/canvas como textura (sin mipmaps: sirve para cualquier tamaño).
  function textura(gl, fuente, premultiplicar = false) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplicar);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fuente);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    t.width = fuente.width;
    t.height = fuente.height;
    return t;
  }

  /* ------------------------------------------------------------------------
     Transición de píxeles
     Una grilla de cuadrados negros cubre la página en orden aleatorio, se
     navega, y en la página nueva se destapa cuando sus texturas ya cargaron.
     El <head> de cada página marca html.is-arriving si venimos de una
     transición, así no hay un cuadro de página descubierta.
     ------------------------------------------------------------------------ */
  const overlay = document.querySelector('.ptrans');
  let celdas = [];

  function armarGrilla() {
    if (!overlay) return;
    const cols = innerWidth < 640 ? 8 : 16;
    const lado = innerWidth / cols;
    const filas = Math.ceil(innerHeight / lado);
    overlay.style.setProperty('--cols', cols);
    overlay.style.setProperty('--filas', filas);
    overlay.replaceChildren();
    celdas = [];
    for (let i = 0; i < cols * filas; i++) {
      const c = document.createElement('i');
      overlay.appendChild(c);
      celdas.push(c);
    }
  }

  function barajarDemoras(total) {
    celdas.forEach((c) => c.style.setProperty('--d', `${reduce ? 0 : Math.random() * total}s`));
  }

  function cubrir() {
    return new Promise((resolve) => {
      if (!overlay) return resolve();
      barajarDemoras(0.45);
      overlay.classList.add('is-on');
      setTimeout(resolve, reduce ? 320 : 560);
    });
  }

  function descubrir() {
    if (!overlay) return;
    barajarDemoras(0.5);
    // Dos frames: la grilla recién creada tiene que pintarse cubierta antes de animar.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.classList.remove('is-on');
      document.documentElement.classList.remove('is-arriving');
    }));
  }

  if (overlay) {
    armarGrilla();
    if (document.documentElement.classList.contains('is-arriving')) {
      sessionStorage.removeItem(CLAVE);
      overlay.classList.add('is-on', 'is-instant');
      requestAnimationFrame(() => overlay.classList.remove('is-instant'));
    }

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-transition]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const destino = new URL(a.href, location.href);
      if (destino.pathname === location.pathname) { e.preventDefault(); return; }
      e.preventDefault();
      // Precarga en paralelo mientras se cubre (equivale al prop preload del original).
      (a.dataset.preload || '').split(',').filter(Boolean).forEach((src) => cargarImagen(src).catch(() => {}));
      cubrir().then(() => {
        sessionStorage.setItem(CLAVE, '1');
        location.href = destino.href;
      });
    });

    // Volver con atrás/adelante desde la caché: la página quedó cubierta.
    addEventListener('pageshow', (e) => { if (e.persisted) descubrir(); });

    let t;
    addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => { if (!overlay.classList.contains('is-on')) armarGrilla(); }, 200);
    });
  }

  return { reduce, programa, cargarImagen, textura, descubrir };
})();
