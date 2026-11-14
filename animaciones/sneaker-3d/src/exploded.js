/**
 * EXPLODED SNEAKER — despiece y reconstrucción controlados por scroll.
 *
 *   import { mountExploded } from "./src/exploded.js";
 *   const exp = await mountExploded(document.querySelector("#hero"));          // crea el tramo de scroll adentro
 *   exp.destroy();
 *   // sin scroll propio: mountExploded(el, { scroll: false }) y manejar exp.setProgress(0..1) desde donde sea.
 *
 * Un timeline maestro (duración 100) mueve dos escalares por pieza: `a` (separación mayor) y `b` (detalle).
 * La pose de cada pieza es función pura de (a, b): reposo + A·a + B·b + arco, rotación = slerp(reposo, exhibición).
 * Con a = b = 0 se copia la transformación original exacta: no quedan residuos.
 * Ejes (three): X = largo hacia la punta, Y = arriba, Z = lateral (+) / medial (-). Offsets en metros.
 */
import { createStage, THREE, quality } from "./stage.js";
import { loadGLB, release, MODELS } from "./loader.js";
import { prepare } from "./materials.js";
import { stickyTrack, bindScroll } from "./scroll.js";

const U = [0, .17, 0];                                                        // la capellada sube entera en la primera etapa
/** pieza: { a, b, r (grados, rotación de exhibición), arc, t: [inicio, duración] del detalle, ease } */
export const PARTS = {
  // ── suela: piezas pesadas, recorridos largos ──
  Insole: { a: [0, .045, 0], ta: [14, 13], ease: "power2.inOut" },
  Strobel: { a: [0, .012, 0], ta: [13, 12], ease: "power2.inOut" },
  Midsole: { a: [0, -.05, 0], ta: [10, 17], ease: "power2.inOut" },
  Foam_Cushioning_Layer: { a: [0, -.105, 0], ta: [11, 18], ease: "power2.inOut" },
  Shank: { a: [0, -.138, 0], r: [-14, 0, 0], ta: [12.5, 16], ease: "power3.inOut" },
  Outsole_Forefoot: { a: [.018, -.178, 0], r: [-24, 0, 0], arc: [0, 0, .03], ta: [13, 17], ease: "power3.inOut" },
  Outsole_Heel: { a: [-.018, -.178, 0], r: [-24, 0, 0], arc: [0, 0, .03], ta: [14, 16], ease: "power3.inOut" },
  // ── capellada: sube como unidad (a = U) y después cada capa va a su lugar de exhibición ──
  Upper_Base: { a: U },
  Laces: { a: U, b: [0, .15, 0], t: [28, 12], ease: "power3.out" },
  Lace_Bow: { a: U, b: [-.02, .185, 0], t: [28, 13], ease: "power3.out" },
  Eyelets_Lat: { a: U, b: [0, .075, .022], t: [30, 10], ease: "power3.out" },
  Eyelets_Med: { a: U, b: [0, .075, -.022], t: [30.5, 10], ease: "power3.out" },
  Tongue_Padding: { a: U, b: [-.03, .135, 0], r: [0, 0, 6], t: [31, 12], ease: "power2.out" },
  Tongue: { a: U, b: [-.01, .10, 0], r: [0, 0, 4], t: [32, 13], ease: "power2.inOut" },
  Eyestay: { a: U, b: [0, .05, 0], t: [33, 12], ease: "power2.inOut" },
  Toe_Reinforcement: { a: U, b: [.21, -.01, 0], r: [0, 0, -8], arc: [0, .02, 0], t: [34, 13], ease: "power2.inOut" },
  Toe_Box: { a: U, b: [.11, .015, 0], r: [0, 0, -4], t: [36, 13], ease: "power2.inOut" },
  Side_Overlay_Lat: { a: U, b: [0, -.02, .21], r: [-10, 0, 0], arc: [0, .015, 0], t: [35, 12], ease: "power3.out" },
  Side_Overlay_Med: { a: U, b: [0, -.02, -.21], r: [10, 0, 0], arc: [0, .015, 0], t: [35.5, 12], ease: "power3.out" },
  Mesh_Panel_Lat: { a: U, b: [0, -.01, .12], r: [-6, 0, 0], t: [37, 13], ease: "power2.inOut" },
  Mesh_Panel_Med: { a: U, b: [0, -.01, -.12], r: [6, 0, 0], t: [37.5, 13], ease: "power2.inOut" },
  Heel_Pull_Tab: { a: U, b: [-.19, .085, 0], r: [0, 0, 10], t: [36, 10], ease: "power3.out" },
  Collar: { a: U, b: [-.10, .075, 0], t: [37, 12], ease: "power2.out" },
  Branding_Panel: { a: U, b: [-.10, 0, .10], t: [38, 10], ease: "power3.out" },
  Heel_Counter: { a: U, b: [-.21, -.02, 0], r: [0, 0, 6], arc: [0, .02, 0], t: [38, 13], ease: "power2.inOut" },
  Heel_Panel: { a: U, b: [-.10, 0, 0], t: [39, 12], ease: "power2.inOut" },
  Lining: { a: U, b: [-.03, -.085, 0], t: [40, 12], ease: "power2.inOut" },
  Heel_Padding: { a: U, b: [-.15, -.085, 0], t: [41, 11], ease: "power2.out" },
};
const TA_UPPER = [10, 19];                                                    // la capellada completa: el bloque más pesado
/** Cámara: [t, objetivo xyz, azimut°, elevación°, distancia]. */
const CAMERA = [
  [0, [.11, .085, 0], 34, 13, .84], [10, [.13, .075, 0], 30, 12, .9], [30, [.14, .075, 0], 26, 12, 1.45],
  [52, [.145, .10, 0], 40, 17, 1.95], [62, [.145, .10, 0], 32, 17, 1.95], [90, [.145, .07, 0], 16, 9, 1.05], [100, [.145, .065, 0], 6, 6, .82],
];
const CAPTIONS = [
  [-.05, .09, "01 — Producto", "Construida capa por capa."], [.12, .28, "02 — Estructura", "Suela, espuma, plantilla y capellada."],
  [.31, .5, "03 — Detalle", "Veintiocho piezas. Cada una con su función."], [.53, .61, "04 — Despiece", "Así está hecha."],
  [.64, .88, "05 — Ensamble", "Todo vuelve a su lugar exacto."], [.93, 1.01, "06 — Lista", "Hecha para correr."],
];

