/* 03 · Magnetic 3D — campo magnético tridimensional: atracción, inclinación hacia el cursor y resortes. */
import * as THREE from "three";
import { Body, V, clamp } from "../core/kit.js";

export default {
  id: "magnetic-3d", n: "03", group: "A", name: "Magnetic 3D", hint: ["hover"],
  lead: "El cursor flota delante del logo como un imán. Las letras cercanas se acercan a él y se adelantan hacia la cámara, se inclinan para mirarlo y vuelven a su lugar con resortes cuando se va.",
  fields: [["mode", "Polaridad", "attract", { attract: "Atraer", repel: "Repeler" }], ["radius", "Radio del campo (u)", 1.7, .7, 3.2, .1], ["strength", "Intensidad", 1, .2, 2, .05], ["lift", "Avance hacia la cámara", .8, 0, 1.6, .05]],
  tech: "El puntero se proyecta a un plano 0.9 u delante del logo; ese punto es el imán. Cada letra recibe una fuerza que cae con el cuadrado de la distancia en X, Y y Z, y un torque que gira su eje frontal hacia el imán (slerp parcial). Resortes lineal y angular hacen el retorno.",
  mobile: "Deslizar el dedo mueve el campo; al levantarlo, todo regresa.",
  mount({ stage, logo, o }) {
    const bodies = logo.pieces.map((p) => { const b = new Body(p); b.mass = p === logo.symbol ? 2.2 : 1; return b; });
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -.9), M = V(), dir = V(), tq = new THREE.Quaternion(), fq = new THREE.Quaternion(), Z = V(0, 0, 1), tgt = V();
    stage.canvas.style.touchAction = "none"; stage.continuous = false;
    let demo = null;
    const loop = stage.add((dt) => {
      const pt = stage.pointer, on = pt.inside || demo; if (on && !demo) stage.pointerOnPlane(plane, undefined, undefined, M); else if (demo) M.copy(demo);
      const sign = o.mode === "repel" ? -1 : 1; let active = !!on;
      for (const b of bodies) {
        const h = b.home; dir.copy(M).sub(h.position); const d = dir.length(), R = o.radius * (b.piece === logo.symbol ? 1.25 : 1);
        const f = on && d < R ? (1 - d / R) ** 2 : 0;
        // posición: hacia el imán en X/Y/Z (más profundidad hacia la cámara cuanto más fuerte el campo)
        tgt.copy(h.position).addScaledVector(dir.normalize(), f * o.strength * .85 * sign).add(V(0, 0, f * o.lift));
        b.springTo(tgt, 70, 10.5, dt);
        // rotación: el frente de la pieza se orienta hacia el imán
        tq.setFromUnitVectors(Z, dir.copy(M).sub(b.piece.position).normalize()); fq.identity().slerp(tq, clamp(f * 1.05 * o.strength)); fq.multiply(h.quaternion);
        b.springRotTo(fq, 80, 9, dt); b.integrate(dt);
        if (b.energy > 1.5e-4) active = true;
      }
      if (active) stage.invalidate(); else for (const b of bodies) { b.piece.position.copy(b.home.position); b.piece.quaternion.copy(b.home.quaternion); }
    });
    return {
      /** Demo: un imán fantasma barre el logo de izquierda a derecha por delante. */
      play() { demo?.kill?.(); const m = V(-2.4, .1, .9); demo = m; const tw = window.gsap.to(m, { x: 2.4, y: -.1, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: 1, onComplete: () => { demo = null; } }); demo.kill = () => tw.kill(); stage.invalidate(); },
      pause() { stage.off(loop); }, reset() { stage.add(loop); demo?.kill?.(); demo = null; stage.invalidate(); },
      destroy() { demo?.kill?.(); },
    };
  },
};
