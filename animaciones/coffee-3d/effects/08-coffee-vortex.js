/** 08 · Coffee Vortex — un vórtice de granos; el scroll gira la formación, la dispersa y lleva la cámara por su centro. */
export default {
  scroll: 6, rig: "back", fov: 46, roast: "dark", tech: "ScrollTrigger scrub · 520 instancias",
  hint: "Scrolleá: la cámara avanza por el centro del vórtice",
  async mount({ stage, swarm, kit, THREE }) {
    const n = stage.quality.count(520), sw = await swarm(n, { lod: "crowd" }), r = kit.rng(8), base = kit.randomQuats(n, 5), jit = new Float32Array(n), LEN = 44;
    for (let i = 0; i < n; i++) { sw.scale[i] = .34 + r() * .3; jit[i] = r(); }
    stage.scene.fog = new THREE.Fog(0x120c09, 5, 30);
    const follow = new THREE.PointLight(0xffd9b0, 30, 14, 1.6); stage.scene.add(follow);                // viaja con la cámara: las superficies reaccionan al avanzar
    let P = 0;
    return {
      progress(p) { P = p; },
      update(dt, t) {
        const p = P, spread = kit.seg(p, .78, 1) * 3.2, open = 1 - kit.seg(p, 0, .12) * .25;
        for (let i = 0; i < n; i++) {
          const d = i / n, a = i * 2.39996 + p * (7 - 4 * d) + t * .05 * (1 + jit[i]), R = (1.25 + 1.9 * Math.sin(d * Math.PI) ** 1.5 + jit[i] * .7) * open + spread * (.4 + jit[i]);
          sw.set(i, Math.cos(a) * R, Math.sin(a) * R, 6 - d * LEN + Math.sin(i * 1.7) * .4);
        }
        kit.spinQuats(sw.quat, base, p * 9 + t * .25); sw.commit();
        const z = 10 - p * (LEN - 2); stage.camera.position.set(Math.sin(p * 5) * .28, Math.cos(p * 4) * .2, z); stage.camera.lookAt(0, 0, z - 6); stage.camera.rotateZ(p * 1.1); follow.position.set(0, 0, z - 1.5);
      },
    };
  },
};
