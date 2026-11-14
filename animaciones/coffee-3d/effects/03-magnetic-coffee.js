/** 03 · Magnetic Coffee — un campo en el cursor atrae o repele a los granos, con inercia, amortiguación y respuesta distinta por grano. */
import { Flock } from "../physics/flock.js";

export default {
  rig: "soft", roast: "dark", tech: "Campo de fuerza · 260 instancias",
  hint: "Mové el cursor entre los granos · cambiá entre atraer y repeler",
  controls: [
    { key: "mode", label: "Modo", type: "select", value: "attract", options: [["attract", "Atraer"], ["repel", "Repeler"]] },
    { key: "force", label: "Fuerza", type: "range", min: .2, max: 2.5, step: .1, value: 1 },
  ],
  async mount({ stage, swarm, kit, o, THREE }) {
    const n = stage.quality.count(260), sw = await swarm(n, { lod: "crowd" }), r = kit.rng(13), home = kit.layouts.cloud(n, [4.8, 2.6, .8], 6), F = new Flock(sw), at = new THREE.Vector3();
    sw.pos.set(home); sw.quat.set(kit.randomQuats(n, 9)); for (let i = 0; i < n; i++) sw.scale[i] = .3 + r() * .22;
    stage.camera.position.set(0, 0, 9.5);
    return {
      update(dt) {
        F.spring(home, 3.2, dt, .5);
        if (stage.pointer.inside && kit.pointerOnPlane(stage, at)) F.field(at.x, at.y, 0, 2.8, (o.mode === "repel" ? -34 : 26) * o.force, dt, o.mode === "repel" ? 0 : .45);
        F.neighbors(.36, 16, dt); F.tumble(.3, dt); F.integrate(dt, 2.4, 1.1); sw.commit();
      },
      reset() { F.vel.fill(0); sw.pos.set(home); },
    };
  },
};
