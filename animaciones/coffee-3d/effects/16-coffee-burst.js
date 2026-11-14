/** 16 · Coffee Burst — explosión radial coreografiada: la expansión recorre la esfera como una ola, queda suspendida y regresa con precisión. */
export default {
  rig: "back", fov: 36, roast: "dark", tech: "Coreografía por desfase angular · 320 instancias",
  hint: "Compacto → expansión radial → suspensión → regreso · Burst lo repite",
  controls: [{ key: "burst", label: "Burst", type: "button" }],
  async mount({ stage, swarm, kit, gsap }) {
    const n = stage.quality.count(320), sw = await swarm(n, { lod: "crowd" }), r = kit.rng(43), A = kit.layouts.ball(n, 1, 4), D = kit.layouts.shell(n, 1), base = kit.randomQuats(n, 14), reach = new Float32Array(n), delay = new Float32Array(n);
    for (let i = 0; i < n; i++) { sw.scale[i] = .28 + r() * .2; reach[i] = 2.6 + r() * 2.2; delay[i] = (Math.atan2(D[i * 3 + 2], D[i * 3]) / 6.2832 + .5) * .7 + (D[i * 3 + 1] + 1) * .15; }      // la ola avanza alrededor del eje vertical
    const out = gsap.parseEase("expo.out"), back = gsap.parseEase("power3.inOut"), T = 8.5;
    stage.camera.position.set(0, 0, 10.5);
    let t0 = 0, now = 0;
    return {
      update(dt, t) {
        now = t;
        for (let i = 0; i < n; i++) {
          const c = ((t - t0) % T) - delay[i], j = i * 3;
          const e = c < .6 ? 0 : c < 2.4 ? out((c - .6) / 1.8) : c < 4.6 ? 1 + (c - 2.4) * .012 : c < 6.6 ? (1 + 2.2 * .012) * (1 - back((c - 4.6) / 2)) : 0;
          sw.set(i, A[j] + (D[j] * reach[i] - A[j]) * e, A[j + 1] + (D[j + 1] * reach[i] - A[j + 1]) * e, A[j + 2] + (D[j + 2] * reach[i] - A[j + 2]) * e);
        }
        kit.spinQuats(sw.quat, base, t * .25); sw.group.rotation.y = t * .12; sw.commit();
      },
      set(k) { if (k === "burst") t0 = now; }, reset() { t0 = now; }, play() { t0 = now; },
    };
  },
};
