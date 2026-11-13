/* 19 · Kinetic Machine — una coreografía mecánica de volteos, deslizamientos y encastres que cierra en el logo. */
import { gsap } from "../core/gsap.js";
import { Track, V } from "../core/kit.js";

export default {
  id: "kinetic-machine", n: "19", group: "C", name: "Kinetic Machine", hint: ["auto"],
  lead: "Las piezas se mueven como las de una máquina: las pares se ponen de canto y se voltean, las impares suben y bajan, el conjunto se abre en profundidad, se despliega y se vuelve a cerrar. Cada compás está sincronizado y el último reconstruye el logo.",
  fields: [["speed", "Velocidad", 1, .3, 2.5, .05], ["amount", "Amplitud", 1, .4, 1.8, .05], ["autoplay", "Reproducir al montar", true]],
  tech: "Siete compases definidos como poses (posición + rotación por pieza) y un único progreso de tiempo con repetición. Cada transición usa power3.inOut con un pequeño retardo escalonado entre piezas (efecto de engranaje). Como el primer y el último compás son la composición original, el ciclo es continuo y exacto.",
  mobile: "Sin interacción; corre solo y se detiene con Pausa.",
  mount({ stage, logo, o }) {
    const A = o.amount, PI = Math.PI, even = (i) => i % 2 === 0;
    const beat = (fn) => (p, i) => fn(p.userData.home.position, i);
    const stops = [
      [0, null],
      [.14, beat((h, i) => even(i) ? { p: [h.x, h.y, h.z], r: [PI / 2 * A, 0, 0] } : { p: [h.x, h.y + .5 * A, h.z], r: [0, 0, 0] })],
      [.29, beat((h, i) => even(i) ? { p: [h.x, h.y, h.z], r: [PI, 0, 0] } : { p: [h.x, h.y - .5 * A, h.z], r: [0, PI / 2, 0] })],
      [.44, beat((h, i) => ({ p: [h.x, h.y, even(i) ? .95 * A : -.95 * A], r: even(i) ? [PI, 0, 0] : [0, PI, 0] }))],
      [.6, beat((h, i) => ({ p: [h.x * 1.4, h.y, 0], r: [0, 0, (even(i) ? 1 : -1) * PI / 2] }))],
      [.76, beat((h, i) => ({ p: [h.x * 1.1, Math.sin(i * .9) * .55 * A, Math.cos(i * 1.3) * .5 * A], r: [0, (even(i) ? 1 : -1) * .5, 0] }))],
      [.9, null], [1, null],
    ];
    const track = new Track(logo.pieces, stops.map(([at, pose], k) => ({ at, pose, ease: "power3.inOut", stagger: .22 })));
    const S = { p: 0 }; stage.continuous = true;
    const tw = gsap.to(S, { p: 1, duration: 16, ease: "none", repeat: -1, paused: true, onUpdate: () => track.at(S.p) });
    tw.timeScale(o.speed); stage.keep(tw);
    if (o.autoplay) tw.play();
    return {
      play() { tw.timeScale(o.speed).play(); }, pause() { tw.pause(); },
      reset() { tw.pause(0); S.p = 0; logo.snapHome(); },
    };
  },
};
