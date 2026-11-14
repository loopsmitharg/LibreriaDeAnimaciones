/** 07 · Coffee Explosion — un racimo compacto que se separa en el espacio con el scroll: unos pasan junto a la cámara, otros retroceden. Reversible. */
export default {
  scroll: 5, rig: "soft", fov: 38, tech: "ScrollTrigger scrub · 420 instancias",
  hint: "Scrolleá hacia abajo para separar los granos y hacia arriba para reunirlos",
  async mount({ stage, swarm, kit }) {
    const n = stage.quality.count(420), sw = await swarm(n, { lod: "crowd" }), r = kit.rng(5), A = kit.layouts.ball(n, 1.15, 3), B = kit.layouts.cloud(n, [8, 4.6, 8.5], 8, [0, 0, -1.5]), base = kit.randomQuats(n, 7), size = new Float32Array(n);
    for (let i = 0; i < n; i++) size[i] = .3 + r() * .26;
    stage.camera.position.set(0, 0, 9);
    let P = 0;
    return {
      progress(p) { P = p; },
      update(dt, t) {
        const p = P; kit.mixLayouts(sw.pos, A, B, p, .35, (k) => 1 - (1 - k) ** 3);
        for (let i = 0; i < n; i++) { sw.pos[i * 3 + 1] += Math.sin(t * .6 + i) * .05 * p; sw.scale[i] = size[i] * (1 + p * .5); }
        kit.spinQuats(sw.quat, base, p * 7 + t * .15); sw.group.rotation.y = p * .7 + t * .03; sw.commit();
        stage.camera.position.z = 9 - p * 1.2;
      },
    };
  },
};
