/**
 * 12 · Coffee Cinematic Storytelling — seis fases encadenadas por scroll. Cada tramo empieza donde termina el anterior
 * (los `seg` se tocan), así no hay saltos ni zonas muertas: 1 grano · 2 conjunto · 3 flotación · 4 travesía · 5 composición · 6 cierre.
 */
export default {
  scroll: 9, rig: "side", fov: 40, rigs: false, tech: "6 fases · curva de cámara · 360 instancias",
  hint: "Scrolleá: seis fases, reversibles",
  phases: [[0, "Un grano"], [.16, "El conjunto"], [.34, "Flotación"], [.5, "Travesía"], [.68, "Composición"], [.84, "Cierre"]],
  async mount({ stage, swarm, bean, kit, captions, THREE }) {
    const hero = await bean({ variant: 3, lod: "hero", res: "2k" }), n = stage.quality.count(360), sw = await swarm(n, { lod: "crowd" }), r = kit.rng(29);
    const ball = kit.layouts.ball(n, 1.9, 2), cloud = kit.layouts.cloud(n, [5.5, 3, 4], 6), tunnel = kit.layouts.tunnel(n, { radius: 2.1, length: 24, perRing: 12, twist: .4, jitter: .5, seed: 3 }), cup = kit.layouts.cup(n, 2.7), base = kit.randomQuats(n, 8), size = new Float32Array(n), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const j = i * 3, d = Math.hypot(ball[j], ball[j + 1], ball[j + 2]), k = d < .95 ? .95 / d : 1; ball[j] *= k; ball[j + 1] *= k; ball[j + 2] *= k;      // deja libre al protagonista
      tunnel[j + 2] += 3; cup[j + 2] -= 30; size[i] = .22 + r() * .16;
    }
    stage.scene.fog = new THREE.Fog(0x120c09, 9, 34);
    const cam = kit.camTrack(stage.camera, [
      { at: 0, pos: [.5, .15, 2.5], look: [0, 0, 0] }, { at: .16, pos: [-.4, .2, 3.4], look: [0, 0, 0] }, { at: .34, pos: [0, .4, 7.6], look: [0, 0, 0] }, { at: .5, pos: [0, .2, 8.4], look: [0, 0, -3] },
      { at: .68, pos: [0, 0, -21.5], look: [0, 0, -30] }, { at: .84, pos: [.4, .25, -21.8], look: [0, 0, -30] }, { at: 1, pos: [0, .5, -23], look: [0, 0, -30] },
    ]);
    const cap = captions([
      { at: 0, to: .15, kicker: "Fase 1", title: "Todo empieza en un grano" },
      { at: .18, to: .33, kicker: "Fase 2", title: "Después, el conjunto", side: "right" },
      { at: .36, to: .49, kicker: "Fase 3", title: "Las piezas flotan" },
      { at: .52, to: .67, kicker: "Fase 4", title: "La cámara atraviesa la formación", side: "right" },
      { at: .7, to: .83, kicker: "Fase 5", title: "Los granos construyen una forma" },
      { at: .87, to: 1.1, kicker: "Fase 6", title: "Listo para servir", side: "center" },
    ]);
    let P = 0, rig = "side";
    return {
      progress(p) { P = p; },
      update(dt, t) {
        const p = P, want = p < .2 ? "side" : p < .84 ? "soft" : "back"; if (want !== rig) stage.setRig((rig = want), 1.2);
        cam(p); cap(p);
        hero.rotation.set(-.2, t * .2, .1); hero.scale.setScalar(Math.max(1e-3, 1 - kit.seg(p, .46, .56)));
        if (p < .5) kit.mixLayouts(pos, ball, cloud, kit.seg(p, .34, .5), .3); else if (p < .68) kit.mixLayouts(pos, cloud, tunnel, kit.seg(p, .5, .62), .3); else kit.mixLayouts(pos, tunnel, cup, kit.seg(p, .68, .84), .4);
        const drift = kit.seg(p, .3, .4) * (1 - kit.seg(p, .78, .86));
        for (let i = 0; i < n; i++) { const j = i * 3, d = ((i * .61803) % 1) * .5; sw.set(i, pos[j] + Math.sin(t * .4 + i) * .12 * drift, pos[j + 1] + Math.cos(t * .5 + i * 1.3) * .12 * drift, pos[j + 2]); sw.scale[i] = size[i] * kit.smooth((kit.seg(p, .16, .32) - d) / .5); }
        kit.spinQuats(sw.quat, base, p * 8 + t * .2 * (1 - kit.seg(p, .84, .92))); sw.commit();
      },
    };
  },
};
