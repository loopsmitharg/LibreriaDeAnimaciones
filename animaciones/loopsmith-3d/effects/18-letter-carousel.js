/* 18 · 3D Letter Carousel — las piezas giran alrededor de un eje; al detenerse, se reorganizan como logo. */
import * as THREE from "three";
import { gsap } from "../core/gsap.js";
import { clamp, damp, V } from "../core/kit.js";

export default {
  id: "letter-carousel", n: "18", group: "C", name: "3D Letter Carousel", hint: ["drag"],
  lead: "Tocá y arrastrá: las piezas se despegan del logo y forman un carrusel que gira alrededor de un eje vertical, mostrando de frente cada letra. Soltá y el giro se frena solo; entonces el carrusel se reorganiza y vuelve a ser el logo.",
  fields: [["radius", "Radio del carrusel (u)", 2.6, 1.6, 4, .1], ["settle", "Espera antes de reorganizar (s)", .9, .3, 3, .1], ["friction", "Fricción del giro", 1.4, .4, 4, .1]],
  tech: "Cada pieza ocupa un ángulo sobre una circunferencia (θ + 2π·i/n) y mira hacia afuera (lookAt). El arrastre horizontal modifica θ y mide su velocidad; al soltar hay inercia con fricción exponencial. Una variable de mezcla m (0 = carrusel, 1 = logo) interpola posición (lerp) y rotación (slerp) hacia la composición original.",
  mobile: "El arrastre táctil gira el carrusel; la cámara se aleja en pantallas verticales.",
  mount({ stage, logo, o }) {
    const n = logo.pieces.length, S = { theta: 0, omega: 0, m: 1, drag: false, idle: 0 }, dummy = new THREE.Object3D(), pos = V(), last = { x: 0, t: 0 };
    stage.canvas.style.touchAction = "none"; stage.continuous = false;
    const cy = .75; // la cámara mira un poco desde arriba
    const toCarousel = () => { gsap.killTweensOf(S, "m"); gsap.to(S, { m: 0, duration: 1.1, ease: "expo.inOut" }); };
    const toLogo = () => { gsap.killTweensOf(S, "m"); gsap.to(S, { m: 1, duration: 1.3, ease: "expo.inOut", onComplete: () => { logo.snapHome(); stage.invalidate(); } }); };
    stage.on(stage.canvas, "pointerdown", (e) => { S.drag = true; S.idle = 0; last.x = e.clientX; last.t = performance.now(); if (S.m > .5) toCarousel(); try { stage.canvas.setPointerCapture(e.pointerId); } catch {} stage.invalidate(); });
    stage.on(stage.canvas, "pointermove", (e) => { if (!S.drag) return; const dx = e.clientX - last.x, now = performance.now(), dt = Math.max(1, now - last.t); S.theta += dx * .009; S.omega = damp(S.omega, (dx * .009) / (dt / 1000), 20, .016); last.x = e.clientX; last.t = now; stage.invalidate(); });
    stage.on(window, "pointerup", () => { if (S.drag) { S.drag = false; S.omega = clamp(S.omega, -9, 9); } });
    stage.camera.position.y = cy; stage.target.set(0, 0, -2.2); stage.look();
    const loop = stage.add((dt) => {
      if (!S.drag) { S.theta += S.omega * dt; S.omega *= Math.exp(-o.friction * dt); }
      if (S.m < .999 || S.drag || Math.abs(S.omega) > .02) stage.invalidate();
      if (!S.drag && S.m < .5 && Math.abs(S.omega) < .35 && (S.idle += dt) > o.settle) { S.idle = -99; toLogo(); }
      const d = stage.home.position.z, e = gsap.parseEase("power2.inOut")(S.m), R = o.radius * Math.min(1, stage.camera.aspect * .8 + .3);
      logo.pieces.forEach((p, i) => {
        const a = S.theta + (i / n) * Math.PI * 2, h = p.userData.home;
        pos.set(Math.sin(a) * R, 0, Math.cos(a) * R - 2.4); dummy.position.copy(pos); dummy.lookAt(pos.x * 2, pos.y, (pos.z + 2.4) * 2 - 2.4);
        p.position.lerpVectors(pos, h.position, e); p.quaternion.slerpQuaternions(dummy.quaternion, h.quaternion, e); p.scale.copy(h.scale);
      });
      const blend = 1 - gsap.parseEase("power2.inOut")(S.m); stage.camera.position.set(0, lerpv(0, cy, blend), d + (1 - 1) * 0); stage.target.set(0, 0, -2.2 * blend); stage.look();
    });
    return {
      play() { S.omega = 7; S.idle = 0; if (S.m > .5) toCarousel(); stage.invalidate(); },
      pause() { stage.off(loop); }, reset() { stage.add(loop); gsap.killTweensOf(S); S.omega = 0; S.drag = false; S.theta = 0; S.idle = 0; gsap.to(S, { m: 1, duration: .8, ease: "expo.out", onComplete: () => { logo.snapHome(); stage.invalidate(); } }); stage.invalidate(); },
      destroy() { gsap.killTweensOf(S); },
    };
  },
};
const lerpv = (a, b, t) => a + (b - a) * t;
