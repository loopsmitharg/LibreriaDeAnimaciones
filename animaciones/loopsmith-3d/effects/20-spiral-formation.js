/* 20 · Spiral Formation — las piezas forman una espiral y después convergen al logo. */
import * as THREE from "three";
import { gsap } from "../core/gsap.js";
import { V } from "../core/kit.js";

export default {
  id: "spiral-formation", n: "20", group: "C", name: "Spiral Formation", hint: ["play"],
  lead: "Las piezas se despegan del logo y se acomodan en una espiral tridimensional que gira alrededor del centro mientras la cámara baja y rodea la formación. Después la espiral se cierra: todas convergen y vuelven a la composición original.",
  fields: [["turns", "Vueltas de la espiral", 1.15, .6, 2.2, .05], ["radius", "Radio (u)", 2.1, 1.2, 3.2, .1], ["spin", "Giro (vueltas)", 1.1, .3, 3, .05], ["loop", "Repetir", false]],
  tech: "Cada pieza se ubica en una hélice (ángulo = θ + i·paso, altura proporcional al índice) y mira hacia afuera. Una línea de tiempo con tres variables (formación m, giro θ y cámara c) la forma, la hace girar y la cierra. Posición y rotación se mezclan con la original por lerp/slerp, así el último cuadro es exactamente el logo.",
  mobile: "El radio se limita al ancho visible; sin interacción.",
  mount({ stage, logo, o }) {
    const n = logo.pieces.length, S = { m: 0, th: 0, c: 0 }, dummy = new THREE.Object3D(), pos = V(); stage.continuous = true; let tl;
    const draw = () => {
      const d = stage.home.position.z, R = o.radius * Math.min(1, stage.camera.aspect * .72 + .38), step = (Math.PI * 2 * o.turns) / n;
      logo.pieces.forEach((p, i) => {
        const a = S.th + i * step, y = (i / (n - 1) - .5) * 3.1, h = p.userData.home;
        pos.set(Math.sin(a) * R, y, Math.cos(a) * R - 1.6); dummy.position.copy(pos); dummy.lookAt(pos.x * 2, pos.y, (pos.z + 1.6) * 2 - 1.6);
        p.position.lerpVectors(h.position, pos, S.m); p.quaternion.slerpQuaternions(h.quaternion, dummy.quaternion, S.m); p.scale.copy(h.scale);
      });
      const e = S.c, az = Math.sin(e * Math.PI) * .9, el = Math.sin(e * Math.PI) * .38;
      stage.camera.position.set(Math.sin(az) * d * 1.1, Math.sin(el) * d, Math.cos(az) * d * 1.1 * Math.cos(el)); stage.target.set(0, 0, -1.4 * Math.sin(e * Math.PI)); stage.look();
    };
    const make = () => {
      tl?.kill(); Object.assign(S, { m: 0, th: 0, c: 0 });
      tl = gsap.timeline({ paused: true, repeat: o.loop ? -1 : 0, repeatDelay: 1.2, onUpdate: draw, onComplete: () => { logo.snapHome(); stage.camera.position.copy(stage.home.position); stage.target.set(0, 0, 0); stage.look(); } })
        .to(S, { m: 1, duration: 1.8, ease: "expo.inOut" }, .2).to(S, { th: Math.PI * 2 * o.spin, duration: 5.2, ease: "power1.inOut" }, .6)
        .to(S, { c: 1, duration: 6.4, ease: "sine.inOut" }, .4).to(S, { m: 0, duration: 2, ease: "expo.inOut" }, 4.8);
      stage.keep(tl);
    };
    make();
    return { play() { make(); tl.play(0); }, pause() { tl.pause(); }, reset() { tl.pause(0); Object.assign(S, { m: 0, th: 0, c: 0 }); logo.snapHome(); stage.camera.position.copy(stage.home.position); stage.target.set(0, 0, 0); stage.look(); }, destroy() { tl?.kill(); } };
  },
};
