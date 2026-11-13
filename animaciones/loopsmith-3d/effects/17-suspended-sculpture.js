/* 17 · Suspended Sculpture — el logo suspendido en el aire, con movimiento orgánico y respuesta sutil al mouse. */
import * as THREE from "three";
import { clamp, damp, rng, V } from "../core/kit.js";

export default {
  id: "suspended-sculpture", n: "17", group: "C", name: "Suspended Sculpture", hint: ["hover"], preset: "original",
  lead: "El logo está suspendido, como una escultura. Cada pieza tiene su propia respiración: flota, se inclina y gira apenas, sin romper nunca la lectura de la marca. La cámara y las letras responden con sutileza al cursor.",
  fields: [["motion", "Intensidad del movimiento", 1, 0, 2.5, .05], ["parallax", "Respuesta al cursor", 1, 0, 2, .05], ["speed", "Ritmo", 1, .3, 2.2, .05]],
  tech: "Cada pieza suma cuatro senoides de fase y frecuencia propias a su posición y a su rotación (todas con media cero, por eso el logo siempre vuelve a su composición). El cursor desplaza la cámara en órbita corta y gira cada pieza hacia él con amortiguación exponencial independiente del frame rate.",
  mobile: "Sin cursor, el movimiento ambiente se conserva; el parallax usa el toque.",
  mount({ stage, logo, o }) {
    const r = rng(77), cfg = logo.pieces.map(() => ({ ph: V(r() * 6.28, r() * 6.28, r() * 6.28), fr: V(.5 + r() * .5, .4 + r() * .5, .3 + r() * .4) })), eu = new THREE.Euler(), q = new THREE.Quaternion(), look = V(), base = stage.camera.position.clone();
    const S = { v: 1 }; let yaw = 0, pitch = 0, py = 0, px = 0, amp = 1;
    stage.canvas.style.touchAction = "none";
    stage.add((dt, t) => {
      const tt = t * o.speed, m = o.motion * amp, p = stage.pointer;
      px = damp(px, p.inside ? p.nx : 0, 3, dt); py = damp(py, p.inside ? p.ny : 0, 3, dt);
      yaw = px * .22 * o.parallax; pitch = py * .12 * o.parallax;
      logo.pieces.forEach((piece, i) => {
        const c = cfg[i], h = piece.userData.home;
        piece.position.set(h.position.x + Math.sin(tt * c.fr.x + c.ph.x) * .035 * m, h.position.y + Math.sin(tt * c.fr.y + c.ph.y) * .055 * m, h.position.z + Math.sin(tt * c.fr.z + c.ph.z) * .09 * m);
        eu.set(Math.sin(tt * c.fr.y * .9 + c.ph.z) * .07 * m + py * -.18 * o.parallax, Math.sin(tt * c.fr.x * .8 + c.ph.y) * .12 * m + px * .35 * o.parallax, Math.sin(tt * c.fr.z + c.ph.x) * .03 * m);
        piece.quaternion.copy(h.quaternion).multiply(q.setFromEuler(eu));
      });
      const d = stage.home.position.z; stage.camera.position.set(Math.sin(yaw) * d, Math.sin(pitch) * d, Math.cos(yaw) * d * Math.cos(pitch)); stage.target.set(0, 0, 0); stage.look();
    });
    return { destroy() { window.gsap.killTweensOf(S); }, reset() { px = py = 0; amp = 0; window.gsap.killTweensOf(S); window.gsap.to(S, { v: 1, duration: .6, delay: 1.4, onUpdate: () => (amp = S.v), onStart: () => (S.v = 0) }); } };
  },
};
