/**
 * Ritmo · one-page de zapatillas.
 *
 * 1. Tecnología: el despiece de sneaker-3d (sin scroll propio) dentro de un tramo sticky de la página.
 *    Un índice continuo f (0..N-1) sale del scroll: cerca de cada entero la etapa se "detiene" (hold) y entre
 *    enteros pasa a la siguiente. De f salen el progreso del despiece, la cámara, los textos, las flechas y el trazo.
 * 2. Trazo en recorrido: un path por cambio de etapa (pathLength = 1, dasharray 1 1). El offset va de 1 a -1:
 *    entra dibujándose y sale borrándose desde la cola.
 * 3. Flechas: cada etiqueta apunta a un punto de una pieza real del GLB, proyectado con la cámara en cada cuadro.
 * 4. Colección: el anillo de tarjetas CSS 3D de navegador-productos-3d, atado al scroll de la página.
 */
import { mountExploded } from "../../animaciones/sneaker-3d/src/exploded.js";
import { THREE } from "../../animaciones/sneaker-3d/src/stage.js";

const { gsap, ScrollTrigger } = window;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const rad = THREE.MathUtils.degToRad;
const isMobile = () => matchMedia("(max-width: 900px)").matches;

/**
 * Etapas. p = progreso del despiece (0..1 del timeline de sneaker-3d: 0–.1 armada, .1–.3 suela/capellada se separan,
 * .3–.52 detalle, .52–.62 despiece total, .62–.9 reensamble). cam = [objetivo xyz, azimut°, elevación°, distancia].
 * Flechas: part = pieza del GLB, at = punto en su caja (-1..1 por eje: x punta, y arriba, z lateral),
 * dx/dy = posición de la etiqueta respecto del punto, en px a 1440 de ancho. fit = encuadre en el teléfono: [ancho, alto]
 * que necesita la etapa (ver mobileDist); más chico = modelo más grande.
 */
const STAGES = [
  { p: 0, cam: [[.13, .085, 0], 38, 14, .95], fit: [.8, .65], callouts: [] },
  { p: .05, cam: [[.13, .09, 0], 10, 20, .92], fit: [.8, .65], callouts: [
    { part: "Mesh_Panel_Lat", at: [.15, .1, 1], dx: 240, dy: -110, t: "Malla de doble capa", d: "Perforaciones ovaladas: el aire circula y el pie no se recalienta." },
    { part: "Laces", at: [.2, 1, 0], dx: 40, dy: -190, t: "Siete ojales", d: "El cordón reparte la presión sobre todo el empeine." },
    { part: "Heel_Pull_Tab", at: [0, 1, 0], dx: -110, dy: -170, t: "Tirador de talón", d: "Se calza en un segundo, sin pisar el contrafuerte." },
    { part: "Toe_Box", at: [1, -.2, .6], dx: 150, dy: 90, t: "Puntera reforzada", d: "Film soldado que protege sin sumar costuras." },
  ] },
  { p: .3, cam: [[.14, .02, 0], 24, 7, 1.75], fit: [.91, 1], callouts: [
    { part: "Midsole", at: [1, 0, .4], dx: 170, dy: -70, t: "Entresuela EVA", d: "Absorbe el impacto del talón en cada apoyo." },
    { part: "Foam_Cushioning_Layer", at: [.4, 0, 1], dx: 250, dy: 60, t: "Capa de perlas", d: "TPU expandido: devuelve hasta 70% de la energía de la pisada." },
    { part: "Outsole_Forefoot", at: [.3, -1, .5], dx: 170, dy: 150, t: "Goma de tracción", d: "Tacos con surcos que agarran en asfalto mojado." },
    { part: "Shank", at: [-.6, 0, 0], dx: -200, dy: 60, t: "Placa de estabilidad", d: "Evita que el medio pie se tuerza en las curvas." },
  ] },
  { p: .56, cam: [[.15, .11, 0], 34, 15, 2.5], fit: [.75, .7], callouts: [
    { part: "Heel_Counter", at: [-1, 0, 0], dx: -170, dy: 120, t: "Contrafuerte TPU", d: "Sostiene el talón sin rigidizar el tobillo." },
    { part: "Tongue_Padding", at: [0, 1, 0], dx: 230, dy: -110, t: "Lengüeta acolchada", d: "Anclada a la capellada: no se corre al correr." },
    { part: "Collar", at: [-.4, 1, 0], dx: -200, dy: -60, t: "Cuello acolchado", d: "Espuma de memoria alrededor del tobillo." },
    { part: "Insole", at: [.6, 0, 1], dx: 250, dy: 10, t: "Plantilla anatómica", d: "Copa de talón y arco que copian la forma del pie." },
    { part: "Side_Overlay_Lat", at: [0, 0, 1], dx: 200, dy: 170, t: "Refuerzos laterales", d: "Tiras soldadas que sujetan el pie en los cambios de ritmo." },
  ] },
  { p: 1, cam: [[.14, .07, 0], -30, 11, 1.0], fit: [.8, .65], callouts: [] },
];
const N = STAGES.length;
// teléfono: la distancia alcanza para que entre el ancho (fit[0] / aspecto) y el alto (fit[1]) de lo que se ve en la etapa
const mobileDist = (a, b, t, dist, aspect) => dist * Math.max(lerp(a.fit[0], b.fit[0], t) / aspect, lerp(a.fit[1], b.fit[1], t));
const HOLD = .22;                         // fracción de etapa que queda quieta a cada lado del entero

