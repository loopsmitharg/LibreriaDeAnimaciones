/* 11 · Cinematic Reassembly — el logo se construye por etapas mientras la cámara orbita. */
import { Track, CamPath, rng, eulerQ } from "../core/kit.js";

export default {
  id: "cinematic-reassembly", n: "11", group: "B", name: "Cinematic Reassembly", hint: ["scroll"],
  scroll: { length: 6, phases: [[0, "Símbolo"], [.2, "Órbita"], [.42, "Letras"], [.66, "Encastre"], [.86, "Lockup"]], after: "<small>Siguiente sección</small>Lockup completo." },
  lead: "Primero aparece solo el símbolo y la cámara lo rodea. Después surgen las letras a distintas profundidades, cada una encuentra su lugar, la cámara vuelve al frente y se revela el lockup completo.",
  fields: [["length", "Largo del recorrido (pantallas)", 6, 4, 10, .5], ["turns", "Vueltas de cámara", 1, .5, 1.6, .05], ["scrub", "Inercia del scroll (s)", .7, 0, 1.5, .05]],
  tech: "Cinco etapas sobre un solo progreso. El símbolo entra girando sobre su eje vertical; las letras arrancan con escala casi nula y profundidades distintas, y se encastran con retardo escalonado. La cámara recorre una órbita (keyframes de azimut, elevación y radio) y termina exactamente en el encuadre frontal.",
  mobile: "El radio de la órbita escala con el encuadre; en vertical el símbolo ocupa más pantalla.",
  mount({ stage, logo, o, scrollScene }) {
    let track, cam;
    const build = () => {
      const d = stage.frame(), TAU = Math.PI * 2;
      const hidden = (p, i) => { if (p === logo.symbol) return { p: p.userData.home.position, r: [0, -TAU, 0], s: .3 }; const r = rng(i * 7 + 2), h = p.userData.home.position; return { p: [h.x * 1.6, h.y + (r() - .5) * 2, -3 - r() * 4], r: [(r() - .5) * 3, (r() - .5) * 3, (r() - .5) * 2], s: .001 }; };
      const loose = (p, i) => { if (p === logo.symbol) return null; const r = rng(i * 11 + 4), h = p.userData.home.position; return { p: [h.x * 1.5, h.y + (r() - .5) * 1.8, (r() - .5) * 5], r: [(r() - .5) * 2.4, (r() - .5) * 2.4, (r() - .5) * 1.6], s: 1 }; };
      track = new Track(logo.pieces, [
        { at: 0, pose: hidden }, { at: .04, pose: hidden },
        { at: .2, ease: "expo.out", pose: (p, i) => (p === logo.symbol ? null : hidden(p, i)) },
        { at: .5, ease: "power3.out", stagger: .55, pose: loose }, { at: .6, pose: loose },
        { at: .84, ease: "expo.inOut", stagger: .5, pose: null }, { at: 1, pose: null },
      ]);
      const orb = (a, e, r, ty = 0) => ({ pos: [Math.sin(a) * r, Math.sin(e) * r + ty, Math.cos(a) * r * Math.cos(e)], target: [0, ty * .3, 0] }), T = Math.PI * 2 * o.turns;
      cam = new CamPath(stage, [{ at: 0, ...orb(-.5, .15, 3.4) }, { at: .2, ...orb(T * .3, .22, 2.8) }, { at: .42, ...orb(T * .62, .3, 4.6) }, { at: .62, ...orb(T * .88, .12, 5.4) }, { at: .86, ...orb(T, .02, d * 1.04) }, { at: 1, ...orb(T, 0, d) }]);
    };
    build();
    const sc = scrollScene((p) => { track.at(p); cam.at(p); });
    stage.onResize = () => { build(); sc.paint(); };
    return sc;
  },
};