export async function mountExploded(container, { model, scroll = true, screens = 7, scrub = .6, captions = true, onProgress, onLoad } = {}) {
  const { gsap } = window; if (!gsap) throw new Error("sneaker-3d: falta gsap");
  const url = model || MODELS + (quality.low ? "sneaker-exploded-lite.glb" : "sneaker-exploded.glb");
  container.classList.add("sn-host");
  const tr = scroll ? stickyTrack(container, screens) : null, host = tr ? tr.sticky : container;
  const stage = createStage(host), uAO = { value: 1 };
  const gltf = await loadGLB(url, { onProgress: onLoad });
  if (stage.disposed) return null;
  const root = gltf.scene; stage.scene.add(root); prepare(root, stage.renderer, uAO);

  // piezas: nodo + transformación original + pose de exhibición
  const V = (a) => new THREE.Vector3(...(a || [0, 0, 0])), rad = THREE.MathUtils.degToRad, parts = [];
  root.traverse((o) => {
    const def = PARTS[o.name.replace(/_R$/, "")]; if (!def) return;
    parts.push({ o, def, p0: o.position.clone(), q0: o.quaternion.clone(), A: V(def.a), B: V(def.b), arc: V(def.arc), hasB: !!def.b,
      q1: o.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...(def.r || [0, 0, 0]).map(rad)))), s: { a: 0, b: 0 } });
  });

  // timeline maestro determinista
  const tl = gsap.timeline({ paused: true, defaults: { overwrite: false } }), cam = { tx: 0, ty: 0, tz: 0, az: 0, el: 0, d: 1 };
  const camSet = ([, t, az, el, d]) => ({ tx: t[0], ty: t[1], tz: t[2], az: rad(az), el: rad(el), d }); Object.assign(cam, camSet(CAMERA[0]));
  const IR = { immediateRender: false };                                      // fromTo explícito: cada tramo no depende de en qué orden se recorrió el timeline
  CAMERA.slice(1).forEach((k, i) => tl.fromTo(cam, camSet(CAMERA[i]), { ...camSet(k), duration: k[0] - CAMERA[i][0], ease: "sine.inOut", ...IR }, CAMERA[i][0]));
  for (const p of parts) {
    const [a0, ad] = p.def.ta || TA_UPPER, ease = p.def.ta ? p.def.ease : "power2.inOut";
    tl.fromTo(p.s, { a: 0 }, { a: 1, duration: ad, ease, ...IR }, a0).fromTo(p.s, { a: 1 }, { a: 0, duration: ad * .8, ease, ...IR }, 90 - ad * .8 - (a0 - 10) * .5);   // vuelve en orden inverso: lo último en salir es lo primero en volver
    if (p.hasB) { const [b0, bd] = p.def.t; tl.fromTo(p.s, { b: 0 }, { b: 1, duration: bd, ease: p.def.ease, ...IR }, b0).fromTo(p.s, { b: 1 }, { b: 0, duration: bd, ease: "power2.inOut", ...IR }, 62 + (41 - b0) * .55); }
  }
  tl.set({}, {}, 100);

  const q = new THREE.Quaternion();
  function apply() {
    let open = 0;
    for (const p of parts) {
      const { a, b } = p.s, e = p.hasB ? b : a; open = Math.max(open, a);
      if (a === 0 && b === 0) { p.o.position.copy(p.p0); p.o.quaternion.copy(p.q0); continue; }
      p.o.position.copy(p.p0).addScaledVector(p.A, a).addScaledVector(p.B, b).addScaledVector(p.arc, Math.sin(Math.PI * e));
      p.o.quaternion.copy(q.slerpQuaternions(p.q0, p.q1, e));
    }
    uAO.value = 1 - THREE.MathUtils.smoothstep(open, 0, .35);
    stage.lights.floor.position.y = -.2 * open; stage.lights.floor.material.opacity = .3 - .14 * open;                                // el piso (solo sombra) baja con la suela: nada queda "enterrado"
    stage.look(cam.tx, cam.ty, cam.tz, cam.az, cam.el, cam.d, 1);
    const pr = tl.progress();
    caps.forEach((c, i) => { const [a, b] = CAPTIONS[i], k = Math.min(1, Math.max(0, (pr - a) / .025)) * Math.min(1, Math.max(0, (b - pr) / .025)); c.style.opacity = k; c.style.transform = `translateY(${(1 - k) * 14}px)`; });
    if (bar) bar.style.transform = `scaleY(${pr})`;
    onProgress?.(pr);
  }
  // textos e indicador de progreso (discretos, opcionales)
  const ui = document.createElement("div"); ui.className = "sn-ui"; host.append(ui);
  const caps = captions ? CAPTIONS.map(([, , k, t]) => { const e = document.createElement("div"); e.className = "sn-caption"; e.innerHTML = `<small>${k}</small><strong>${t}</strong>`; ui.append(e); return e; }) : [];
  let bar = null; if (captions) { const r = document.createElement("div"); r.className = "sn-progress"; bar = document.createElement("i"); r.append(bar); ui.append(r); }

  tl.eventCallback("onUpdate", apply); stage.onResize = apply; apply();
  const st = tr ? bindScroll(tr.track, tl, { scrub }) : null;

  return {
    stage, timeline: tl, parts,
    get progress() { return tl.progress(); },
    /** Lleva el despiece a un progreso 0..1 (sin scroll propio, o para pruebas). */
    setProgress(p) { tl.progress(Math.min(1, Math.max(0, p))); apply(); },
    /** Máxima distancia (m) y ángulo (rad) de cualquier pieza respecto de su transformación original. */
    residual() { let d = 0, a = 0; for (const p of parts) { d = Math.max(d, p.o.position.distanceTo(p.p0)); a = Math.max(a, p.o.quaternion.angleTo(p.q0)); } return { d, a }; },
    destroy() { st?.kill(); tl.kill(); stage.dispose(); release(url); ui.remove(); tr?.remove(); container.classList.remove("sn-host"); },
  };
}
