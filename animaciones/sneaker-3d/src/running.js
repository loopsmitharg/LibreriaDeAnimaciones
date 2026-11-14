/**
 * RUNNING PAIR — el par (izquierda + derecha) en un ciclo de carrera continuo.
 *
 *   import { mountRunning } from "./src/running.js";
 *   const run = await mountRunning(document.querySelector("#run"), { controls: true });
 *   run.pause(); run.play(); run.replay(); run.setSpeed(1.5); run.reset(); run.destroy();
 *
 * Todo sale de UNA fase por pie (la izquierda va medio ciclo desfasada): posición, cabeceo, flexión del antepié,
 * compresión de la espuma, moño y piso. La velocidad solo escala cuánto avanza la fase -> nada se desincroniza.
 * Deformación (huesos exportados desde Blender): Toe = flexión en los metatarsos, RearCush/ToeCush = la capellada baja
 * sobre la espuma (la goma no se comprime, el contrafuerte y la puntera quedan rígidos), Bow = movimiento secundario del moño.
 * Ejes (three): X = avance, Y = arriba, Z = lateral del pie derecho.
 */
import { createStage, THREE, quality, reducedMotion } from "./stage.js";
import { loadGLB, release, MODELS } from "./loader.js";
import { prepare } from "./materials.js";

const STANCE = .35, HALF = .21, CYCLE = .72;                                  // fracción de apoyo, medio recorrido del apoyo (m), segundos por ciclo a 1x
const BELT = 2 * HALF / STANCE;                                               // metros de piso por ciclo
const D = Math.PI / 180;

/** Curva periódica por claves [fase, valor, tangente?] (Hermite; tangente Catmull-Rom si no se da). */
function curve(keys) {
  const n = keys.length, t = keys.map((k) => k[0]), v = keys.map((k) => k[1]);
  const m = keys.map((k, i) => { if (k[2] !== undefined) return k[2]; const a = (i + n - 1) % n, b = (i + 1) % n; return (v[b] - v[a]) / ((t[b] + (b < i ? 1 : 0)) - (t[a] - (a > i ? 1 : 0))); });
  return (ph) => {
    ph -= Math.floor(ph); let i = n - 1; for (let k = 0; k < n; k++) if (ph >= t[k]) i = k;
    const j = (i + 1) % n, t0 = t[i] - (ph < t[0] ? 1 : 0), h = (t[j] + (j <= i ? 1 : 0)) - t[i], x = (ph - t0) / h, x2 = x * x, x3 = x2 * x;
    return (2 * x3 - 3 * x2 + 1) * v[i] + (x3 - 2 * x2 + x) * h * m[i] + (-2 * x3 + 3 * x2) * v[j] + (x3 - x2) * h * m[j];
  };
}
const S = -BELT;                                                              // pendiente del apoyo: el pie viaja con el piso (sin deslizar)
const GAIT = {
  // posición de referencia del contacto: lineal en el apoyo; en el vuelo recupera, se adelanta y retrocede antes de aterrizar
  x: curve([[0, HALF, S], [STANCE, -HALF, S], [.47, -.30], [.62, -.10], [.77, .16], [.9, .275], [.97, .245]]),
  lift: curve([[0, 0, 0], [STANCE, 0, 0], [.46, .10], [.6, .15], [.76, .10], [.9, .04], [.97, .008]]),
  // cabeceo: + punta arriba. contacto de talón -> planta -> despegue de talón -> impulso -> talón arriba en el vuelo -> preparación
  pitch: curve([[0, 11], [.045, 3], [.09, 0, 0], [.2, 0, 0], [.275, -19], [STANCE, -47], [.45, -60], [.58, -50], [.72, -22], [.86, 8], [.95, 13]]),
  flex: curve([[0, 0, 0], [.2, 0, 0], [.275, 17], [STANCE, 37], [.42, 15], [.5, 0, 0], [.9, -3], [.97, -2]]),         // antepié: se dobla en el impulso, vuelve en el vuelo
  heel: curve([[0, .2], [.045, 1], [.12, .5], [.21, .15], [.3, 0, 0], [.95, 0, 0]]),                                    // compresión de la espuma del talón
  fore: curve([[0, 0, 0], [.08, .3], [.18, .9], [.27, 1], [.33, .45], [.37, 0, 0], [.9, 0, 0]]),                         // compresión del antepié
};
const HEEL_MM = .0055, FORE_MM = .0045, KSOFT = 500;
const PTS = { heel: [.03, 0], ball: [.195, 0], tip: [.06, .007] };          // contactos: talón y metatarsos (en el retropié), punta (relativa a los metatarsos)

