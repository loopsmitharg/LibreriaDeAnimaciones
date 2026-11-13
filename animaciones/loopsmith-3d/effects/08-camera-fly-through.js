/* 08 · Camera Fly Through — la cámara viaja entre las letras del logo. */
import { Track, CamPath } from "../core/kit.js";

export default {
  id: "camera-fly-through", n: "08", group: "B", name: "Camera Fly Through", hint: ["scroll"],
  scroll: { length: 5, phases: [[0, "Frente"], [.2, "Pasillo"], [.36, "Travesía"], [.74, "Revelado"], [.9, "Final"]], after: "<small>Siguiente sección</small>Del otro lado." },
  lead: "El logo se abre en un pasillo de profundidad y la cámara entra: pasa junto a las letras, recorre el espacio entre ellas, se da vuelta para mostrar sus espaldas y su grosor, y vuelve a un encuadre frontal con el logo reconstruido.",
  fields: [["length", "Largo del recorrido (pantallas)", 5, 3, 8, .25], ["gap", "Separación en profundidad (u)", .62, .3, 1.2, .02], ["scrub", "Inercia del scroll (s)", .7, 0, 1.5, .05]],
  tech: "Las letras se escalonan en Z y la cámara recorre una curva Catmull-Rom con keyframes de posición y de objetivo (por separado): primero mira hacia adelante, luego gira para mirar hacia atrás. Todo el estado es función del progreso, así el viaje es idéntico al subir el scroll.",
  mobile: "La cámara usa el aspecto real; en vertical se aleja un poco más para que las letras no se corten.",
  mount({ stage, logo, o, scrollScene }) {
    let track, cam;
    const build = () => {
      const d = stage.frame(), g = o.gap, far = 2.4 - (logo.pieces.length - 1) * g;
      const lane = (p, i) => { const h = p.userData.home.position; return { p: [h.x, h.y + (i % 2 ? .12 : -.1), 2.4 - i * g], r: [0, i % 2 ? -.22 : .22, 0] }; };
      track = new Track(logo.pieces, [
        { at: 0, pose: null }, { at: .1, pose: null },
        { at: .32, ease: "power3.inOut", stagger: .35, pose: lane }, { at: .72, pose: lane },
        { at: .94, ease: "expo.inOut", stagger: .3, pose: null }, { at: 1, pose: null },
      ]);
      cam = new CamPath(stage, [
        { at: 0, pos: [0, 0, d], target: [0, 0, 0] }, { at: .14, pos: [0, 0, d], target: [0, 0, 0] },
        { at: .34, pos: [-.7, .95, 5.2], target: [0, 0, -.6] }, { at: .5, pos: [.55, .7, 1.4], target: [.3, 0, -2.4] },
        { at: .62, pos: [-.4, .55, -1.7], target: [0, 0, far] }, { at: .74, pos: [.7, .5, far - 1.3], target: [0, 0, 1.5] },
        { at: .84, pos: [3.8, 1.1, far * .45], target: [0, 0, 0] }, { at: .93, pos: [2.2, .5, d * .8], target: [0, 0, 0] }, { at: 1, pos: [0, 0, d], target: [0, 0, 0] },
      ]);
    };
    build();
    const sc = scrollScene((p) => { track.at(p); cam.at(p); });
    stage.onResize = () => { build(); sc.paint(); };
    return sc;
  },
};
