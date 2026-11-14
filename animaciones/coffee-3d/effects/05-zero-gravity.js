/** 05 · Zero Gravity Beans — granos suspendidos en profundidad que rotan lento en varios ejes y se apartan suavemente del cursor. */
import { Flock } from "../physics/flock.js";

export default {
  rig: "back", fov: 40, tech: "Partículas · niebla de profundidad",
  hint: "Acercá el cursor: los granos se apartan con suavidad",
  async mount({ stage, swarm, kit, THREE }) {
    const n = 72, sw = await swarm(n, { lod: "std" }), r = kit.rng(17), home = kit.layouts.cloud(n, [6, 3.2, 4.5], 4, [0, 0, -2.5]), F = new Flock(sw);
    sw.pos.set(home); sw.quat.set(kit.randomQuats(n, 1)); for (let i = 0; i < n; i++) sw.scale[i] = .5 + r() * .5;
    for (let i = 0; i < n * 3; i++) F.spin[i] = (r() - .5) * .9;
    stage.scene.fog = new THREE.Fog(0x110b08, 6, 17); stage.camera.position.set(0, 0, 8);
    let cx = 0, cy = 0;
    return {
      update(dt, t) {
        F.spring(home, .7, dt);
        for (let i = 0, j = 0; i < n; i++, j += 3) { F.vel[j] += Math.sin(t * .23 + i * 1.7) * .05 * dt; F.vel[j + 1] += Math.cos(t * .19 + i * 2.3) * .06 * dt; }      // deriva lenta, distinta por grano
        if (stage.pointer.inside) { stage.raycaster.setFromCamera(stage.pointer, stage.camera); F.rayField(stage.raycaster.ray, 1.5, 7, dt); }
        F.tumble(.22, dt); F.integrate(dt, .9, .45); sw.commit();
        cx = kit.damp(cx, stage.pointer.x * .7, 2, dt); cy = kit.damp(cy, stage.pointer.y * .4, 2, dt); stage.camera.position.set(cx, cy, 8); stage.camera.lookAt(0, 0, -2.5);
      },
      reset() { F.vel.fill(0); sw.pos.set(home); },
    };
  },
};