/** Pose de un pie para una fase: todo determinista. */
export function pose(ph) {
  ph -= Math.floor(ph);
  const th = GAIT.pitch(ph) * D, fl = Math.max(-4, GAIT.flex(ph)) * D, c = Math.cos(th), s = Math.sin(th), c2 = Math.cos(th + fl), s2 = Math.sin(th + fl);
  const rot = (p, cc, ss) => [p[0] * cc - p[1] * ss, p[0] * ss + p[1] * cc];
  const ball = rot(PTS.ball, c, s), tr = rot(PTS.tip, c2, s2), cand = [[rot(PTS.heel, c, s), PTS.heel[0]], [ball, PTS.ball[0]], [[ball[0] + tr[0], ball[1] + tr[1]], PTS.ball[0] + PTS.tip[0]]];
  const ymin = Math.min(...cand.map((k) => k[0][1])); let w = 0, dx = 0;      // punto más bajo de la suela = contacto (mezcla suave entre candidatos)
  for (const [p, flat] of cand) { const k = Math.exp(-KSOFT * (p[1] - ymin)); w += k; dx += k * (flat - p[0]); }
  const air = Math.max(0, GAIT.lift(ph)), u = ph;                              // u = fase desde el contacto
  return {
    x: GAIT.x(ph) + dx / w - .145, y: -ymin + air, pitch: th, flex: fl, air,
    heel: Math.max(0, GAIT.heel(ph)) * HEEL_MM, fore: Math.max(0, GAIT.fore(ph)) * FORE_MM,
    bow: (5 * Math.sin(2 * Math.PI * (ph - .1)) + 9 * Math.exp(-9 * u) * Math.sin(2 * Math.PI * 5.5 * u)) * D,   // vaivén + rebote amortiguado tras el impacto
  };
}

