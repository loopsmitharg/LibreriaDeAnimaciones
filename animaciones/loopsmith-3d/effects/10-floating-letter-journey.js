/* 10 · Floating Letter Journey — esculturas suspendidas en un espacio que la cámara recorre. */
import { Track, CamPath, rng, V } from "../core/kit.js";

export default {
  id: "floating-letter-journey", n: "10", group: "B", name: "Floating Letter Journey", hint: ["scroll"],
  scroll: { length: 6, phases: [[0, "Logo"], [.14, "Dispersión"], [.24, "Recorrido"], [.8, "Reunión"]], after: "<small>Siguiente sección</small>Diez piezas, un nombre." },
  lead: "Las letras quedan suspendidas en una constelación a lo largo de una galería de profundidad. La cámara se detiene junto a cada una como frente a una escultura: se ve su grosor, su bisel y su material. Al final todas vuelven a reunirse.",
  fields: [["length", "Largo del recorrido (pantallas)", 6, 4, 10, .5], ["spread", "Distancia entre esculturas (u)", 1.5, .8, 2.6, .05], ["scrub", "Inercia del scroll (s)", .6, 0, 1.5, .05]],
  tech: "Cada pieza se ubica en una hélice abierta a lo largo de −Z con una inclinación propia. Un camino de cámara con un keyframe por pieza la enfoca por turno (posición y objetivo independientes). Cierra con un barrido hacia atrás y el retorno al encuadre frontal.",
  mobile: "Mismo recorrido con la cámara a mayor distancia en pantallas verticales.",
  mount({ stage, logo, o, scrollScene }) {
    let track, cam; const n = logo.pieces.length;
    const spot = (i) => V(Math.sin(i * 1.45) * 1.55, Math.cos(i * 1.9) * .85, 1.4 - i * o.spread);
    const build = () => {
      const d = stage.frame(), far = spot(n - 1).z;
      const pose = (p, i) => { const r = rng(i * 9 + 1); return { p: spot(i), r: [(r() - .5) * .9, (r() - .5) * 1.6, (r() - .5) * .8], s: 1 }; };
      track = new Track(logo.pieces, [{ at: 0, pose: null }, { at: .08, pose: null }, { at: .24, ease: "power3.inOut", stagger: .4, pose }, { at: .76, pose }, { at: .92, ease: "expo.inOut", stagger: .3, pose: null }, { at: 1, pose: null }]);
      const keys = [{ at: 0, pos: [0, 0, d], target: [0, 0, 0] }, { at: .12, pos: [0, 0, d], target: [0, 0, 0] }];
      logo.pieces.forEach((_, i) => { const s = spot(i), side = i % 2 ? 1 : -1; keys.push({ at: .26 + (i / (n - 1)) * .5, pos: [s.x + side * 1.2, s.y + .3, s.z + 1.75], target: [s.x, s.y, s.z] }); });
      keys.push({ at: .84, pos: [2.6, 1.1, far * .5], target: [0, 0, far * .45] }, { at: .93, pos: [1.2, .4, d * .85], target: [0, 0, 0] }, { at: 1, pos: [0, 0, d], target: [0, 0, 0] });
      cam = new CamPath(stage, keys);
    };
    build();
    const sc = scrollScene((p) => { track.at(p); cam.at(p); });
    stage.onResize = () => { build(); sc.paint(); };
    return sc;
  },
};
