/** 01 · Coffee Bean Playground — granos flotando que se agarran (raycasting sobre la malla real), se lanzan y chocan entre sí. */
import { beanWorld } from "../physics/world.js";

export default {
  rig: "soft", tech: "cannon-es · Std 6k tris",
  hint: "Arrastrá un grano y soltalo con impulso · Reset los devuelve a su formación",
  controls: [{ key: "gravity", label: "Gravedad", type: "toggle", value: false }],
  async mount({ stage, swarm, kit }) {
    const n = 40, sw = await swarm(n, { lod: "std" }), r = kit.rng(4);
    const home = kit.layouts.cloud(n, [3.3, 1.8, .9], 7), homeQ = kit.randomQuats(n, 3);
    sw.pos.set(home); sw.quat.set(homeQ); for (let i = 0; i < n; i++) sw.scale[i] = .55 + r() * .22;
    stage.camera.position.set(0, 0, 9);
    const W = beanWorld(sw, { gravity: [0, 0, 0], linearDamping: .28, angularDamping: .3, sleep: false, restitution: .55 });
    for (let i = 0; i < n; i++) { const b = W.add(i); b.angularVelocity.set(r() - .5, r() - .5, r() - .5); }
    const walls = W.box([4.2, 2.5, 1.6]);
    stage.onResize = (w, h) => { const hw = Math.max(1.6, 2.45 * (w / h)); walls[0].position.x = -hw; walls[1].position.x = hw; }; stage.onResize(stage.width, stage.height);   // las paredes siguen al encuadre
    let held = -1, homing = 0; const target = new kit.THREE.Vector3(), tq = new W.CANNON.Quaternion();
    kit.dragger(stage, (ray) => sw.pick(ray), {
      start(i, p) { held = i; target.copy(p); homing = 0; },
      move(i, p) { target.copy(p); },
      end(i, v) { const b = W.bodies[i]; v.clampLength(0, 22); b.velocity.set(v.x, v.y, v.z); b.angularVelocity.set(v.y * .8, -v.x * .8, (v.x - v.y) * .3); held = -1; },   // throw: conserva la inercia del gesto
    });
    return {
      update(dt) {
        if (held >= 0) { const b = W.bodies[held], p = b.position; b.velocity.set((target.x - p.x) * 20, (target.y - p.y) * 20, (target.z - p.z) * 20); b.angularVelocity.scale(.9, b.angularVelocity); }
        if (homing > 0) {                                                  // Reset: resorte suave hacia la formación inicial
          homing -= dt;
          for (let i = 0; i < n; i++) {
            const b = W.bodies[i], p = b.position, v = b.velocity; v.x += (home[i * 3] - p.x) * 7 * dt; v.y += (home[i * 3 + 1] - p.y) * 7 * dt; v.z += (home[i * 3 + 2] - p.z) * 7 * dt; v.scale(Math.exp(-3 * dt), v);
            tq.set(homeQ[i * 4], homeQ[i * 4 + 1], homeQ[i * 4 + 2], homeQ[i * 4 + 3]); b.quaternion.slerp(tq, Math.min(1, dt * 2.5), b.quaternion); b.angularVelocity.scale(.9, b.angularVelocity);
          }
        }
        W.step(dt);
      },
      set(k, v) { if (k === "gravity") { W.world.gravity.set(0, v ? -9 : 0, 0); W.wakeAll(); } },
      reset() { homing = 3.2; W.world.gravity.set(0, 0, 0); },
      destroy() { W.dispose(); },
      test: { sw, W },
    };
  },
};
