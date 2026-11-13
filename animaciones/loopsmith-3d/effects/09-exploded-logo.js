/* 09 · Exploded 3D Logo — el logo se abre en todas las direcciones y la cámara orbita para leer la composición. */
import * as THREE from "three";
import { Track, CamPath, rng } from "../core/kit.js";

export default {
  id: "exploded-logo", n: "09", group: "B", name: "Exploded 3D Logo", hint: ["scroll"],
  scroll: { length: 4, phases: [[0, "Logo"], [.1, "Explosión"], [.4, "Órbita"], [.7, "Retorno"]], after: "<small>Siguiente sección</small>Todo vuelve a su lugar." },
  lead: "El logo aparece completo. Con el scroll sus piezas salen despedidas en las tres dimensiones: algunas pasan rozando la cámara, otras retroceden al fondo. La cámara orbita para revelar la vista despiezada y todo regresa a la composición original.",
  fields: [["length", "Largo del recorrido (pantallas)", 4, 2.5, 7, .25], ["blast", "Magnitud de la explosión", 1, .4, 1.8, .05], ["orbit", "Ángulo de la órbita (°)", 38, 0, 80, 1], ["scrub", "Inercia del scroll (s)", .6, 0, 1.5, .05]],
  tech: "Cada pieza tiene un vector de salida en 3D (con Z entre −5.5 y +3.2) y un giro propio; se interpolan con retardo escalonado. La cámara recorre un arco de órbita (azimut, elevación y radio) definido por keyframes y regresa al punto exacto.",
  mobile: "El radio de la órbita se calcula con la distancia de encuadre real.",
  mount({ stage, logo, o, scrollScene }) {
    let track, cam; const az = THREE.MathUtils.degToRad(o.orbit);
    const build = () => {
      const d = stage.frame(), blast = o.blast;
      const out = (p, i) => { const r = rng(i * 13 + 5), h = p.userData.home.position; return { p: [h.x * (1 + 1.1 * blast) + (r() - .5) * 1.4, h.y * 1.2 + (r() - .5) * 3 * blast, (r() - .45) * 8.7 * blast], r: [(r() - .5) * 2.2, (r() - .5) * 2.8, (r() - .5) * 1.6], s: 1 }; };
      track = new Track(logo.pieces, [{ at: 0, pose: null }, { at: .08, pose: null }, { at: .52, ease: "power3.out", stagger: .3, pose: out }, { at: .66, pose: out }, { at: .94, ease: "expo.inOut", stagger: .2, pose: null }, { at: 1, pose: null }]);
      const orb = (a, e, r) => ({ pos: [Math.sin(a) * r, Math.sin(e) * r, Math.cos(a) * r * Math.cos(e)], target: [0, 0, 0] });
      cam = new CamPath(stage, [{ at: 0, ...orb(0, 0, d) }, { at: .08, ...orb(0, 0, d) }, { at: .32, ...orb(az, .28, d * 1.12) }, { at: .6, ...orb(-az * .9, .12, d * .92) }, { at: .94, ...orb(0, 0, d) }, { at: 1, ...orb(0, 0, d) }]);
    };
    build();
    const sc = scrollScene((p) => { track.at(p); cam.at(p); });
    stage.onResize = () => { build(); sc.paint(); };
    return sc;
  },
};
