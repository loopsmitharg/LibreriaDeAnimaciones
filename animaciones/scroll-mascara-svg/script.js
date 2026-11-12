/* ==========================================================================
   Transiciones de scroll con máscara SVG
   Inspirado en "On-Scroll SVG Mask Transitions" (Codrops). Reconstrucción propia.

   Idea: cada escena es un <svg> con un <mask>. El fondo de la máscara es negro
   (oculta todo) y encima hay rectángulos blancos (muestran). Al scrollear, los
   rectángulos crecen o aparecen y la escena se destapa sobre la anterior.
   Un único timeline con scrub encadena máscaras y textos.
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const stage = document.querySelector('[data-mstage]');
  if (!stage) return;

  // Sin GSAP o con movimiento reducido: queda el estado base (escenas en flujo).
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!window.gsap || !window.ScrollTrigger || reduce) return;

  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('is-mask-animated');

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const FRANJAS_H = 30;   // persianas horizontales
  const FRANJAS_V = 12;   // persianas verticales
  const SOLAPE = 0.01;    // unidades SVG extra para que no queden rendijas entre franjas

  const scenes = gsap.utils.toArray('.mscene', stage);
  const texts = scenes.map((s) => s.querySelector('[data-mtxt]'));
  const fills = gsap.utils.toArray('.mprogress__seg i', stage);
  const buttons = gsap.utils.toArray('.mvar__btn');

  // Columnas de las grillas según el ancho (igual que el original: 6 / 10 / 14).
  const columnasGrilla = () => (innerWidth <= 599 ? 6 : innerWidth <= 1024 ? 10 : 14);

  const rect = (g, attrs) => {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('fill', 'white');
    r.setAttribute('shape-rendering', 'crispEdges');
    for (const k in attrs) r.setAttribute(k, attrs[k]);
    g.appendChild(r);
    return r;
  };

  /* ------------------------------------------------------------------------
     Variantes. build(g, w, h) dibuja la máscara cerrada y devuelve un estado;
     open(estado) devuelve el tween que la abre (sin duración fija: el scrub
     la reparte según la posición en el timeline).
     ------------------------------------------------------------------------ */
  const VARIANTES = {
    // Franjas horizontales que se abren desde su línea central, de abajo hacia arriba.
    'persianas-h': {
      build(g, w, h) {
        const alto = h / FRANJAS_H;
        const franjas = [];
        for (let i = 0; i < FRANJAS_H; i++) {
          const centro = h - (i * alto + alto / 2);
          const arriba = rect(g, { x: 0, y: centro, width: w, height: 0 });
          const abajo = rect(g, { x: 0, y: centro, width: w, height: 0 });
          franjas.push({ arriba, abajo, centro, mitad: alto / 2 });
        }
        return franjas;
      },
      open(franjas) {
        const tl = gsap.timeline();
        franjas.forEach((f, i) => {
          const at = i * 0.035;
          tl.to(f.arriba, { attr: { y: f.centro - f.mitad - SOLAPE, height: f.mitad + SOLAPE }, duration: 0.6, ease: 'power3.out' }, at)
            .to(f.abajo, { attr: { height: f.mitad + SOLAPE }, duration: 0.6, ease: 'power3.out' }, at);
        });
        return tl;
      },
    },

    // Celdas que aparecen en orden aleatorio.
    grilla: {
      build: (g, w, h) => construirGrilla(g, w, h),
      open({ celdas }) {
        return gsap.to(gsap.utils.shuffle([...celdas]), {
          attr: { opacity: 1 }, duration: 0.8, ease: 'power3.out', stagger: { each: 0.012 },
        });
      },
    },

    // Franjas verticales que se abren desde su centro, de izquierda a derecha.
    'persianas-v': {
      build(g, w, h) {
        const ancho = w / FRANJAS_V;
        const franjas = [];
        for (let i = 0; i < FRANJAS_V; i++) {
          const centro = i * ancho + ancho / 2;
          const izq = rect(g, { x: centro, y: 0, width: 0, height: h });
          const der = rect(g, { x: centro, y: 0, width: 0, height: h });
          franjas.push({ izq, der, centro, mitad: ancho / 2 });
        }
        return franjas;
      },
      open(franjas) {
        const tl = gsap.timeline();
        franjas.forEach((f, i) => {
          const at = i * 0.08;
          tl.to(f.izq, { attr: { x: f.centro - f.mitad - SOLAPE, width: f.mitad + SOLAPE }, duration: 0.7, ease: 'none' }, at)
            .to(f.der, { attr: { width: f.mitad + SOLAPE }, duration: 0.7, ease: 'none' }, at);
        });
        return tl;
      },
    },

    // Columna por columna (izquierda → derecha), celdas mezcladas dentro de cada columna.
    columnas: {
      build: (g, w, h) => construirGrilla(g, w, h),
      open({ celdas, filas, cols }) {
        const orden = [];
        for (let x = 0; x < cols; x++) {
          const columna = [];
          for (let y = 0; y < filas; y++) columna.push(celdas[y * cols + x]);
          orden.push(...gsap.utils.shuffle(columna));
        }
        return gsap.to(orden, { attr: { opacity: 1 }, duration: 0.8, ease: 'power3.out', stagger: { each: 0.012 } });
      },
    },
  };

  function construirGrilla(g, w, h) {
    const cols = columnasGrilla();
    const filas = Math.max(1, Math.round(cols * (h / w)));
    const cw = w / cols;
    const ch = h / filas;
    const celdas = [];
    for (let y = 0; y < filas; y++) {
      for (let x = 0; x < cols; x++) {
        celdas.push(rect(g, { x: x * cw, y: y * ch, width: cw + SOLAPE, height: ch + SOLAPE, opacity: 0 }));
      }
    }
    return { celdas, filas, cols };
  }

  /* ------------------------------------------------------------------------
     Construcción: ajusta viewBox a la pantalla y arma el timeline maestro.
     ------------------------------------------------------------------------ */
  let variante = VARIANTES[location.hash.slice(1)] ? location.hash.slice(1) : 'persianas-h';
  let master;

  function build() {
    if (master) {
      master.scrollTrigger.kill();
      master.kill();
    }

    // 1 unidad SVG = 1% del ancho; el alto sigue la proporción de la pantalla.
    const w = 100;
    const h = (innerHeight / innerWidth) * 100;
    const v = VARIANTES[variante];

    const estados = scenes.map((scene) => {
      const svg = scene.querySelector('.mscene__svg');
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      for (const el of svg.querySelectorAll('mask, .mscene__maskBg, .mscene__art')) {
        el.setAttribute('width', w);
        el.setAttribute('height', h);
      }
      const g = svg.querySelector('[data-mask]');
      g.replaceChildren();
      return v.build(g, w, h);
    });

    gsap.set(texts, { clipPath: 'inset(100% 0% 0% 0%)', y: 40 });

    master = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5,
        onUpdate: (self) => pintarProgreso(self.progress),
      },
    });

    estados.forEach((estado, i) => {
      master.add(v.open(estado));
      const txt = texts[i];
      if (!txt) return;
      master.to(txt, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.2, ease: 'expo.out' }, '-=0.3');
      // El último texto se queda: la escena final termina "llena".
      if (i < estados.length - 1) {
        master.to(txt, { clipPath: 'inset(0% 0% 100% 0%)', y: -30, duration: 1, ease: 'power2.inOut' }, '+=0.8');
      } else {
        master.to({}, { duration: 0.6 });
      }
    });

    pintarProgreso(master.scrollTrigger.progress);
  }

  // Barra segmentada: cada segmento se llena en su tercio del recorrido.
  function pintarProgreso(p) {
    const n = fills.length;
    fills.forEach((f, i) => gsap.set(f, { scaleX: gsap.utils.clamp(0, 1, p * n - i) }));
  }

  function elegir(nombre) {
    if (!VARIANTES[nombre] || nombre === variante) return;
    variante = nombre;
    history.replaceState(null, '', `#${nombre}`);
    marcarBotones();
    build();
  }

  function marcarBotones() {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.variant === variante)));
  }

  buttons.forEach((b) => b.addEventListener('click', () => elegir(b.dataset.variant)));
  marcarBotones();
  build();

  // Al cambiar el tamaño cambia la proporción: se rehacen las máscaras.
  let t;
  let ancho = innerWidth;
  addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      // En móvil la barra de direcciones cambia el alto al scrollear: solo reconstruir si cambia el ancho
      // o si el alto cambió mucho.
      if (innerWidth === ancho && Math.abs(innerHeight - (build.lastH || innerHeight)) < 120) return;
      ancho = innerWidth;
      build.lastH = innerHeight;
      build();
    }, 250);
  });
  build.lastH = innerHeight;
})();
