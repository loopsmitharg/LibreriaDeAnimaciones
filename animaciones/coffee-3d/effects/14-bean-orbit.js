/** 14 · Coffee Bean Orbit — granos en órbitas 3D con planos, radios y velocidades distintos alrededor de un grano central. Cámara libre. */
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default {
  rig: "back", fov: 34, tech: "Órbitas paramétricas · OrbitControls",
  hint: "Arrastrá para cambiar la orientación de la cámara",
  controls: [{ key: "speed", label: "Velocidad", type: "range", min: 0, max: 3, step: .1, value: 1 }],
  async mount({ stage, swarm, bean, kit, o, THREE }) {
    const n = 54, sw = await swarm(n, { lod: "std" }), core = await bean({ variant: 2, lod: "std", res: "1k" }), r = kit.rng(37), base = kit.randomQuats(n, 6), v = new THREE.Vector3();
    core.scale.setScalar(1.5);
    const orb = Array.from({ length: n }, () => { const rad = 1.7 + r() * 2.6; return { rad, w: .9 / Math.sqrt(rad) * (r() < .5 ? 1 : -1) * (.7 + r() * .6), ph: r() * 6.28, q: new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - .5) * 1.5, r() * 6.28, (r() - .5) * 1.5)), ecc: .75 + r() * .25 }; });
    for (let i = 0; i < n; i++) sw.scale[i] = .3 + r() * .28;
    stage.camera.position.set(0, 2.2, 9);
    const ctl = new OrbitControls(stage.camera, stage.canvas); Object.assign(ctl, { enableDamping: true, enablePan: false, minDistance: 4, maxDistance: 14 }); stage.keep({ kill: () => ctl.dispose() });
    let a = 0;
    return {
      update(dt, t) {
        a += dt * o.speed; ctl.update(); core.rotation.set(.3, a * .25, .1);
        for (let i = 0; i < n; i++) { const k = orb[i], ang = k.ph + a * k.w; v.set(Math.cos(ang) * k.rad, 0, Math.sin(ang) * k.rad * k.ecc).applyQuaternion(k.q); sw.set(i, v.x, v.y, v.z); }
        kit.spinQuats(sw.quat, base, a * .8); sw.commit();
      },
      reset() { a = 0; stage.camera.position.set(0, 2.2, 9); ctl.target.set(0, 0, 0); },
    };
  },
};
