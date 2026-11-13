/* 01 · Grab & Throw — agarrar una letra real con raycasting, moverla en 3 ejes y lanzarla. */
import * as THREE from "three";
import { Body, enableDrag, clamp, V } from "../core/kit.js";

export default {
  id: "grab-throw", n: "01", group: "A", name: "Grab & Throw", hint: ["drag", "wheel"],
  lead: "Agarrá cualquier letra con el mouse. Se despega del logo, la movés por el espacio (la rueda la acerca o la aleja), la soltás y sale lanzada con inercia, girando. Después vuelve sola a su lugar.",
  fields: [["mass", "Peso", 1, .4, 3, .05], ["rest", "Espera antes de volver (s)", 1.6, .2, 5, .1], ["air", "Fricción del aire", .9, 0, 3, .05], ["bounds", "Rebotar en las paredes", true]],
  tech: "Raycast contra la malla real del GLB (no contra una caja). El arrastre ocurre en un plano perpendicular a la cámara que pasa por el punto de agarre, conservando el desfase para que no haya saltos; la rueda desplaza ese plano en profundidad. Al soltar, la velocidad medida se convierte en impulso lineal y angular; resortes lineal y angular la devuelven a la transformación original.",
  mobile: "Pointer Events con touch-action: none: el dedo agarra igual que el mouse. La rueda de profundidad no existe en touch; el lanzamiento sí.",
  mount({ stage, logo, o }) {
    const bodies = logo.pieces.map((p) => { const b = new Body(p); b.mass = o.mass * (p === logo.symbol ? 3 : 1); b.free = 99; return b; });
    const by = new Map(bodies.map((b) => [b.piece, b])), tiltQ = new THREE.Quaternion(), tiltE = new THREE.Euler();
    stage.continuous = false;
    enableDrag(stage, logo, {
      start(p) { const b = by.get(p); b.held = true; b.free = 0; gsap_kill(p); stage.invalidate(); },
      move(p, target) { by.get(p).target = target; },
      end(p, vel) { const b = by.get(p); b.held = false; b.free = 0; b.v.copy(vel).clampLength(0, 18).divideScalar(Math.sqrt(b.mass)); b.w.set(-vel.y * .6 + (Math.random() - .5), vel.x * .6 + (Math.random() - .5), -vel.x * .25).clampLength(0, 14); },
    });
    const hw = () => { const d = stage.camera.position.z, t = Math.tan(THREE.MathUtils.degToRad(stage.camera.fov / 2)); return [d * t * stage.camera.aspect * .92, d * t * .9]; };
    function gsap_kill(p) { window.gsap.killTweensOf([p.position, p.scale]); }
    const step = (dt) => {
      let active = false; const [bx, by_] = hw();
      for (const b of bodies) {
        const p = b.piece, h = b.home;
        if (b.held) {
          // Peso: el resorte sigue al cursor con retraso; la pieza se inclina según su velocidad.
          b.springTo(b.target, 340, 2 * Math.sqrt(340 * b.mass) * .78, dt); tiltE.set(clamp(-b.v.y * .06, -.7, .7), clamp(b.v.x * .06, -.7, .7), clamp(-b.v.x * .03, -.4, .4));
          tiltQ.setFromEuler(tiltE).multiply(h.quaternion); b.springRotTo(tiltQ, 120, 14, dt); p.scale.setScalar(THREE.MathUtils.damp(p.scale.x, 1.07, 12, dt));
        } else {
          b.free += dt;
          if (b.free > o.rest) { b.springTo(h.position, 52, 11, dt); b.springRotTo(h.quaternion, 64, 9, dt); p.scale.setScalar(THREE.MathUtils.damp(p.scale.x, 1, 10, dt)); }
          else { b.v.multiplyScalar(Math.exp(-o.air * dt)); b.w.multiplyScalar(Math.exp(-.35 * dt)); }
          if (o.bounds && b.free <= o.rest) { for (const [k, lim] of [["x", bx], ["y", by_]]) { if (Math.abs(p.position[k]) > lim) { p.position[k] = Math.sign(p.position[k]) * lim; b.v[k] *= -.62; b.w.multiplyScalar(.9); } } if (Math.abs(p.position.z) > 3.2) { p.position.z = Math.sign(p.position.z) * 3.2; b.v.z *= -.6; } }
        }
        b.integrate(dt);
        if (b.held || b.energy > 1.5e-4) active = true;
      }
      if (active) stage.invalidate(); else for (const b of bodies) { p_snap(b); }
    };
    const p_snap = (b) => { if (b.free > o.rest && b.energy < 1.5e-4) { const h = b.home; b.piece.position.copy(h.position); b.piece.quaternion.copy(h.quaternion); b.v.set(0, 0, 0); b.w.set(0, 0, 0); } };
    const loop = stage.add(step);
    return {
      /** Demo: tira todas las letras como si alguien las hubiera lanzado. */
      play() { bodies.forEach((b, i) => { b.free = 0; b.v.set(Math.sin(i * 2.3) * 5, 4 + Math.cos(i * 1.7) * 2, 3 + (i % 3)); b.w.set(Math.sin(i) * 7, Math.cos(i * 1.3) * 7, Math.sin(i * .7) * 5); }); stage.invalidate(); },
      pause() { stage.off(loop); }, reset() { stage.add(loop); bodies.forEach((b) => { b.free = 99; b.held = false; }); stage.invalidate(); },
    };
  },
};
