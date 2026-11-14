/**
 * 24 · Ultimate Coffee Experience — la pieza principal. Una secuencia dirigida por scroll con momentos de calma:
 *   1 Macro (grano hero bajo luz rasante) → 2 Distancia → 3 Descomposición (el grano se abre en un enjambre con inercia)
 *   → 4 Calma (flotación; el cursor aparta los granos) → 5 Formación (esfera) → 6 Composición (taza) → 7 Cierre.
 * El scroll decide la composición; los granos llegan a ella con resortes (Flock), por eso hay inercia real al scrollear rápido.
 */
import { Flock } from "../physics/flock.js";

export default {
  scroll: 11, rig: "side", fov: 34, rigs: false, shadows: true, roast: "dark", tech: "Hero 2K + 420 instancias con inercia",
  hint: "Scrolleá despacio · en la fase de calma, mové el cursor entre los granos",
  phases: [[0, "Macro"], [.14, "Distancia"], [.3, "Descomposición"], [.46, "Calma"], [.62, "Formación"], [.76, "Composición"], [.9, "Cierre"]],
  async mount({ stage, swarm, bean, kit, captions, THREE }) {
    const hero = await bean({ variant: 0, lod: "hero", res: "2k" }), n = stage.quality.count(420), sw = await swarm(n, { lod: "crowd" }), F = new Flock(sw), r = kit.rng(71);
    const cloud = kit.layouts.cloud(n, [6, 3.4, 3.6], 7), shell = kit.layouts.shell(n, 2.7), cup = kit.layouts.cup(n, 2.9), tgt = new Float32Array(n * 3), tmp = new Float32Array(n * 3), size = new Float32Array(n);
    sw.quat.set(kit.randomQuats(n, 20)); for (let i = 0; i < n; i++) size[i] = .24 + r() * .18;
    const graze = new THREE.SpotLight(0xffe2bd, 0, 0, .55, .7, 1); graze.position.set(2.5, .3, .6); stage.scene.add(graze, graze.target);
    if (stage.shadows) { graze.castShadow = true; graze.shadow.mapSize.set(2048, 2048); graze.shadow.bias = -.0008; graze.shadow.normalBias = .012; graze.shadow.camera.near = 1; graze.shadow.camera.far = 5; }
    const cam = kit.camTrack(stage.camera, [
      { at: 0, pos: [.3, .1, .84], look: [.08, 0, .1] }, { at: .14, pos: [.6, .25, 1.6], look: [0, 0, 0] }, { at: .3, pos: [0, .2, 6.4], look: [0, 0, 0] }, { at: .46, pos: [0, .3, 8.8], look: [0, 0, 0] },
      { at: .62, pos: [1.6, .6, 8.4], look: [0, 0, 0] }, { at: .76, pos: [-1.1, .4, 8.8], look: [0, 0, 0] }, { at: .9, pos: [0, .2, 8.6], look: [0, 0, 0] }, { at: 1, pos: [0, .1, 7.6], look: [0, 0, 0] },
    ]);
    const cap = captions([
      { at: 0, to: .13, kicker: "Coffee 3D Motion Lab", title: "Mirá de cerca", text: "Poros, arrugas y una hendidura con profundidad real." },
      { at: .16, to: .29, kicker: "Un grano", title: "Modelado, no dibujado", text: "Geometría de Blender, mapas PBR horneados.", side: "right" },
      { at: .33, to: .45, kicker: "Descomposición", title: "Uno se vuelve cientos" },
      { at: .49, to: .61, kicker: "Calma", title: "Tocá el aire", text: "Mové el cursor: los granos se apartan y vuelven.", side: "right" },
      { at: .65, to: .75, kicker: "Formación", title: "El enjambre se ordena" },
      { at: .79, to: .89, kicker: "Composición", title: "Y dibuja una taza", side: "right" },
      { at: .93, to: 1.1, kicker: "Cierre", title: "Hecho grano a grano", side: "center" },
    ]);
    let P = 0, rig = "side";
    return {
      progress(p) { P = p; },
      update(dt, t) {
        const p = P, want = p < .26 ? "side" : p < .9 ? "soft" : "back"; if (want !== rig) stage.setRig((rig = want), 1.3);
        cam(p); cap(p); graze.intensity = 10 * (1 - kit.seg(p, .2, .3));
        hero.rotation.set(-.15, .25 + t * .12, .08); hero.scale.setScalar(Math.max(1e-3, 1 - kit.seg(p, .3, .37)));
        const born = kit.seg(p, .3, .4);
        if (born <= 0) { sw.pos.fill(0); F.vel.fill(0); }                       // antes de la descomposición el enjambre espera dentro del grano
        else {
          kit.mixLayouts(tmp, cloud, shell, kit.seg(p, .62, .72), .3); kit.mixLayouts(tgt, tmp, cup, kit.seg(p, .76, .88), .4);
          const calm = 1 - kit.seg(p, .6, .68);
          if (calm > 0) for (let i = 0, j = 0; i < n; i++, j += 3) { tgt[j] += Math.sin(t * .3 + i) * .25 * calm; tgt[j + 1] += Math.cos(t * .37 + i * 1.7) * .25 * calm; }
          F.spring(tgt, 5.5, dt, .5);
          if (stage.pointer.inside && p > .42) { stage.raycaster.setFromCamera(stage.pointer, stage.camera); F.rayField(stage.raycaster.ray, 1.6, 26, dt); }
          F.tumble(.35 * (1 - kit.seg(p, .86, .94)), dt); F.integrate(dt, 3.2, 1.3);
        }
        for (let i = 0; i < n; i++) sw.scale[i] = size[i] * born;
        sw.group.rotation.y = kit.seg(p, .62, .72) * (1 - kit.seg(p, .76, .86)) * Math.sin(t * .2) * .5; sw.commit();
      },
    };
  },
};