/* ── Carrito (demo) ────────────────────────────────────────────────────── */
const cart = $("[data-cart]"), cartCount = $("[data-cart-count]");
let items = 0;
function addToCart(btn) {
  cartCount.textContent = ++items;
  cart.classList.remove("is-bump"); void cart.offsetWidth; cart.classList.add("is-bump");
  if (btn) { const txt = btn.textContent; btn.textContent = "Agregado ✓"; btn.disabled = true; setTimeout(() => { btn.textContent = txt; btn.disabled = false; }, 1300); }
}
$$("[data-add]").forEach((b) => b.addEventListener("click", () => addToCart(b)));

if (gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add("rt-motion");
  initTech();
  initCollection();
}

/* ── Navbar: toma el tema de la sección que tiene debajo ────────────────── */
{
  const nav = $("[data-nav]"), zones = $$("[data-nav-theme]");
  let queued = false;
  const update = () => {
    queued = false;
    const y = nav.offsetHeight / 2;                                           // la sección que pasa por el medio de la barra
    const zone = zones.find((z) => { const r = z.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
    nav.dataset.theme = zone?.dataset.navTheme || "light";
    nav.classList.toggle("is-scrolled", scrollY > 8);
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener("scroll", queue, { passive: true }); addEventListener("resize", queue); update();
}

/* ═════════════════════════════════════════════════════════════════════════
   1 · Tecnología
   ═════════════════════════════════════════════════════════════════════════ */
function initTech() {
  const track = $("[data-track]"), model = $("[data-model]"), svg = $("[data-callouts]"), labelsBox = $("[data-labels]");
  const steps = $$("[data-stage]"), ribbons = $$("[data-ribbon]"), thins = $$("[data-ribbon-thin]");
  const railFill = $("[data-rail-fill]"), railBtns = $$("[data-goto]"), hint = $("[data-hint]"), bigword = $("[data-bigword]"), loading = $("[data-loading]");
  const NS = "http://www.w3.org/2000/svg", copyBox = $(".rt-copy");
  const state = { f: 0 };
  let exp = null, callouts = [], activeRail = -1;

  // largo del tramo: 100vh de escenario + 140vh por cambio de etapa
  track.style.height = `${100 + (N - 1) * 140}vh`;

  // índice continuo f desde el scroll, con inercia (scrub) y snap a cada etapa
  gsap.to(state, {
    f: N - 1, ease: "none",
    scrollTrigger: { trigger: track, start: "top top", end: "bottom bottom", scrub: .8, snap: { snapTo: 1 / (N - 1), duration: { min: .25, max: .8 }, delay: .12, ease: "power2.inOut", inertia: false } },
    onUpdate: () => render(state.f),
  });

  // riel: cada punto lleva a su etapa
  railBtns.forEach((b) => b.addEventListener("click", () => {
    const i = +b.dataset.goto, top = track.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + (i / (N - 1)) * (track.offsetHeight - innerHeight), behavior: "smooth" });
  }));

  // etiquetas + flechas (el DOM se arma ya; la pieza se engancha cuando carga el modelo).
  // En el teléfono: pin numerado sobre la pieza + leyenda (una lista por etapa) en vez de flecha y etiqueta.
  const legendBox = $("[data-legend]"), legends = [];
  let pick = { stage: -1, i: 0, at: -1e9 };                                    // pieza elegida a mano (tocando chip o pin)
  const CYCLE = 2400, PICK_HOLD = 8000;
  // pieza destacada de una etapa: la elegida a mano por un rato; si no, van rotando solas
  const activeOf = (stage, n, now) => pick.stage === stage && now - pick.at < PICK_HOLD ? pick.i : Math.floor(now / CYCLE) % n;
  STAGES.forEach((s, si) => {
    const ol = document.createElement("ol");
    if (s.callouts.length) { legendBox.append(ol); legends.push({ stage: si, ol }); }
    s.callouts.forEach((c, ci) => {
      const g = document.createElementNS(NS, "g");
      const ln = document.createElementNS(NS, "path"); ln.setAttribute("class", "ln"); ln.setAttribute("pathLength", "1");
      const hd = document.createElementNS(NS, "path"); hd.setAttribute("class", "hd");
      const ring = document.createElementNS(NS, "circle"); ring.setAttribute("class", "ring");
      const dot = document.createElementNS(NS, "circle"); dot.setAttribute("class", "dot"); dot.setAttribute("r", "4.5");
      const num = document.createElementNS(NS, "text"); num.setAttribute("class", "num"); num.textContent = ci + 1;
      g.append(ln, ring, dot, hd, num); svg.append(g);
      const label = document.createElement("div"); label.className = "rt-label"; label.innerHTML = `<b>${c.t}</b><span>${c.d}</span>`; labelsBox.append(label);
      const li = document.createElement("li"); li.innerHTML = `<button type="button" tabindex="-1"><i>${ci + 1}</i><span>${c.t}</span></button>`; ol.append(li);
      const choose = () => { pick = { stage: si, i: ci, at: performance.now() }; drawCallouts(state.f); };
      li.firstChild.addEventListener("click", choose); g.addEventListener("click", choose);
      callouts.push({ ...c, stage: si, idx: ci, g, ln, hd, ring, dot, num, label, li, local: null, obj: null });
    });
  });
  // teléfono: el modelo ocupa lo que dejan la leyenda más alta y el texto más alto de las etapas con leyenda
  const sticky = $("[data-sticky]");
  const fitLayout = () => {
    if (!isMobile()) return sticky.style.removeProperty("--copy-h"), sticky.style.removeProperty("--legend-h");
    const withLegend = steps.filter((el) => STAGES[+el.dataset.stage].callouts.length);
    sticky.style.setProperty("--copy-h", `${Math.ceil(Math.max(...withLegend.map((el) => el.offsetHeight)))}px`);
    sticky.style.setProperty("--legend-h", `${Math.ceil(Math.max(0, ...legends.map((l) => l.ol.offsetHeight)))}px`);
  };
  fitLayout(); addEventListener("resize", fitLayout); document.fonts?.ready.then(fitLayout);

  mountExploded(model, {
    scroll: false, captions: false,
    onLoad: (p) => { loading.textContent = `Cargando modelo ${Math.round(p * 100)}%`; },
  }).then((e) => {
    if (!e) return;
    exp = window.__ritmo = e;
    loading.classList.add("is-done");
    // anclas: punto de la caja de cada pieza, guardado en coordenadas locales (sigue a la pieza cuando se mueve)
    e.setProgress(0); e.stage.scene.updateMatrixWorld(true);
    const byName = new Map(e.parts.map((p) => [p.o.name.replace(/_R$/, ""), p.o]));
    const box = new THREE.Box3(), ctr = new THREE.Vector3(), half = new THREE.Vector3();
    callouts = callouts.filter((c) => {
      const o = byName.get(c.part);
      if (!o) { console.warn("ritmo: falta la pieza", c.part); c.g.remove(); c.label.remove(); return false; }
      box.setFromObject(o); box.getCenter(ctr); box.getSize(half).multiplyScalar(.5);
      c.obj = o; c.local = o.worldToLocal(ctr.clone().add(half.clone().multiply(new THREE.Vector3(...c.at))));
      return true;
    });
    e.stage.onResize = () => render(state.f);                                  // la cámara la maneja la página
    render(state.f);
  }).catch((err) => { loading.textContent = "No se pudo cargar el modelo"; console.error(err); });

  const v = new THREE.Vector3();
  function render(f) {
    const i = Math.min(Math.floor(f), N - 2), frac = f - i;
    const t = smooth(HOLD, 1 - HOLD, frac);                                   // 0 en el hold de la etapa i, 1 en el de i+1
    const a = STAGES[i], b = STAGES[i + 1];

    // textos de cada etapa
    steps.forEach((el) => {
      const d = f - +el.dataset.stage, k = clamp((.42 - Math.abs(d)) / .2);
      el.style.opacity = k; el.style.transform = `translateY(${-d * 70}px)`;
      el.classList.toggle("is-on", k > .02);
    });
    // trazo en recorrido: uno por cambio de etapa
    ribbons.forEach((p, j) => { const u = clamp((f - j - .1) / .8); p.style.strokeDashoffset = 1 - 2 * u; });
    thins.forEach((p, j) => { const u = clamp((f - j - .04) / .8); p.style.strokeDashoffset = 1 - 2 * u; });
    // riel, pista y palabra de fondo
    railFill.style.transform = `scaleY(${f / (N - 1)})`;
    const on = Math.round(f); if (on !== activeRail) { activeRail = on; railBtns.forEach((btn, j) => btn.classList.toggle("is-on", j === on)); }
    hint.style.opacity = clamp(1 - f * 4);
    bigword.style.opacity = Math.max(clamp(1 - f * 1.8), clamp((f - (N - 1.6)) / .6));

    if (!exp) return;
    // despiece + cámara propia de la página
    exp.setProgress(lerp(a.p, b.p, t));
    const [ta, aza, ela, da] = a.cam, [tb, azb, elb, db] = b.cam;
    exp.stage.look(lerp(ta[0], tb[0], t), lerp(ta[1], tb[1], t), lerp(ta[2], tb[2], t), rad(lerp(aza, azb, t)), rad(lerp(ela, elb, t)), ...(isMobile() ? [mobileDist(a, b, t, lerp(da, db, t), exp.stage.aspect), 0] : [lerp(da, db, t), 1.3]));
    drawCallouts(f);
  }

  function drawCallouts(f) {
    const { camera, scene, width: W, height: H } = exp.stage;
    camera.updateMatrixWorld(); scene.updateMatrixWorld();
    const s = clamp(innerWidth / 1440, .5, 1), mob = isMobile();
    // las etiquetas de la izquierda no pisan el texto de la etapa
    if (mob) return drawPins(f, camera, W, H);
    const minL = Math.max(8, copyBox.getBoundingClientRect().right - model.getBoundingClientRect().left + 16);
    for (const c of callouts) {
      c.ln.style.display = c.hd.style.display = c.num.style.display = c.label.style.display = "";
      c.dot.setAttribute("r", "4.5"); c.g.style.opacity = ""; c.num.style.display = "none";
      const k = clamp((.36 - Math.abs(f - c.stage)) / .14);
      c.g.style.display = c.label.style.display = k > 0 ? "" : "none";
      if (k <= 0) continue;
      v.copy(c.local).applyMatrix4(c.obj.matrixWorld).project(camera);
      const ax = (v.x + 1) / 2 * W, ay = (1 - v.y) / 2 * H;
      const right = c.dx >= 0, lw = c.label.offsetWidth || 200, dir = right ? 1 : -1;
      const sx = mob ? .62 : s, sy = mob ? .55 : s;
      // la etiqueta no se sale de la caja del modelo
      const lx = clamp(ax + c.dx * sx, right ? 12 : minL + lw + 10, right ? W - lw - (mob ? 40 : 120) : W - 12);
      const ly = clamp(ay + c.dy * sy, 70, H - (mob ? 30 : 80));
      const ex = lx - dir * 26;                                                // codo: tramo horizontal y después diagonal a la pieza
      const ang = Math.atan2(ay - ly, ax - ex), tipX = ax - Math.cos(ang) * 8, tipY = ay - Math.sin(ang) * 8;
      c.ln.setAttribute("d", `M${lx},${ly} H${ex} L${tipX},${tipY}`);
      c.ln.style.strokeDashoffset = 1 - k;
      const hx = Math.cos(ang), hy = Math.sin(ang), back = 9, wing = 4.5;
      c.hd.setAttribute("d", `M${tipX},${tipY} L${tipX - hx * back - hy * wing},${tipY - hy * back + hx * wing} L${tipX - hx * back + hy * wing},${tipY - hy * back - hx * wing}Z`);
      c.hd.style.opacity = smooth(.75, 1, k);
      c.dot.setAttribute("cx", ax); c.dot.setAttribute("cy", ay); c.dot.style.opacity = smooth(.85, 1, k);
      c.ring.setAttribute("cx", ax); c.ring.setAttribute("cy", ay); c.ring.setAttribute("r", 9 + 5 * Math.sin(performance.now() / 300));
      c.ring.style.opacity = .35 * smooth(.85, 1, k);
      c.label.classList.toggle("is-left", !right);
      c.label.style.opacity = smooth(.3, 1, k);
      c.label.style.transform = `translate(${right ? lx + 10 : lx - 10 - lw}px, ${ly - 13 + (1 - k) * 12}px)`;
    }
  }

  // teléfono: pines numerados sobre cada pieza (sin flechas) + leyenda que entra con la etapa
  function drawPins(f, camera, W, H) {
    const now = performance.now(), pulse = Math.sin(now / 300), pins = [];
    const R = 8, RA = 12;                                                     // pin normal / pin destacado
    for (const c of callouts) {
      const k = clamp((.36 - Math.abs(f - c.stage)) / .14);
      c.g.style.display = k > 0 ? "" : "none";
      c.ln.style.display = c.hd.style.display = c.label.style.display = "none";
      if (k <= 0) continue;
      v.copy(c.local).applyMatrix4(c.obj.matrixWorld).project(camera);
      pins.push({ c, k, x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H });
    }
    // separa los pines que caen encima de otro (piezas vecinas en el despiece)
    for (let it = 0; it < 4; it++) for (let a = 0; a < pins.length; a++) for (let b = a + 1; b < pins.length; b++) {
      const p = pins[a], q = pins[b], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || .01, min = R * 2 + 6;
      if (d < min) { const push = (min - d) / 2, ux = dx / d, uy = dy / d; p.x -= ux * push; p.y -= uy * push; q.x += ux * push; q.y += uy * push; }
    }
    for (const p of pins) { p.x = clamp(p.x, RA + 6, W - RA - 6); p.y = clamp(p.y, RA + 6, H - RA - 6); }   // nunca debajo de la leyenda
    for (const { c, k, x, y } of pins) {
      const e = smooth(.5, 1, k), sc = .4 + .6 * e, n = STAGES[c.stage].callouts.length, on = activeOf(c.stage, n, now) === c.idx;
      // la animación del pin destacado: crece y late; el resto queda chico y claro
      c.grow = lerp(c.grow ?? 0, on ? 1 : 0, .18);
      const r = lerp(R, RA, c.grow) * sc;
      c.g.style.opacity = e; c.g.classList.toggle("is-on", on); c.li.classList.toggle("is-on", on);
      if (on && !c.wasOn) c.g.parentNode.append(c.g);                         // el destacado queda arriba de los demás
      c.wasOn = on;
      c.dot.setAttribute("cx", x); c.dot.setAttribute("cy", y); c.dot.setAttribute("r", r); c.dot.style.opacity = 1;
      c.num.setAttribute("x", x); c.num.setAttribute("y", y); c.num.style.display = ""; c.num.style.opacity = smooth(.8, 1, k);
      c.num.style.fontSize = `${9 + 2.5 * c.grow}px`;
      c.ring.setAttribute("cx", x); c.ring.setAttribute("cy", y); c.ring.setAttribute("r", r + 5 + 3 * pulse); c.ring.style.opacity = .5 * e * c.grow;
    }
    for (const { stage, ol } of legends) {
      const k = clamp((.36 - Math.abs(f - stage)) / .14);
      ol.style.opacity = smooth(.3, 1, k); ol.classList.toggle("is-on", k > 0);
      [...ol.children].forEach((li, j) => { li.style.transform = `translateY(${(1 - smooth(.2 + j * .1, 1, k)) * 10}px)`; });
    }
  }

  // el anillo de pulso sigue latiendo con la etapa quieta
  gsap.ticker.add(() => { if (exp && Math.abs(state.f - Math.round(state.f)) < .36 && STAGES[Math.round(state.f)].callouts.length) drawCallouts(state.f); });
  render(0);
}

/* ═════════════════════════════════════════════════════════════════════════
   2 · Colección: navegador de productos 3D (de navegador-productos-3d, sin overlay)
   ═════════════════════════════════════════════════════════════════════════ */
function initCollection() {
  const NEXT = { x: 1.08, z: .45, rot: 26 };   // las que vienen (derecha)
  const PREV = { x: .8, z: .3, rot: 78 };      // las que se van (izquierda, casi de canto)
  const track = $("[data-col-track]"), list = $("[data-col-list]");
  const titles = $$(".rt-col__item"), cards = $$(".pcard"), data = $$("[data-col-data] li");
  const info = $("[data-col-info]"), count = cards.length;
  const out = { name: $("[data-col-name]"), type: $("[data-col-type]"), price: $("[data-col-price]"), desc: $("[data-col-desc]"), index: $("[data-col-index]") };
  const prev = $("[data-col-prev]"), next = $("[data-col-next]"), add = $("[data-col-add]");
  $("[data-col-total]").textContent = String(count).padStart(2, "0");

  const css = getComputedStyle(document.documentElement);
  const colorAt = gsap.utils.interpolate(css.getPropertyValue("--lime").trim() || "#c9e23a", "#f3f2ee");
  const state = { t: 0 };
  let centers = [], cardW = 300, active = -1;

  track.style.height = `${100 + (count - 1) * 70}vh`;
  const measure = () => {
    centers = titles.map((it) => { const ti = it.querySelector(".rt-col__title"); return ti.offsetTop + ti.offsetHeight / 2; });   // offsetParent del título = la lista
    cardW = cards[0].offsetWidth || 300;
  };

  function render(t) {
    cards.forEach((card, i) => {
      const d = i - t, far = Math.abs(d), side = d >= 0 ? NEXT : PREV;
      gsap.set(card, { xPercent: -50, yPercent: -50, x: d * side.x * cardW, z: -far * side.z * cardW, rotationY: d * side.rot, opacity: clamp(d < 0 ? 1.9 - far * 1.2 : 2.7 - far), zIndex: 100 - Math.round(far * 10) });
    });
    const i0 = clamp(Math.floor(t), 0, count - 1), i1 = clamp(i0 + 1, 0, count - 1), f = t - i0;
    const line = innerHeight * (isMobile() ? .66 : .6);
    gsap.set(list, { y: line - lerp(centers[i0], centers[i1], f) });
    titles.forEach((it, i) => {
      it.style.color = colorAt(clamp(1 - Math.abs(i - t)));
      it.style.opacity = isMobile() ? clamp(1 - (t - i - .3) * 1.6) : "";
    });
    const n = clamp(Math.round(t), 0, count - 1);
    if (n !== active) setActive(n);
  }
  function setActive(i) {
    const first = active === -1; active = i;
    titles.forEach((it, j) => it.setAttribute("aria-current", j === i ? "true" : "false"));
    prev.disabled = i === 0; next.disabled = i === count - 1;
    const swap = () => {
      const d = data[i].dataset;
      out.name.textContent = d.name; out.type.textContent = d.type; out.price.textContent = d.price; out.desc.textContent = d.desc;
      out.index.textContent = String(i + 1).padStart(2, "0");
    };
    if (first || matchMedia("(prefers-reduced-motion: reduce)").matches) return swap();
    gsap.timeline({ overwrite: true })
      .to(info, { y: -10, opacity: .002, duration: .18, ease: "power2.in" }).add(swap)
      .fromTo(info, { y: 14 }, { y: 0, opacity: 1, duration: .45, ease: "power3.out" });
  }

  // el scroll da el destino; quickTo lo suaviza
  const followT = gsap.quickTo(state, "t", { duration: .9, ease: "power3.out", onUpdate: () => render(state.t) });
  const st = ScrollTrigger.create({
    trigger: track, start: "top top", end: "bottom bottom",
    snap: { snapTo: 1 / (count - 1), duration: { min: .25, max: .7 }, delay: .1, ease: "power2.inOut", inertia: false },
    onUpdate: (s) => followT(s.progress * (count - 1)),
  });
  const goTo = (i) => {
    i = clamp(i, 0, count - 1);
    scrollTo({ top: st.start + (i / (count - 1)) * (st.end - st.start), behavior: "smooth" });
  };
  titles.forEach((it) => it.addEventListener("click", () => goTo(+it.dataset.index)));
  prev.addEventListener("click", () => goTo(active - 1));
  next.addEventListener("click", () => goTo(active + 1));
  add.addEventListener("click", () => addToCart(add));

  measure(); render(0);
  addEventListener("resize", () => { measure(); render(state.t); });
  document.fonts?.ready.then(() => { measure(); render(state.t); });
}
