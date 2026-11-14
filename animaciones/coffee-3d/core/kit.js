/** Utilidades compartidas por las escenas: matemática, azar determinista, composiciones espaciales y arrastre. */
import * as THREE from "three";

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
/** Progreso normalizado de p dentro del tramo [a, b], suavizado: la base de las fases de scroll (sin zonas muertas si los tramos se tocan). */
export const seg = (p, a, b) => smooth((p - a) / (b - a));
/** Amortiguación independiente de los fps. */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3();

/** Composiciones: cada una devuelve Float32Array(3n). */
export const layouts = {
  cloud(n, [sx, sy, sz] = [3, 2, 2], seed = 1, center = [0, 0, 0]) { const r = rng(seed), o = new Float32Array(n * 3); for (let i = 0; i < n; i++) { o[i * 3] = center[0] + (r() * 2 - 1) * sx; o[i * 3 + 1] = center[1] + (r() * 2 - 1) * sy; o[i * 3 + 2] = center[2] + (r() * 2 - 1) * sz; } return o; },
  ball(n, radius = 1, seed = 1) { const r = rng(seed), o = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * 6.2832, k = Math.cbrt(r()) * radius, s = Math.sqrt(1 - u * u); o[i * 3] = s * Math.cos(a) * k; o[i * 3 + 1] = u * k; o[i * 3 + 2] = s * Math.sin(a) * k; } return o; },
  shell(n, radius = 1) { const o = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const y = 1 - (2 * (i + .5)) / n, s = Math.sqrt(1 - y * y), a = i * 2.39996; o[i * 3] = Math.cos(a) * s * radius; o[i * 3 + 1] = y * radius; o[i * 3 + 2] = Math.sin(a) * s * radius; } return o; },
  ring(n, radius = 2, jitter = .12, seed = 1) { const r = rng(seed), o = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832, k = radius + (r() - .5) * jitter * 2; o[i * 3] = Math.cos(a) * k; o[i * 3 + 1] = Math.sin(a) * k; o[i * 3 + 2] = (r() - .5) * jitter * 2; } return o; },
  spiral(n, { radius = 1.4, height = 4, turns = 4, arms = 1 } = {}) { const o = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const t = i / (n - 1), a = t * turns * 6.2832 + ((i % arms) / arms) * 6.2832; o[i * 3] = Math.cos(a) * radius; o[i * 3 + 1] = (t - .5) * height; o[i * 3 + 2] = Math.sin(a) * radius; } return o; },
  /** Túnel / vórtice: anillos a lo largo de -Z. `twist` gira cada anillo, `flare` abre la boca. */
  tunnel(n, { radius = 1.6, length = 30, perRing = 10, twist = .5, jitter = .25, flare = 0, seed = 1 } = {}) {
    const r = rng(seed), o = new Float32Array(n * 3), rings = Math.ceil(n / perRing);
    for (let i = 0; i < n; i++) { const k = Math.floor(i / perRing), t = k / rings, a = ((i % perRing) / perRing) * 6.2832 + k * twist, R = radius * (1 + flare * t * t) + (r() - .5) * jitter; o[i * 3] = Math.cos(a) * R; o[i * 3 + 1] = Math.sin(a) * R; o[i * 3 + 2] = -t * length + (r() - .5) * jitter; }
    return o;
  },
  grid(nx, nz, gap = .5) { const o = new Float32Array(nx * nz * 3); let k = 0; for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { o[k++] = (i - (nx - 1) / 2) * gap; o[k++] = 0; o[k++] = (j - (nz - 1) / 2) * gap; } return o; },
  /** Silueta de una taza con asa y plato (muestreo por rechazo sobre una forma implícita en XY). */
  cup(n, scale = 1, seed = 5) {
    const r = rng(seed), o = new Float32Array(n * 3);
    const inside = (x, y) => {
      if (y > -.62 && y < .55) { const w = .5 + .22 * ((y + .62) / 1.17), round = y < -.4 ? Math.sqrt(Math.max(0, 1 - ((-.4 - y) / .22) ** 2)) : 1; if (Math.abs(x) < w * round) return true; }
      const hx = x - .78, hy = y - .05, hd = Math.hypot(hx, hy * .9); if (x > .66 && hd > .2 && hd < .34) return true;
      return y > -.84 && y < -.69 && Math.abs(x) < 1.15;
    };
    for (let i = 0; i < n;) { const x = (r() * 2 - 1) * 1.2, y = (r() * 2 - 1) * .85; if (!inside(x, y)) continue; o[i * 3] = (x - .08) * scale; o[i * 3 + 1] = (y + .1) * scale; o[i * 3 + 2] = (r() - .5) * .16 * scale; i++; }
    return o;
  },
};

