/* 24 · Ultimate 3D Brand Experience — intro, interacción, descomposición, editorial, remolino, resolución y cierre. */
import * as THREE from "three";
import { Track, CamPath, scatter, rng, seg, V } from "../core/kit.js";

const CH = [
  { at: .01, to: .1, kicker: "Loop Smith", title: "Una identidad que cobra vida.", side: "left" },
  { at: .32, to: .44, kicker: "01 · Presencia", title: "Acercate.", text: "Las letras sienten el cursor.", side: "right" },
  { at: .5, to: .62, kicker: "02 · Descomposición", title: "Sin peso.", text: "Empujalas: cada una tiene su trayectoria.", side: "left" },
  { at: .7, to: .78, kicker: "03 · Editorial", title: "Dos líneas, una voz.", side: "top" },
  { at: .93, to: 1.02, kicker: "04 · Cierre", title: "Work Smarter.", side: "center" },
];

export default {
  id: "ultimate-brand-experience", n: "24", group: "D", name: "Ultimate 3D Brand Experience", hint: ["scroll", "hover"], preset: "chrome", flagship: true,
  scroll: { length: 10, phases: [[0, "Intro"], [.1, "Armado"], [.3, "Presencia"], [.48, "Descomposición"], [.66, "Editorial"], [.78, "Remolino"], [.88, "Resolución"], [.95, "Cierre"]], after: "<small>Fin</small>El logo quedó en su lugar." },
  lead: "La pieza que reúne todo: una intro con el símbolo girando, el armado del lockup, letras que reaccionan al cursor, una descomposición sin gravedad donde el mouse las empuja, una composición editorial en dos líneas, un remolino y la resolución del logo, que pasa de cromo a su identidad. Calma, sorpresa y cierre.",
  fields: [["length", "Largo del recorrido (pantallas)", 10, 7, 14, .5], ["force", "Fuerza del cursor", 1, 0, 2.2, .05], ["scrub", "Inercia del scroll (s)", .75, 0, 1.5, .05]],
  tech: "Dos capas se suman cada frame: la pose (Track con cuaterniones, función pura del progreso) y un desvío físico por pieza (repulsión del cursor + resorte) que se multiplica por una envolvente que vale 0 al inicio y al final: la última imagen es siempre el logo exacto. La cámara sigue una curva Catmull-Rom; el material cambia de cromo a identidad al cruzar el 88 %.",
  mobile: "El desvío por cursor usa el toque; la composición editorial se recalcula con el aspecto.",
  mount({ stage, logo, o, scrollScene, captions }) {
    const n = logo.pieces.length, cap = captions(CH), sym = logo.symbol;
    const dev = logo.pieces.map(() => ({ p: V(), v: V() })), closest = V(), tmp = V(); let track, cam, flag = false;
    const build = () => {
      const d = stage.frame(), O = [0, 0, 0];
      const hidden = (p, i) => (p === sym ? { p: O, r: [0, -Math.PI * 1.5, 0], s: .3 } : { p: [p.userData.home.position.x * 2, p.userData.home.position.y + 1, -9], r: [i, i * 1.3, 0], s: .001 });
      const shown = (p, i) => (p === sym ? { p: O, r: [0, 0, 0], s: 1.15 } : hidden(p, i));
      const float = (seed) => (p, i) => scatter(i, { seed, spread: [4.2, 2.1, 2.2], center: [0, 0, -.6], tumble: 2.4, scale: [.85, 1.3] });
      const words = [0, 1].map((w) => { const ps = logo.letters.filter((l) => l.userData.meta.word === w), x0 = Math.min(...ps.map((l) => l.userData.meta.bbox[0][0])), x1 = Math.max(...ps.map((l) => l.userData.meta.bbox[1][0])); return { x0, x1, c: (x0 + x1) / 2 }; });
      const edit = (p, i) => {
        if (p === sym) return { p: [stage.camera.aspect * 1.1, 1.05, 0], s: .55 };
        const m = p.userData.meta, w = words[m.word], k = Math.min(2.3, (stage.camera.aspect * 3.0) / (w.x1 - w.x0) * .78, 2.4), h = p.userData.home.position;
        return { p: [(h.x - w.c) * k - .15, (m.word ? -.55 : .75) + h.y * k, 0], s: k };
      };
      const swirl = (turn) => (p, i) => { const a = (i / n) * Math.PI * 2 + turn; return { p: [Math.cos(a) * 1.9, Math.sin(a * 2) * .7, Math.sin(a) * 1.9 - 1], r: [0, -a + Math.PI / 2, 0], s: 1 }; };
      track = new Track(logo.pieces, [
        { at: 0, pose: hidden }, { at: .06, pose: hidden }, { at: .12, ease: "expo.out", pose: shown },
        { at: .27, ease: "expo.inOut", stagger: .55, pose: null }, { at: .44, pose: null },
        { at: .52, ease: "power3.inOut", stagger: .3, pose: float(5) }, { at: .6, ease: "sine.inOut", pose: float(9) },
        { at: .7, ease: "power3.inOut", stagger: .3, pose: edit }, { at: .76, pose: edit },
        { at: .8, ease: "power2.in", pose: swirl(0) }, { at: .86, ease: "none", pose: swirl(2.2) },
        { at: .93, ease: "expo.out", stagger: .35, pose: null }, { at: 1, pose: null },
      ]);
      cam = new CamPath(stage, [
        { at: 0, pos: [.9, .35, 3.4], target: O }, { at: .12, pos: [0, .15, 4.8], target: O }, { at: .27, pos: [0, 0, d], target: O }, { at: .44, pos: [0, 0, d], target: O },
        { at: .52, pos: [-1.3, .45, d * .92], target: O }, { at: .62, pos: [1.2, -.2, d * .88], target: O }, { at: .72, pos: [0, .1, d * 1.02], target: O },
        { at: .82, pos: [1.9, .9, d * .85], target: [0, 0, -.6] }, { at: .93, pos: [0, 0, d], target: O }, { at: 1, pos: [0, 0, d], target: O },
      ]);
    };
    build();
    const sc = scrollScene((p) => { track.at(p); cam.at(p); cap(p); });
    stage.canvas.style.touchAction = "pan-y";
    stage.onResize = () => { build(); sc.paint(); };
    stage.continuous = true;
    stage.add((dt) => {
      const p = sc.state.p, act = seg(p, .28, .34) * (1 - seg(p, .74, .8)); track.at(p);        // la envolvente anula el desvío antes de la resolución
      if (act > 0 || dev.some((x) => x.p.lengthSq() > 1e-6)) {
        const ray = stage.pointer.inside ? stage.ray().ray : null;
        logo.pieces.forEach((piece, i) => {
          const D = dev[i]; D.v.addScaledVector(D.p, -20 * dt).addScaledVector(D.v, -6 * dt);
          if (ray && act > 0) { ray.closestPointToPoint(piece.position, closest); const dist = closest.distanceTo(piece.position), R = 1.5; if (dist < R) { tmp.copy(piece.position).sub(closest).normalize().multiplyScalar((1 - dist / R) ** 2 * 34 * o.force * act); D.v.addScaledVector(tmp, dt); } }
          D.p.addScaledVector(D.v, dt); if (act <= 0) D.p.multiplyScalar(Math.exp(-8 * dt));
          piece.position.addScaledVector(D.p, act > 0 ? 1 : 0);
        });
      }
      const want = p >= .88; if (want !== flag) { flag = want; logo.setPreset(want ? "original" : "chrome", { duration: 1.3 }); }
    });
    return sc;
  },
};
