/** 13 · Slow Motion Coffee Drop — un grano hero cae en cámara lenta, rota mostrando el material, rebota y pierde energía. La cámara lo sigue. */
import { beanWorld } from "../physics/world.js";

export default {
  rig: "back", fov: 30, shadows: true, tech: "cannon-es · tiempo escalado · Hero 2K",
  hint: "Cámara lenta: mirá el peso y el rebote · Replay lo vuelve a soltar",
  controls: [{ key: "speed", label: "Velocidad", type: "range", min: .05, max: 1, step: .05, value: .22 }],
  async mount({ stage, swarm, kit, o, THREE }) {
    const sw = await swarm(1, { lod: "hero", res: "2k", shadows: true, variants: [0] });
    const disc = new THREE.Mesh(stage.own(new THREE.CircleGeometry(9, 64)), stage.own(new THREE.MeshStandardMaterial({ color: 0x17100c, roughness: .95, envMapIntensity: .2 }))); disc.rotation.x = -Math.PI / 2; disc.receiveShadow = true; stage.scene.add(disc);
    const sc = stage.lights.key.shadow; if (stage.shadows) { Object.assign(sc.camera, { left: -3, right: 3, top: 3, bottom: -3 }); sc.camera.updateProjectionMatrix(); }
    const W = beanWorld(sw, { gravity: [0, -9.8, 0], restitution: .52, friction: .5, angularDamping: .08 }); W.plane([0, 0, 0], [0, 1, 0]);
    const b = W.add(0), look = new THREE.Vector3(0, 3, 0), eye = new THREE.Vector3(1.6, 3.2, 4);
    let rest = 0;
    const drop = () => { rest = 0; b.position.set(-.7, 3.6, 0); b.quaternion.setFromEuler(.4, .2, 1); b.velocity.set(.55, 0, 0); b.angularVelocity.set(2.8, 1.1, 3.4); b.wakeUp(); };
    drop();
    return {
      update(dt) {
        W.step(dt * o.speed);                                                  // cámara lenta: se escala el tiempo de la simulación, no los fps
        const p = b.position; look.lerp(new THREE.Vector3(p.x, Math.max(.3, p.y), p.z), 1 - Math.exp(-5 * dt));
        eye.lerp(new THREE.Vector3(p.x + 1.5, Math.max(.55, p.y * .7 + .4), p.z + 3.6), 1 - Math.exp(-2.2 * dt)); stage.camera.position.copy(eye); stage.camera.lookAt(look);
        if (b.velocity.lengthSquared() < .02 && p.y < .5) { rest += dt; if (rest > 3.5) drop(); }
      },
      reset: drop, play: drop, destroy() { W.dispose(); }, test: { b },
    };
  },
};