/** Cuaterniones aleatorios deterministas: Float32Array(4n). */
export function randomQuats(n, seed = 1) { const r = rng(seed), o = new Float32Array(n * 4); for (let i = 0; i < n; i++) { _e.set(r() * 6.2832, r() * 6.2832, r() * 6.2832); _q.setFromEuler(_e); _q.toArray(o, i * 4); } return o; }
/** Mezcla dos composiciones con desfase por elemento (stagger 0..1): cada grano arranca y llega en su momento. */
export function mixLayouts(out, A, B, t, stagger = 0, ease = smooth) {
  const n = out.length / 3;
  for (let i = 0; i < n; i++) { const d = stagger ? ((i * .61803) % 1) * stagger : 0, k = ease(clamp((t - d) / (1 - stagger || 1))), j = i * 3; out[j] = A[j] + (B[j] - A[j]) * k; out[j + 1] = A[j + 1] + (B[j + 1] - A[j + 1]) * k; out[j + 2] = A[j + 2] + (B[j + 2] - A[j + 2]) * k; }
  return out;
}

/**
 * Arrastre 3D por raycasting sobre objetos reales. `pick()` devuelve { index, point } o null;
 * el objeto sigue al puntero sobre un plano paralelo a la cámara y al soltar entrega la velocidad (throw).
 */
export function dragger(stage, pick, { start, move, end } = {}) {
  const el = stage.canvas, plane = new THREE.Plane(), target = new THREE.Vector3(), offset = new THREE.Vector3(), last = new THREE.Vector3(), vel = new THREE.Vector3();
  let held = -1, lastT = 0; el.style.touchAction = "none";
  const project = () => { stage.raycaster.setFromCamera(stage.pointer, stage.camera); return stage.raycaster.ray.intersectPlane(plane, target); };
  stage.on(el, "pointerdown", (e) => {
    if (e.button) return; stage.readPointer(e); stage.raycaster.setFromCamera(stage.pointer, stage.camera);
    const hit = pick(stage.raycaster); if (!hit) return;
    held = hit.index; plane.setFromNormalAndCoplanarPoint(stage.camera.getWorldDirection(_v).negate(), hit.point);
    offset.copy(hit.origin || hit.point).sub(hit.point); last.copy(hit.point).add(offset); vel.set(0, 0, 0); lastT = performance.now();
    try { el.setPointerCapture(e.pointerId); } catch { /* puntero sintético */ } el.style.cursor = "grabbing"; start?.(held, last.clone());
  });
  stage.on(el, "pointermove", (e) => {
    if (held < 0) return; stage.readPointer(e); if (!project()) return; target.add(offset);
    const now = performance.now(), dt = Math.max(4, now - lastT) / 1000; vel.lerp(_v.copy(target).sub(last).divideScalar(dt), .45); last.copy(target); lastT = now; move?.(held, target, vel);
  });
  const up = () => { if (held < 0) return; const i = held; held = -1; el.style.cursor = ""; if (performance.now() - lastT > 100) vel.set(0, 0, 0); end?.(i, vel.clone()); };
  stage.on(window, "pointerup", up); stage.on(el, "pointercancel", up);
  return { get held() { return held; }, get target() { return last; } };
}

/** Punto del puntero sobre un plano z = cte (por defecto el plano de la escena): para campos de fuerza. */
export function pointerOnPlane(stage, out, z = 0) {
  stage.raycaster.setFromCamera(stage.pointer, stage.camera); const r = stage.raycaster.ray, t = (z - r.origin.z) / r.direction.z;
  return t > 0 ? out.copy(r.origin).addScaledVector(r.direction, t) : null;
}

const _q2 = new THREE.Quaternion(), _ax = new THREE.Vector3();
/** Rota cada cuaternión base sobre un eje propio: out[i] = base[i] · giro(eje_i, angle · velocidad_i). Para giros ligados al scroll o al tiempo. */
export function spinQuats(out, base, angle) {
  for (let i = 0, n = out.length / 4; i < n; i++) { _ax.set(Math.sin(i * 12.9898), Math.cos(i * 7.233), Math.sin(i * 3.171)).normalize(); _q.fromArray(base, i * 4).multiply(_q2.setFromAxisAngle(_ax, angle * (.4 + ((i * .61803) % 1)))).toArray(out, i * 4); }
  return out;
}
/** Recorrido de cámara por claves [{ at, pos, look }]: curvas suaves (Catmull-Rom centrípeta) entre claves, sin saltos. Devuelve fn(p). */
export function camTrack(camera, keys) {
  const P = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal"), L = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.look)), false, "centripetal"), look = new THREE.Vector3(), last = keys.length - 1;
  return (p) => {
    let i = 0; while (i < last - 1 && p > keys[i + 1].at) i++;
    const u = (i + clamp((p - keys[i].at) / (keys[i + 1].at - keys[i].at))) / last;
    P.getPoint(u, camera.position); L.getPoint(u, look); camera.lookAt(look); return look;
  };
}

export { THREE };
