/**
 * Herramientas compartidas por los experimentos: poses por scroll (Track), trayectorias de cámara (CamPath),
 * arrastre con raycasting (enableDrag), dinámica con resortes y utilidades de matemática.
 * Todo opera sobre transformaciones reales de Three.js (position, quaternion, scale) y sobre la cámara.
 */
import * as THREE from "three";
import { gsap } from "./gsap.js";

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (p, a, b) => clamp((p - a) / (b - a));
/** Amortiguación exponencial independiente del frame rate: x -> target con constante lambda (1/s). */
export const damp = (x, target, lambda, dt) => lerp(x, target, 1 - Math.exp(-lambda * dt));
/** Aleatorio determinista (mulberry32): las composiciones no cambian al refrescar ni al volver atrás. */
export const rng = (seed = 1) => () => { let t = (seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const eulerQ = (x = 0, y = 0, z = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, "XYZ"));
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ---------------------------------------------------------------- Track: poses de las piezas en función de un progreso 0..1 */
/**
 * stops: [{ at, ease, stagger, pose: (piece, i) => ({ p: Vector3|[x,y,z] absoluta, r: [rx,ry,rz]|Quaternion, s: número }) | null }]
 * `null` = composición original. El progreso interpola posición (lerp), rotación (slerp) y escala por pieza, con retardo escalonado.
 */
export class Track {
  constructor(pieces, stops) { this.pieces = pieces; this.stops = stops; this.eases = stops.map((s) => gsap.parseEase(s.ease || "power2.inOut")); this.cache = []; this.measure(); }
  measure() {
    this.cache = this.stops.map((s) => this.pieces.map((p, i) => {
      const h = p.userData.home, d = s.pose ? s.pose(p, i) : null;
      if (!d) return { p: h.position.clone(), q: h.quaternion.clone(), s: 1 };
      return { p: Array.isArray(d.p) ? V(...d.p) : (d.p ? d.p.clone() : h.position.clone()), q: d.r ? (d.r.isQuaternion ? d.r.clone() : eulerQ(...d.r)) : h.quaternion.clone(), s: d.s ?? 1 };
    }));
  }
  at(progress) {
    const S = this.stops; let k = 0; while (k < S.length - 2 && progress >= S[k + 1].at) k++;
    const a = S[k], b = S[k + 1], raw = clamp((progress - a.at) / (b.at - a.at)), sg = b.stagger || 0, n = this.pieces.length;
    this.pieces.forEach((piece, i) => {
      const t = this.eases[k + 1](clamp(raw * (1 + sg) - sg * (i / (n - 1 || 1)))), A = this.cache[k][i], B = this.cache[k + 1][i], h = piece.userData.home;
      piece.position.lerpVectors(A.p, B.p, t); piece.quaternion.slerpQuaternions(A.q, B.q, t); piece.scale.copy(h.scale).multiplyScalar(lerp(A.s, B.s, t));
    });
  }
}

/* ---------------------------------------------------------------- CamPath: la cámara recorre una curva suave de keyframes */
/** keys: [{ at, pos:[x,y,z], target:[x,y,z], fov? }] ordenados por `at` (0..1). Pasa exactamente por cada key en su momento. */
export class CamPath {
  constructor(stage, keys, { ease = "none" } = {}) {
    this.stage = stage; this.keys = keys; this.ease = gsap.parseEase(ease);
    this.cp = new THREE.CatmullRomCurve3(keys.map((k) => V(...k.pos)), false, "centripetal"); this.ct = new THREE.CatmullRomCurve3(keys.map((k) => V(...k.target)), false, "centripetal");
    this.tmp = V();
  }
  /** Posición de la curva (0..1) para el instante p, respetando los tiempos de cada key. */
  _u(p) {
    const K = this.keys; let i = 0; while (i < K.length - 2 && p >= K[i + 1].at) i++;
    const f = clamp((p - K[i].at) / (K[i + 1].at - K[i].at)); return (i + gsap.parseEase(K[i + 1].ease || "power2.inOut")(f)) / (K.length - 1);
  }
  at(p) {
    const u = this._u(clamp(this.ease(p))), c = this.stage.camera;
    this.cp.getPoint(u, this.tmp); c.position.copy(this.tmp); this.ct.getPoint(u, this.tmp); this.stage.target.copy(this.tmp); c.lookAt(this.tmp);
    const K = this.keys; if (K.some((k) => k.fov)) {
      let i = 0; while (i < K.length - 2 && p >= K[i + 1].at) i++;
      const f = clamp((p - K[i].at) / (K[i + 1].at - K[i].at)); c.fov = lerp(K[i].fov ?? 30, K[i + 1].fov ?? 30, f); c.updateProjectionMatrix();
    }
  }
}

/* ---------------------------------------------------------------- Arrastre con raycasting sobre los modelos reales */
/**
 * Selecciona la pieza bajo el cursor (raycast contra la malla), arrastra en un plano perpendicular a la cámara que pasa por el
 * punto de agarre (sin saltos: se conserva el desfase), y entrega la velocidad al soltar. La rueda acerca/aleja la pieza (eje de profundidad).
 * handlers: { start(piece, ctx), move(piece, target:Vector3, ctx), end(piece, velocity:Vector3, ctx), hover(piece|null) }
 */
export function enableDrag(stage, logo, handlers = {}, { pieces = logo.pieces, depthWheel = true } = {}) {
  const el = stage.canvas; el.style.touchAction = "none";
  let held = null, plane = null, offset = V(), depth = 0, last = V(), lastT = 0, vel = V(), hover = null;
  const tmp = V(), dir = V();
  const pick = () => { stage.ray(); const hit = logo.pick(stage.raycaster); return hit && pieces.includes(hit.piece) ? hit : null; };
  const down = (e) => {
    if (e.button) return; stage.pointer.nx; const hit = pick(); if (!hit) return;
    held = hit.piece; try { el.setPointerCapture(e.pointerId); } catch { /* pointerId sintético */ } plane = stage.cameraPlane(hit.point); depth = 0;
    held.getWorldPosition(tmp); offset.copy(tmp).sub(hit.point); last.copy(tmp); lastT = performance.now(); vel.set(0, 0, 0);
    stage.camera.getWorldDirection(dir); el.style.cursor = "grabbing"; handlers.start?.(held, { point: hit.point.clone(), offset, plane });
  };
  const frame = () => {
    if (!held) return;
    if (!stage.pointerOnPlane(plane, undefined, undefined, tmp)) return;
    const target = tmp.clone().add(offset).addScaledVector(dir, depth);
    const now = performance.now(), dt = Math.max(1, now - lastT) / 1000;
    if (dt > .004) { vel.lerp(target.clone().sub(last).divideScalar(dt), .5); last.copy(target); lastT = now; }
    handlers.move?.(held, target, { velocity: vel });
  };
  const move = (e) => {
    if (held) { frame(); return; }
    if (!handlers.hover && !stage.interactive) return;
    const hit = e.pointerType === "mouse" ? pick() : null, p = hit ? hit.piece : null;
    if (p !== hover) { hover = p; el.style.cursor = p ? "grab" : ""; handlers.hover?.(p); stage.invalidate(); }
  };
  const up = () => {
    if (!held) return; const p = held; held = null; el.style.cursor = hover ? "grab" : "";
    if (performance.now() - lastT > 90) vel.set(0, 0, 0); handlers.end?.(p, vel.clone(), {});
  };
  const wheel = (e) => { if (!held || !depthWheel) return; e.preventDefault(); depth = clamp(depth - e.deltaY * .004, -4, 4); frame(); };
  stage.on(el, "pointerdown", down); stage.on(el, "pointermove", move); stage.on(window, "pointerup", up); stage.on(el, "pointercancel", up);
  stage.on(el, "wheel", wheel, { passive: false });
  // Mientras se arrastra, `frame` también corre por tick para que la pieza siga al cursor aunque este no se mueva (cámara animada).
  const tick = () => held && frame(); stage.add(tick);
  return { get held() { return held; }, destroy() { stage.off(tick); el.style.cursor = ""; el.style.touchAction = ""; } };
}

/* ---------------------------------------------------------------- Dinámica: resortes lineales y angulares con dt controlado */
export class Body {
  constructor(piece) { this.piece = piece; this.v = V(); this.w = V(); this.home = piece.userData.home; this.held = false; this.mass = 1; }
  get p() { return this.piece.position; }
  /** Resorte amortiguado hacia `target` (semi-implícito; estable con dt <= 1/20 y k*dt² < 1). */
  springTo(target, k, c, dt) { const f = tmpV.copy(target).sub(this.piece.position).multiplyScalar(k).addScaledVector(this.v, -c); this.v.addScaledVector(f, dt / this.mass); return this; }
  springRotTo(targetQ, k, c, dt) {
    const e = tmpQ.copy(targetQ).multiply(tmpQ2.copy(this.piece.quaternion).invert()); if (e.w < 0) { e.x = -e.x; e.y = -e.y; e.z = -e.z; e.w = -e.w; }
    const ang = 2 * Math.acos(clamp(e.w, -1, 1)), s = Math.sqrt(1 - e.w * e.w) || 1; const torque = tmpV.set(e.x / s, e.y / s, e.z / s).multiplyScalar(ang * k).addScaledVector(this.w, -c);
    this.w.addScaledVector(torque, dt / this.mass); return this;
  }
  integrate(dt) {
    this.piece.position.addScaledVector(this.v, dt); const a = this.w.length();
    if (a > 1e-5) { tmpQ.setFromAxisAngle(tmpV.copy(this.w).divideScalar(a), a * dt); this.piece.quaternion.premultiply(tmpQ).normalize(); }
    return this;
  }
  /** Energía residual: sirve para dormir la simulación cuando todo está en reposo. */
  get energy() { return this.v.lengthSq() + this.w.lengthSq() * .1 + this.piece.position.distanceToSquared(this.home.position) + (1 - Math.abs(this.piece.quaternion.dot(this.home.quaternion))); }
}
const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion();

/** Nube dispersa determinista: posición alrededor de un centro, rotación aleatoria y escala. Base de las composiciones "desarmadas". */
export function scatter(i, { seed = 7, spread = [4, 2.2, 3], center = [0, 0, 0], tumble = Math.PI, scale = [.7, 1.5], minZ = -Infinity } = {}) {
  const r = rng(seed * 101 + i * 17 + 3), c = (k) => (r() * 2 - 1) * spread[k] + center[k];
  return { p: [c(0), c(1), Math.max(minZ, c(2))], r: [(r() * 2 - 1) * tumble, (r() * 2 - 1) * tumble, (r() * 2 - 1) * tumble], s: lerp(scale[0], scale[1], r()) };
}
