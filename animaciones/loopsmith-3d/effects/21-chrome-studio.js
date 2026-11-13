/* 21 · Chrome Studio — cromo real: la cámara recorre el logo y los reflejos de un estudio lo recorren. */
import * as THREE from "three";
import { clamp, damp } from "../core/kit.js";

export default {
  id: "chrome-studio", n: "21", group: "D", name: "Chrome Studio", hint: ["drag"], preset: "chrome",
  lead: "El logo en cromo pulido, dentro de un estudio con softboxes. La cámara se desliza entre vistas de tres cuartos y el entorno rota con ella: los reflejos recorren los bordes biselados y delatan cada curva. Arrastrá para tomar el control de la cámara.",
  fields: [["speed", "Velocidad de cámara", 1, 0, 2.5, .05], ["env", "Rotación del entorno", 1, 0, 2, .05], ["exposure", "Exposición", .82, .4, 1.4, .02]],
  tech: "No hay imágenes de reflejo: el cromo (metalness 1, rugosidad .06) refleja un entorno de estudio procedural prefiltrado con PMREM (cuarto oscuro + softboxes con intensidades HDR). Al girar `scene.environmentRotation` junto a la cámara, los brillos viajan sobre el bisel. El arrastre suma un desvío orbital con inercia.",
  mobile: "El arrastre táctil orbita; la cámara automática sigue cuando se suelta.",
  mount({ stage, logo, o }) {
    const S = { az: 0, el: 0, vaz: 0, vel: 0, drag: false, t0: 0, off: 0 }, last = { x: 0, y: 0 };
    stage.renderer.toneMappingExposure = o.exposure; stage.canvas.style.touchAction = "none";
    stage.on(stage.canvas, "pointerdown", (e) => { S.drag = true; last.x = e.clientX; last.y = e.clientY; try { stage.canvas.setPointerCapture(e.pointerId); } catch {} });
    stage.on(stage.canvas, "pointermove", (e) => { if (!S.drag) return; S.vaz = (e.clientX - last.x) * .006 * 60; S.vel = (e.clientY - last.y) * .004 * 60; S.off += (e.clientX - last.x) * .006; S.elOff = clamp((S.elOff || 0) + (e.clientY - last.y) * .004, -.5, .6); last.x = e.clientX; last.y = e.clientY; });
    stage.on(window, "pointerup", () => { S.drag = false; });
    stage.add((dt, t) => {
      const d = stage.home.position.z; S.t0 += dt * o.speed;
      if (!S.drag) { S.off += S.vaz * dt; S.vaz *= Math.exp(-2 * dt); S.elOff = (S.elOff || 0) + S.vel * dt; S.vel *= Math.exp(-2 * dt); }
      const az = Math.sin(S.t0 * .35) * .75 + S.off, el = .12 + Math.sin(S.t0 * .27 + 1) * .1 + (S.elOff || 0);
      stage.camera.position.set(Math.sin(az) * d * .95, Math.sin(el) * d, Math.cos(az) * d * .95 * Math.cos(el)); stage.target.set(0, 0, 0); stage.look();
      stage.scene.environmentRotation.y = -az * .9 * o.env + S.t0 * .05 * o.env;
      logo.group.rotation.y = Math.sin(S.t0 * .21) * .12;
    });
    return { reset() { S.off = 0; S.elOff = 0; S.vaz = 0; S.vel = 0; S.t0 = 0; }, destroy() { stage.scene.environmentRotation.set(0, 0, 0); } };
  },
};
