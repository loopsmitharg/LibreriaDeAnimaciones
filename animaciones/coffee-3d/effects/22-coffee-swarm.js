/**
 * 22 · Interactive Coffee Swarm — comportamiento colectivo: separación + alineación entre vecinos (grilla espacial),
 * una corriente que los hace vagar, el cursor como depredador o guía, y la reconstrucción de una composición a pedido.
 */
import { Flock } from "../physics/flock.js";

export default {
  rig: "soft", fov: 36, tech: "Boids con grilla espacial · 340 instancias",
  hint: "Acercá el cursor al enjambre · Formar reconstruye una composición",
  controls: [
    { key: "mode", label: "Cursor", type: "select", value: "flee", options: [["flee", "Se alejan"], ["follow", "Se acercan"]] },
    { key: "form", label: "Formar", type: "toggle", value: false },
    { key: "shape", label: "Cambiar forma", type: "button" },
  ],
  async mount({ stage, swarm, kit, o, THREE }) {
    const n = stage.quality.count(340), sw = await swarm(n, { lod: "crowd" }), r = kit.rng(61), F = new Flock(sw), at = new THREE.Vector3();
    const shapes = [kit.layouts.ring(n, 2.9, .3, 2), kit.layouts.cup(n, 2.8), kit.layouts.spiral(n, { radius: 1.6, height: 5, turns: 5 }), kit.layouts.shell(n, 2.5)], loose = kit.layouts.cloud(n, [4.6, 2.6, 2], 3);
    sw.pos.set(loose); sw.quat.set(kit.randomQuats(n, 16)); for (let i = 0; i < n; i++) sw.scale[i] = .26 + r() * .18;
    stage.camera.position.set(0, 0, 10);
    const q = new THREE.Quaternion(), look = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(); let s = 0;
    return {
      update(dt, t) {
        const { pos } = sw, v = F.vel;
        if (o.form) F.spring(shapes[s], 5, dt, .5);
        else { F.spring(loose, .35, dt); for (let i = 0, j = 0; i < n; i++, j += 3) { v[j] += Math.sin(pos[j + 1] * .9 + t * .7) * 1.6 * dt; v[j + 1] += Math.sin(pos[j + 2] * .8 + t * .9) * 1.2 * dt; v[j + 2] += Math.sin(pos[j] * .7 + t * .5) * 1.2 * dt; } }      // corriente: el enjambre vaga
        F.neighbors(.42, o.form ? 6 : 14, dt, o.form ? 0 : 1.6);                // separación + alineación con los vecinos
        if (stage.pointer.inside && kit.pointerOnPlane(stage, at)) F.field(at.x, at.y, 0, o.mode === "flee" ? 2.6 : 4, o.mode === "flee" ? -46 : 22, dt, o.mode === "flee" ? 0 : .6);
        F.integrate(dt, o.form ? 3 : 1.4, 3);
        for (let i = 0, j = 0; i < n; i++, j += 3) {                             // el largo del grano se orienta hacia donde va
          const sp = Math.hypot(v[j], v[j + 1], v[j + 2]); if (sp < .15) continue;
          look.setFromUnitVectors(up, dir.set(v[j] / sp, v[j + 1] / sp, v[j + 2] / sp)); q.fromArray(sw.quat, i * 4).slerp(look, Math.min(1, dt * 3)).toArray(sw.quat, i * 4);
        }
        sw.commit();
      },
      set(k) { if (k === "shape") { s = (s + 1) % shapes.length; o.form = true; } },
      reset() { o.form = false; },
    };
  },
};
