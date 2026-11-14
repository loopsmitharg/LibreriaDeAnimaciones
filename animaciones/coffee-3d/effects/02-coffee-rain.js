/** 02 · Coffee Rain — lluvia de granos: caen desde distintas alturas, rebotan y se acumulan sobre una superficie (cuerpos rígidos reales). */
import { beanWorld } from "../physics/world.js";

export default {
  rig: "back", fov: 34, shadows: true, tech: "cannon-es · instancing",
  hint: "Los granos rebotan y se apilan · Replay vuelve a llover",
  controls: [{ key: "bounce", label: "Rebote", type: "range", min: 0, max: .8, step: .05, value: .35 }, { key: "rate", label: "Caudal", type: "range", min: 8, max: 60, step: 1, value: 30 }],
  async mount({ stage, swarm, kit, o }) {
    const low = stage.quality.low, n = low ? 110 : 220, sw = await swarm(n, { lod: low ? "crowd" : "std", shadows: true }), r = kit.rng(11), FLOOR = -1.9;
    for (let i = 0; i < n; i++) sw.scale[i] = .36 + r() * .14;
    stage.camera.position.set(0, .9, 9.5); stage.camera.lookAt(0, -.5, 0); stage.addFloor(FLOOR, .45);
    const W = beanWorld(sw, { gravity: [0, -13, 0], restitution: o.bounce, friction: .5, angularDamping: .1 });
    W.plane([0, FLOOR, 0], [0, 1, 0]); W.plane([-3.6, 0, 0], [1, 0, 0]); W.plane([3.6, 0, 0], [-1, 0, 0]); W.plane([0, 0, -1.5], [0, 0, 1]); W.plane([0, 0, 1.5], [0, 0, -1]);
    for (let i = 0; i < n; i++) W.add(i, { live: false });
    let released = 0, clock = 0;
    const park = () => { released = 0; clock = 0; for (let i = 0; i < n; i++) W.park(i).position.set(0, 1000 + i, 0); };
    const drop = (i) => {                                                    // cada grano: altura, trayectoria, giro y orientación propios
      const b = W.bodies[i]; b.position.set((r() * 2 - 1) * 3, 4.6 + r() * 2.5, (r() * 2 - 1) * 1.1); b.quaternion.setFromEuler(r() * 6.28, r() * 6.28, r() * 6.28);
      b.velocity.set((r() - .5) * 1.6, -1 - r() * 4, (r() - .5) * .6); b.angularVelocity.set((r() - .5) * 9, (r() - .5) * 9, (r() - .5) * 9); W.release(i);
    };
    park();
    return {
      update(dt) { clock += dt; while (released < n && released < clock * o.rate) drop(released++); W.step(dt); },
      set(k, v) { if (k === "bounce") W.contact.restitution = v; },
      reset: park, play: park,
      destroy() { W.dispose(); },
      test: { sw, W, FLOOR },
    };
  },
};