export async function mountRunning(container, { model, controls = false, speed = 1, autoplay = true, onLoad } = {}) {
  const url = model || MODELS + (quality.low ? "sneaker-running-pair-lite.glb" : "sneaker-running-pair.glb");
  container.classList.add("sn-host");
  const stage = createStage(container, { fov: 28 });
  const gltf = await loadGLB(url, { onProgress: onLoad });
  if (stage.disposed) return null;
  const root = gltf.scene; stage.scene.add(root); prepare(root, stage.renderer); root.updateMatrixWorld(true);

  // rig de cada pie: huesos + reposo (posición local, rotación local y rotación en espacio de la zapatilla)
  const shoes = ["R", "L"].map((side, i) => {
    const node = root.getObjectByName(`Sneaker_${side}`), bones = {};
    node.traverse((o) => { if (o.isBone) { const k = o.name.replace(/_\d+$/, ""); bones[k] = { o, p0: o.position.clone(), q0: o.quaternion.clone(), qw: o.getWorldQuaternion(new THREE.Quaternion()), qpw: o.parent.getWorldQuaternion(new THREE.Quaternion()).invert() }; } });
    node.rotation.order = "YZX";
    return { node, bones, z: side === "R" ? .088 : -.088, yaw: side === "R" ? -.06 : .06, offset: i * .5 };
  });
  const Z = new THREE.Vector3(0, 0, 1), q = new THREE.Quaternion(), qi = new THREE.Quaternion(), v = new THREE.Vector3();
  const rotate = (b, axis, ang) => b.o.quaternion.copy(b.q0).multiply(qi.copy(b.qw).invert()).multiply(q.setFromAxisAngle(axis, ang)).multiply(b.qw);   // gira el hueso alrededor de un eje de la zapatilla
  const sink = (b, d) => b.o.position.copy(b.p0).add(v.set(0, -d, 0).applyQuaternion(b.qpw));                                                      // baja el hueso `d` metros (compresión)

  // piso: marcas tenues que pasan a la velocidad del apoyo (dan referencia de avance; no son decoración)
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 8; const g = cv.getContext("2d"); g.fillStyle = "#000"; g.fillRect(120, 0, 3, 8);
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(12 / .5, 1); tex.anisotropy = 8;
  const marks = new THREE.Mesh(new THREE.PlaneGeometry(12, .9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: .06, depthWrite: false }));
  marks.rotation.x = -Math.PI / 2; marks.position.y = .0005; stage.scene.add(marks);
  stage.lights.key.target.position.set(0, 0, 0); stage.lights.floor.material.opacity = .34;

  const state = { phase: 0, speed, playing: autoplay && !reducedMotion() };
  function apply(time = 0) {
    for (const s of shoes) {
      const p = pose(state.phase + s.offset), b = s.bones;
      s.node.position.set(p.x, p.y, s.z); s.node.rotation.set(0, s.yaw, p.pitch);
      rotate(b.Toe, Z, p.flex); sink(b.RearCush, p.heel); sink(b.ToeCush, p.fore); rotate(b.Bow, Z, p.bow);
    }
    tex.offset.x = (state.phase * BELT / .5) % 1;
    stage.look(.0, .1, 0, (37 + 1.5 * Math.sin(time * .3)) * D, 13 * D, 1.5, 1.6);
  }
  stage.onFrame((dt, t) => { if (state.playing) state.phase += dt * state.speed / CYCLE; apply(t); });
  stage.onResize = () => apply(); apply();

  const api = {
    stage, state, shoes, pose,
    play() { state.playing = true; sync(); }, pause() { state.playing = false; sync(); },
    replay() { state.phase = 0; state.playing = true; sync(); },
    reset() { state.phase = 0; state.speed = 1; state.playing = false; apply(); sync(); },
    /** 0.25x a 2x. Escala la fase: traslaciones, deformaciones y piso siguen sincronizados. */
    setSpeed(s) { state.speed = Math.min(2, Math.max(.25, +s || 1)); sync(); },
    /** Lleva el ciclo a una fase exacta (pruebas, o para atarlo a otro reloj). */
    setPhase(p) { state.phase = p; apply(); },
    destroy() { ui?.remove(); tex.dispose(); stage.dispose(); release(url); container.classList.remove("sn-host"); },
  };
  // controles opcionales: Play / Pause, Replay, Velocidad, Reset
  let ui = null, sync = () => {};
  if (controls) {
    ui = document.createElement("div"); ui.className = "sn-controls"; ui.setAttribute("role", "group"); ui.setAttribute("aria-label", "Controles del ciclo de carrera");
    ui.innerHTML = `<button type="button" data-a="toggle"></button><button type="button" data-a="replay">Replay</button>
      <label>Velocidad <input type="range" min="0.25" max="2" step="0.05" aria-label="Velocidad"><output></output></label><button type="button" data-a="reset">Reset</button>`;
    container.append(ui); const tg = ui.querySelector("[data-a=toggle]"), rg = ui.querySelector("input"), out = ui.querySelector("output");
    sync = () => { tg.textContent = state.playing ? "Pause" : "Play"; tg.setAttribute("aria-pressed", state.playing); rg.value = state.speed; out.textContent = state.speed.toFixed(2) + "×"; };
    ui.addEventListener("click", (e) => { const a = e.target.dataset?.a; if (a === "toggle") state.playing ? api.pause() : api.play(); else if (a) api[a]?.(); });
    rg.addEventListener("input", () => api.setSpeed(rg.value)); sync();
  }
  return api;
}
