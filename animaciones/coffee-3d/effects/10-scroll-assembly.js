/** 10 · Scroll Coffee Assembly — granos dispersos que el scroll ordena hasta dibujar una taza; al final la composición queda completamente quieta. */
export default {
  scroll: 5, rig: "soft", fov: 36, bg: "cream", roast: "dark", tech: "ScrollTrigger scrub · composición por rechazo",
  hint: "Scrolleá para ensamblar la taza",
  async mount({ stage, swarm, kit, THREE }) {
    const n = stage.quality.count(460), sw = await swarm(n, { lod: "crowd" }), r = kit.rng(23), A = kit.layouts.cloud(n, [8, 4.6, 6], 12, [0, 0, -1]), B = kit.layouts.cup(n, 2.9), base = kit.randomQuats(n, 4), q = new THREE.Quaternion(), qt = new THREE.Quaternion(), e = new THREE.Euler();
    const face = new Float32Array(n * 4);                                      // orientación final: hendidura al frente, con una inclinación propia
    for (let i = 0; i < n; i++) { sw.scale[i] = .2 + r() * .1; qt.setFromEuler(e.set((r() - .5) * .5, (r() - .5) * .5, r() * 6.28)).toArray(face, i * 4); }
    stage.camera.position.set(0, 0, 9.5);
    let P = 0;
    return {
      progress(p) { P = p; },
      update(dt, t) {
        const k = kit.seg(P, .05, .9), idle = 1 - kit.seg(P, .8, .92);          // idle = 0 al final: nada se mueve
        kit.mixLayouts(sw.pos, A, B, k, .45);
        kit.spinQuats(sw.quat, base, (1 - k) * 6 + t * .2 * idle);
        for (let i = 0; i < n; i++) { const d = ((i * .61803) % 1) * .45, ki = kit.smooth((k - d) / .55); q.fromArray(sw.quat, i * 4).slerp(qt.fromArray(face, i * 4), ki).toArray(sw.quat, i * 4); sw.pos[i * 3 + 1] += Math.sin(t * .7 + i) * .08 * idle; }
        sw.commit(); stage.camera.position.z = 9.5 - k * 1.3;
      },
    };
  },
};
