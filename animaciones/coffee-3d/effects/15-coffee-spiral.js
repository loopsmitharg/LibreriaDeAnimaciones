/** 15 · Coffee Spiral — una espiral vertical que gira, se comprime y se expande; algunos granos se separan un momento y vuelven a su lugar. */
export default {
  rig: "back", fov: 34, roast: "medium", tech: "Paramétrico · 240 instancias",
  hint: "La espiral respira: se comprime, se expande y suelta granos que regresan",
  async mount({ stage, swarm, kit }) {
    const n = stage.quality.count(240), sw = await swarm(n, { lod: "crowd" }), r = kit.rng(41), base = kit.randomQuats(n, 12), rnd = new Float32Array(n);
    for (let i = 0; i < n; i++) { sw.scale[i] = .3 + r() * .2; rnd[i] = r(); }
    stage.camera.position.set(0, .4, 10);
    return {
      update(dt, t) {
        const breath = Math.sin(t * .55), H = 5 * (.6 + .4 * breath), R = 1.55 * (1.12 - .32 * breath);
        for (let i = 0; i < n; i++) {
          const u = i / (n - 1), a = u * 5.5 * 6.2832 + t * .55, out = rnd[i] < .22 ? Math.max(0, Math.sin(t * .45 + rnd[i] * 28)) ** 10 : 0, rr = R * (1 + out * 1.5) + (rnd[i] - .5) * .25;      // escapes breves
          sw.set(i, Math.cos(a) * rr, (u - .5) * H + out * .4, Math.sin(a) * rr);
        }
        kit.spinQuats(sw.quat, base, t * .5); sw.commit();
      },
    };
  },
};
