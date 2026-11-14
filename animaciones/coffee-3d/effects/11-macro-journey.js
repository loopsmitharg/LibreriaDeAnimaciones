/** 11 · Coffee Macro Journey — de un grupo de granos al detalle microscópico de uno: superficie, recorrido por la hendidura y regreso. */
export default {
  scroll: 7, rig: "soft", fov: 30, shadows: true, rigs: false, tech: "Hero 2K + microdetalle · curva de cámara",
  hint: "Scrolleá para acercarte a la superficie del grano",
  phases: [[0, "Conjunto"], [.2, "Selección"], [.4, "Superficie"], [.6, "Hendidura"], [.82, "Regreso"]],
  async mount({ stage, swarm, bean, kit, captions, THREE }) {
    const hero = await bean({ variant: 0, lod: "hero", res: "2k" }); hero.rotation.set(0, .1, 0);
    const n = 42, sw = await swarm(n, { lod: "std" }), r = kit.rng(21);
    const A = kit.layouts.cloud(n, [4.2, 2.2, 2], 9), B = new Float32Array(n * 3), C = kit.layouts.ring(n, 2.7, .25, 3), base = kit.randomQuats(n, 2), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {                                              // nadie tapa al protagonista; B = el conjunto se abre y deja la escena
      const x = A[i * 3], y = A[i * 3 + 1], z = A[i * 3 + 2] - 1.2, d = Math.hypot(x, y, z), k = d < 1.7 ? 1.7 / d : 1; A.set([x * k, y * k, z * k], i * 3);
      B.set([x * k * 4.5, y * k * 4.5, z * k * 2 - 6], i * 3); sw.scale[i] = .5 + r() * .25;
    }
    const graze = new THREE.SpotLight(0xffe2bd, 0, 0, .55, .7, 1); graze.position.set(2.6, .25, .55); stage.scene.add(graze, graze.target);
    if (stage.shadows) { graze.castShadow = true; graze.shadow.mapSize.set(2048, 2048); graze.shadow.bias = -.0008; graze.shadow.normalBias = .012; graze.shadow.camera.near = 1; graze.shadow.camera.far = 5; }
    const cam = kit.camTrack(stage.camera, [
      { at: 0, pos: [0, .5, 8.6], look: [0, 0, 0] }, { at: .2, pos: [-.3, .3, 5], look: [0, 0, 0] }, { at: .4, pos: [.95, .1, 1.9], look: [0, 0, 0] },
      { at: .52, pos: [.5, -.12, .86], look: [.1, -.12, .1] }, { at: .62, pos: [.14, -.44, .7], look: [0, -.3, .05] }, { at: .8, pos: [.14, .42, .7], look: [0, .3, .05] },
      { at: .9, pos: [.7, .35, 2.6], look: [0, 0, 0] }, { at: 1, pos: [0, .3, 8.8], look: [0, 0, 0] },
    ]);
    const cap = captions([
      { at: .02, to: .18, kicker: "01 · Conjunto", title: "Cada grano es distinto", text: "Nueve variantes geométricas modeladas en Blender." },
      { at: .22, to: .38, kicker: "02 · Selección", title: "Elegimos uno", text: "El resto se abre y deja la escena." },
      { at: .42, to: .58, kicker: "03 · Superficie", title: "Poros, arrugas y grietas", text: "Normal map horneado + microdetalle bajo luz rasante.", side: "right" },
      { at: .62, to: .8, kicker: "04 · Hendidura", title: "Profundidad real", text: "La ranura es geometría: proyecta su propia sombra.", side: "right" },
      { at: .86, to: 1.1, kicker: "05 · Regreso", title: "Una nueva composición", text: "", side: "center" },
    ]);
    let P = 0, rig = "soft";
    return {
      progress(p) { P = p; },
      update(dt, t) {
        const p = P, want = p > .33 && p < .88 ? "side" : "soft"; if (want !== rig) stage.setRig((rig = want), 1.4);
        cam(p); cap(p); graze.intensity = 9 * kit.seg(p, .36, .5) * (1 - kit.seg(p, .82, .92));
        if (p < .6) kit.mixLayouts(pos, A, B, kit.seg(p, .16, .42), .3); else kit.mixLayouts(pos, B, C, kit.seg(p, .8, 1), .3);
        const idle = 1 - kit.seg(p, .9, 1);                                    // la composición final queda quieta
        for (let i = 0; i < n; i++) sw.set(i, pos[i * 3], pos[i * 3 + 1] + Math.sin(t * .5 + i) * .06 * idle, pos[i * 3 + 2]);
        kit.spinQuats(sw.quat, base, p * 5 + t * .12 * idle); sw.commit();
      },
    };
  },
};
