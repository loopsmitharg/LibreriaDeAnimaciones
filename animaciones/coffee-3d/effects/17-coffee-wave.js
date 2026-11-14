/** 17 · Coffee Wave — cientos de granos instanciados forman una superficie que ondula; el cursor agrega una onda circular. */
export default {
  rig: "back", fov: 36, tech: "InstancedMesh · 900 granos · 9 draw calls",
  hint: "Mové el cursor sobre la superficie para sumar una onda",
  controls: [{ key: "amp", label: "Amplitud", type: "range", min: 0, max: 1.2, step: .05, value: .5 }],
  async mount({ stage, swarm, kit, o, THREE }) {
    const low = stage.quality.low, nx = low ? 26 : 38, nz = low ? 16 : 24, n = nx * nz, sw = await swarm(n, { lod: "crowd" }), r = kit.rng(47), G = kit.layouts.grid(nx, nz, .44), base = kit.randomQuats(n, 10);
    for (let i = 0; i < n; i++) { sw.scale[i] = .34 + r() * .1; G[i * 3] += (r() - .5) * .14; G[i * 3 + 2] += (r() - .5) * .14; }
    stage.camera.position.set(0, 4.6, 9.2); stage.camera.lookAt(0, -.3, 0);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(99, 0, 99); let ripple = 0;
    return {
      update(dt, t) {
        const on = stage.pointer.inside && (stage.raycaster.setFromCamera(stage.pointer, stage.camera), stage.raycaster.ray.intersectPlane(plane, hit)); ripple = kit.damp(ripple, on ? 1 : 0, 3, dt);
        for (let i = 0; i < n; i++) {
          const j = i * 3, x = G[j], z = G[j + 2], d = Math.hypot(x - hit.x, z - hit.z);
          const y = o.amp * (Math.sin(x * .85 + t * 1.3) * .7 + Math.sin(z * 1.15 - t * 1.05 + x * .35) * .45) + ripple * .55 * Math.exp(-d * d * .35) * Math.sin(d * 3.2 - t * 5);
          sw.set(i, x, y, z);
        }
        kit.spinQuats(sw.quat, base, t * .35); sw.commit();                     // cada grano conserva su orientación y giro propios
      },
    };
  },
};
