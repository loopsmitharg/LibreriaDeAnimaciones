/* 06 · Object Inspection — seleccionar una letra, acercarla a la cámara y examinarla. */
import * as THREE from "three";
import { gsap } from "../core/gsap.js";
import { V, clamp, lerp } from "../core/kit.js";

export default {
  id: "object-inspection", n: "06", group: "A", name: "Object Inspection", hint: ["click", "drag"],
  lead: "Tocá una letra: sale del logo, se acerca a la cámara y rota despacio mostrando su grosor, sus bordes biselados y su material. Girala con el mouse. Un clic afuera (o Esc) la devuelve a su lugar.",
  fields: [["spin", "Giro automático", .55, 0, 1.6, .05], ["distance", "Distancia a la cámara (u)", 4.4, 2, 6, .1], ["preset", "Material al inspeccionar", "keep", { keep: "El actual", chrome: "Chrome", lime: "Lima satinado", black: "Negro Studio" }]],
  tech: "Raycast contra la malla real; la pieza elegida se desplaza por un tween (k: 0→1) entre su transformación original y una pose frente a la cámara (posición lerp, rotación slerp). Las demás retroceden. Mientras está activa, arrastrar acumula velocidad angular con inercia. Al cerrar, k vuelve a 0 y se restaura el estado exacto.",
  mobile: "Tocar elige la letra y arrastrar con el dedo la gira.",
  mount({ stage, logo, o, host }) {
    const hud = document.createElement("div"); hud.className = "ls-hud"; hud.style.cssText = "left:5%;top:7%;opacity:0;transition:opacity .4s"; host.append(hud);
    const S = { piece: null, k: 0, rx: .25, ry: 0, wx: 0, wy: 0, q0: new THREE.Quaternion(), p0: V(), tpos: V(), scale: 1, drag: false, moved: 0, preset: null }, tmpQ = new THREE.Quaternion(), eu = new THREE.Euler(), cam = V();
    stage.continuous = false; stage.canvas.style.touchAction = "none";
    const others = () => logo.pieces.filter((p) => p !== S.piece);
    const open = (piece) => {
      if (S.piece) return; S.piece = piece; piece.getWorldPosition(S.p0); S.q0.copy(piece.quaternion); S.ry = 0; S.rx = .25; S.wx = 0; S.wy = o.spin;
      stage.camera.getWorldDirection(cam); S.tpos.copy(stage.camera.position).addScaledVector(cam, o.distance);
      const d = piece.userData.dims; S.scale = 1.45 / Math.max(d.x, d.y); const m = piece.userData.meta;
      hud.innerHTML = `${m.char || "Símbolo"} · ${m.id}<br>${d.x.toFixed(3)} × ${d.y.toFixed(3)} × ${d.z.toFixed(3)} u · ${m.triangles ?? "—"} tris`; hud.style.opacity = 1;
      if (o.preset !== "keep") { S.preset = logo.preset; logo.setPreset(o.preset, { duration: .8 }); }
      gsap.killTweensOf(S); gsap.to(S, { k: 1, duration: 1.1, ease: "expo.out", onUpdate: () => stage.invalidate() });
    };
    const close = () => {
      if (!S.piece) return; hud.style.opacity = 0; if (S.preset) { logo.setPreset(S.preset, { duration: .8 }); S.preset = null; }
      gsap.killTweensOf(S); gsap.to(S, { k: 0, duration: .9, ease: "expo.inOut", onUpdate: () => stage.invalidate(), onComplete: () => { S.piece = null; logo.snapHome(); stage.invalidate(); } });
    };
    const down = () => { S.drag = true; S.moved = 0; }, up = () => {
      const was = S.drag; S.drag = false; if (!was || S.moved > 6) return;
      stage.ray(); const hit = logo.pick(stage.raycaster); if (S.piece) { if (!hit || hit.piece !== S.piece) close(); } else if (hit) open(hit.piece);
    };
    stage.on(stage.canvas, "pointerdown", down); stage.on(window, "pointerup", up);
    stage.on(stage.canvas, "pointermove", (e) => { if (S.drag && S.piece) { S.wy = clamp(S.wy + e.movementX * .05, -9, 9); S.wx = clamp(S.wx + e.movementY * .05, -9, 9); } if (S.drag) S.moved += Math.abs(e.movementX) + Math.abs(e.movementY); });
    stage.on(window, "keydown", (e) => e.key === "Escape" && close());
    const loop = stage.add((dt) => {
      if (!S.piece) return;
      S.ry += S.wy * dt; S.rx = clamp(S.rx + S.wx * dt, -1.2, 1.2); S.wx *= Math.exp(-2.2 * dt); S.wy = lerp(S.wy, S.drag ? S.wy : o.spin, 1 - Math.exp(-(S.drag ? 0 : 1.2) * dt));
      const t = S.k, p = S.piece; p.position.lerpVectors(S.p0, S.tpos, t); tmpQ.setFromEuler(eu.set(S.rx, S.ry, 0)); p.quaternion.slerpQuaternions(S.q0, tmpQ, t); p.scale.setScalar(lerp(1, S.scale, t));
      for (const q of others()) { const h = q.userData.home; q.position.copy(h.position).add(V(0, 0, -1.4 * t)).addScaledVector(h.position, .18 * t); q.scale.setScalar(lerp(1, .82, t)); }
      stage.invalidate();
    });
    return {
      play() { open(logo.letters[5]); }, pause() { stage.off(loop); }, reset() { stage.add(loop); close(); },
      destroy() { gsap.killTweensOf(S); hud.remove(); },
    };
  },
};
