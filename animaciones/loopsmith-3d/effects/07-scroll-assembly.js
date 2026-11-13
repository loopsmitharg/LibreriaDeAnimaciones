/* 07 · 3D Scroll Assembly — el scroll arma el logo en el espacio: acerca, gira, corrige profundidad y espaciado. */
import { Track, CamPath, scatter } from "../core/kit.js";

export default {
  id: "scroll-assembly", n: "07", group: "B", name: "3D Scroll Assembly", hint: ["scroll"],
  scroll: { length: 3.4, phases: [[0, "Disperso"], [.18, "Acercamiento"], [.62, "Ajuste fino"], [.9, "Logo"]], after: "<small>Siguiente sección</small>El logo quedó armado en el espacio." },
  lead: "Al comenzar, las letras están dispersas en un espacio de verdad: unas cerca de la cámara, otras muy atrás, todas giradas. El scroll las acerca, corrige su rotación, su profundidad y su separación hasta formar el logo exacto. Hacia arriba, todo se desarma.",
  fields: [["length", "Largo del recorrido (pantallas)", 3.4, 2, 6, .2], ["scrub", "Inercia del scroll (s)", .6, 0, 1.5, .05], ["depth", "Profundidad de la dispersión", 1, .3, 1.8, .05]],
  tech: "Tres poses (dispersa, suelta, logo) interpoladas por un único progreso con scrub: la posición con lerp en X/Y/Z, la rotación con slerp de cuaterniones y la escala por pieza, con retardo escalonado. La cámara viaja por una curva suave y termina exactamente en el encuadre frontal. La dispersión es determinista: no cambia al refrescar ni al volver.",
  mobile: "El recorrido es el mismo; la dispersión y la cámara se recalculan con el aspecto real del contenedor.",
  mount({ stage, logo, o, scrollScene }) {
    let track, cam;
    const build = () => {
      const d = stage.frame();
      track = new Track(logo.pieces, [
        { at: 0, pose: (p, i) => scatter(i, { seed: 3, spread: [6.4, 3.3, 3.6 * o.depth], center: [0, 0, -1.8 * o.depth], tumble: Math.PI, scale: [.7, 2.1] }) },
        { at: .62, ease: "power2.inOut", stagger: .45, pose: (p, i) => { const h = p.userData.home.position, s = i % 2 ? 1 : -1; return { p: [h.x, h.y + s * .24, h.z + s * .55], r: [0, s * .38, 0], s: 1.05 }; } },
        { at: .9, ease: "power4.out", stagger: .2, pose: null },
        { at: 1, pose: null },
      ]);
      cam = new CamPath(stage, [{ at: 0, pos: [-1.6, .8, d * 1.22], target: [0, 0, 0] }, { at: .62, pos: [-.3, .18, d * 1.06], target: [0, 0, 0] }, { at: .92, pos: [0, 0, d], target: [0, 0, 0] }, { at: 1, pos: [0, 0, d], target: [0, 0, 0] }]);
    };
    build();
    const sc = scrollScene((p) => { track.at(p); cam.at(p); });
    stage.onResize = () => { build(); sc.paint(); };
    return sc;
  },
};
