/* 16 · Mechanical Assembly — cada pieza llega por un eje distinto y encastra con precisión. */
import * as THREE from "three";
import { gsap } from "../core/gsap.js";
import { V } from "../core/kit.js";

const AXES = [V(1, 0, 0), V(-1, 0, 0), V(0, 1, 0), V(0, -1, 0), V(0, 0, 1), V(0, 0, -1)];

export default {
  id: "mechanical-assembly", n: "16", group: "C", name: "Mechanical Assembly", hint: ["play"],
  lead: "Cada pieza llega desde una dirección distinta del espacio, gira a saltos de 90° como un mecanismo, frena justo antes del encastre, entra con un empuje corto y se asienta con un pequeño golpe. El símbolo cierra la secuencia.",
  fields: [["speed", "Velocidad", 1, .4, 2, .05], ["distance", "Distancia de arranque (u)", 6, 3, 10, .5], ["gap", "Intervalo entre piezas (s)", .34, .12, .8, .02]],
  tech: "Cada pieza recorre tres tramos: aproximación rápida con rotación escalonada (ease steps: ángulos discretos), frenado a 0.35 u del encastre y empuje final con rebote mínimo. La rotación interpola un cuaternión inicial múltiplo de 90° con steps(); al terminar vale exactamente la transformación original.",
  mobile: "Sin interacción: se reproduce al tocar el escenario.",
  mount({ stage, logo, o }) {
    let tl; const order = [...logo.letters, logo.symbol];
    const build = () => {
      tl?.kill(); logo.snapHome(); stage.continuous = true; tl = gsap.timeline({ paused: true, onComplete: () => { logo.snapHome(); } });
      order.forEach((p, i) => {
        const h = p.userData.home, dir = AXES[i % 6], start = h.position.clone().addScaledVector(dir, o.distance), near = h.position.clone().addScaledVector(dir, .35);
        const ax = AXES[(i + 2) % 6], axis = V(Math.abs(ax.x), Math.abs(ax.y), Math.abs(ax.z)), q0 = new THREE.Quaternion().setFromAxisAngle(axis, Math.PI * (1 + (i % 3) * .5)).multiply(h.quaternion), k = { t: 0 }, at = i * o.gap;
        tl.set(p.position, { x: start.x, y: start.y, z: start.z }, 0).set(p.quaternion, { x: q0.x, y: q0.y, z: q0.z, w: q0.w }, 0)
          .to(p.position, { x: near.x, y: near.y, z: near.z, duration: .95, ease: "power2.inOut" }, at)
          .to(k, { t: 1, duration: .95, ease: "steps(4)", onUpdate: () => p.quaternion.slerpQuaternions(q0, h.quaternion, k.t) }, at)
          .to(p.position, { x: h.position.x, y: h.position.y, z: h.position.z, duration: .22, ease: "power3.in" }, at + .95)
          .to(p.scale, { x: 1.07, y: 1.07, z: 1.07, duration: .06, ease: "power2.out" }, at + 1.17).to(p.scale, { x: 1, y: 1, z: 1, duration: .32, ease: "elastic.out(1, .5)" }, at + 1.23)
          .to(p.position, { z: h.position.z - .035, duration: .05, yoyo: true, repeat: 1, ease: "power1.inOut" }, at + 1.17);
      });
    };
    build();
    const rebuild = () => { build(); tl.timeScale(o.speed).play(0); };
    stage.on(stage.canvas, "click", rebuild);
    return { play: rebuild, pause: () => tl.pause(), reset() { tl.pause(0); tl.kill(); logo.snapHome(); build(); tl.progress(1); logo.snapHome(); }, destroy() { tl?.kill(); } };
  },
};
