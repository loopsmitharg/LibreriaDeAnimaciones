/* 02 · Zero Gravity — el logo flota; las letras se separan en 3 ejes y el mouse perturba su trayectoria. */
import * as THREE from "three";
import { Body, rng, V, clamp } from "../core/kit.js";

export default {
  id: "zero-gravity", n: "02", group: "A", name: "Zero Gravity", hint: ["hover", "click"],
  lead: "El logo pierde el peso. Las letras se separan despacio y derivan en profundidad, cada una girando sobre varios ejes. El cursor empuja su trayectoria; un clic las reúne o las vuelve a soltar.",
  fields: [["spread", "Separación", 1, .3, 2, .05], ["drift", "Velocidad de deriva", 1, .2, 2.5, .05], ["push", "Fuerza del cursor", 1, 0, 2.5, .05]],
  tech: "Cada pieza orbita un ancla flotante con un resorte muy blando y casi sin amortiguación (ζ≈0.3), más un giro propio sobre un eje aleatorio. El cursor es una fuerza: se mide la distancia de cada pieza al rayo del puntero (3D, no 2D) y se la empuja en sentido contrario, con caída cuadrática.",
  mobile: "Tocar y deslizar empuja las letras; un toque corto reúne o suelta el conjunto.",
  mount({ stage, logo, o }) {
    const rnd = rng(23), bodies = logo.pieces.map((p, i) => {
      const b = new Body(p), h = p.userData.home; b.mass = p === logo.symbol ? 2.6 : 1;
      b.anchor = h.position.clone().multiplyScalar(1 + .38 * o.spread).add(V(0, 0, (rnd() - .4) * 2.2 * o.spread)).add(V((rnd() - .5) * .5, (rnd() - .5) * 1.1, 0).multiplyScalar(o.spread));
      b.spin = V(rnd() - .5, rnd() - .5, rnd() - .5).normalize().multiplyScalar((.35 + rnd() * .55) * o.drift); b.phase = rnd() * 6.28; return b;
    });
    let floating = false; const tmp = V(), closest = V(); stage.continuous = false;
    const loop = stage.add((dt, t) => {
      const ray = stage.raycaster.ray; if (stage.pointer.inside) stage.ray();
      let active = false;
      for (const b of bodies) {
        const p = b.piece;
        if (floating) {
          // Resorte blando hacia un ancla móvil (deriva) + giro libre.
          tmp.copy(b.anchor).add(V(Math.sin(t * .4 * o.drift + b.phase) * .35, Math.cos(t * .31 * o.drift + b.phase * 1.7) * .3, Math.sin(t * .23 * o.drift + b.phase) * .4));
          b.springTo(tmp, .7, .42, dt); b.w.lerp(b.spin, 1 - Math.exp(-.7 * dt));
          if (stage.pointer.inside) {
            ray.closestPointToPoint(p.position, closest); const d = closest.distanceTo(p.position), R = 1.5;
            if (d < R) { const f = (1 - d / R) ** 2 * 26 * o.push; tmp.copy(p.position).sub(closest).normalize().multiplyScalar(f); b.v.addScaledVector(tmp, dt / b.mass); b.w.addScaledVector(V(tmp.y, -tmp.x, tmp.z * .3), dt * .5); }
          }
          { const hh = Math.tan(THREE.MathUtils.degToRad(stage.camera.fov / 2)) * (stage.camera.position.z - p.position.z) * .82, hw = hh * stage.camera.aspect; if (Math.abs(p.position.x) > hw) { p.position.x = Math.sign(p.position.x) * hw; b.v.x *= -.5; } if (Math.abs(p.position.y) > hh) { p.position.y = Math.sign(p.position.y) * hh; b.v.y *= -.5; } }
        } else { b.springTo(b.home.position, 46, 11, dt); b.springRotTo(b.home.quaternion, 58, 9, dt); b.w.multiplyScalar(Math.exp(-3 * dt)); }
        b.integrate(dt); if (floating || b.energy > 1.5e-4) active = true;
      }
      if (active) stage.invalidate(); else for (const b of bodies) { b.piece.position.copy(b.home.position); b.piece.quaternion.copy(b.home.quaternion); b.v.set(0, 0, 0); b.w.set(0, 0, 0); }
    });
    stage.on(stage.canvas, "click", () => { floating = !floating; stage.invalidate(); });
    const call = window.gsap.delayedCall(1.1, () => { floating = true; stage.invalidate(); });
    return { play() { floating = true; stage.invalidate(); }, pause() { stage.off(loop); }, reset() { stage.add(loop); floating = false; stage.invalidate(); }, destroy() { call.kill(); } };
  },
};
