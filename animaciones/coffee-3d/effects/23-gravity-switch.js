/** 23 · Coffee Gravity Switch — granos suspendidos dentro de una caja; al cambiar la dirección de la gravedad caen hacia otra pared. */
import { beanWorld } from "../physics/world.js";

const DIRS = { none: [0, 0, 0], down: [0, -1, 0], up: [0, 1, 0], left: [-1, 0, 0], right: [1, 0, 0], back: [0, 0, -1] };
export default {
  rig: "soft", fov: 32, tech: "cannon-es · gravedad interpolada",
  hint: "Elegí hacia dónde cae todo",
  controls: [{ key: "dir", label: "Gravedad", type: "select", value: "none", options: [["none", "Sin gravedad"], ["down", "Abajo"], ["up", "Arriba"], ["left", "Izquierda"], ["right", "Derecha"], ["back", "Al fondo"]] }],
  async mount({ stage, swarm, kit, o, THREE }) {
    const n = stage.quality.low ? 60 : 100, sw = await swarm(n, { lod: "std" }), r = kit.rng(67), HALF = [3.3, 2.05, 1.3], home = kit.layouts.cloud(n, [2.8, 1.6, .9], 5);
    sw.pos.set(home); sw.quat.set(kit.randomQuats(n, 18)); for (let i = 0; i < n; i++) sw.scale[i] = .4 + r() * .14;
    const edges = new THREE.LineSegments(stage.own(new THREE.EdgesGeometry(new THREE.BoxGeometry(HALF[0] * 2, HALF[1] * 2, HALF[2] * 2))), stage.own(new THREE.LineBasicMaterial({ color: 0xf6ecdf, transparent: true, opacity: .22 }))); stage.scene.add(edges);
    stage.camera.position.set(0, 0, 10.5);
    const W = beanWorld(sw, { gravity: [0, 0, 0], restitution: .35, friction: .45, linearDamping: .08, angularDamping: .12 }); W.box(HALF);
    for (let i = 0; i < n; i++) W.add(i).angularVelocity.set(r() - .5, r() - .5, r() - .5);
    const g = new THREE.Vector3(), want = new THREE.Vector3();
    return {
      update(dt) {
        want.fromArray(DIRS[o.dir]).multiplyScalar(13); g.lerp(want, 1 - Math.exp(-4 * dt));      // la gravedad gira de forma continua, no salta
        W.world.gravity.set(g.x, g.y, g.z); W.step(dt);
      },
      set() { W.wakeAll(); },
      reset() { o.dir = "none"; for (let i = 0; i < n; i++) { const b = W.bodies[i]; b.position.set(home[i * 3], home[i * 3 + 1], home[i * 3 + 2]); b.velocity.setZero(); b.wakeUp(); } },
      destroy() { W.dispose(); }, test: { W, HALF },
    };
  },
};
