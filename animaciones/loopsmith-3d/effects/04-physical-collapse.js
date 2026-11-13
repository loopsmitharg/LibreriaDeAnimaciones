/* 04 · Physical Collapse — el logo se desarma y cae sobre un piso con colisiones reales (cannon-es). */
import * as THREE from "three";
import { gsap } from "../core/gsap.js";
import { createWorld } from "../core/physics.js";
import { rng } from "../core/kit.js";

export default {
  id: "physical-collapse", n: "04", group: "A", name: "Physical Collapse", hint: ["click"], shadows: true, frameHeight: 3.5,
  lead: "Un clic y el logo pierde el soporte: las letras caen, rebotan, chocan entre sí, giran, se frenan por fricción y se acumulan en el piso. Cuando todo se asienta, se vuelven a levantar y reconstruyen la marca.",
  fields: [["gravity", "Gravedad", 24, 6, 50, 1], ["bounce", "Rebote", .26, 0, .7, .02], ["friction", "Fricción", .5, .05, 1, .05], ["auto", "Reconstruir solo", true]],
  tech: "Motor rígido cannon-es con paso fijo de 1/120 s. Cada pieza es un cuerpo con colisionadores aproximados a su silueta (cajas compuestas; cilindros para las «o», que ruedan). El piso y las paredes son planos estáticos; las sombras vienen de una luz direccional real. Al reconstruir se apagan los cuerpos y un tween lleva cada pieza a su transformación guardada.",
  mobile: "Tocar el escenario dispara el colapso. Las paredes laterales se ajustan al ancho visible.",
  mount({ stage, logo, o }) {
    const rnd = rng(9), floorY = -1.55; stage.addFloor(floorY);
    const d = stage.camera.position.z; stage.camera.position.set(0, .9, d * 1.02); stage.target.set(0, -.55, 0); stage.look(); stage.home.position.copy(stage.camera.position); stage.home.target.copy(stage.target);
    const halfW = () => Math.tan(THREE.MathUtils.degToRad(stage.camera.fov / 2)) * d * stage.camera.aspect * .9;
    let phys = null, state = "idle", calm = 0, tl = null, call = null;
    stage.continuous = false;
    const collapse = () => {
      if (state !== "idle") return; state = "falling"; calm = 0; tl?.kill();
      phys = createWorld({ gravity: -o.gravity, floorY, width: Math.min(8, halfW() * 2), depth: 2.4, restitution: o.bounce, friction: o.friction });
      logo.pieces.forEach((p, i) => {
        const it = phys.add(p, { mass: p === logo.symbol ? 5 : null }); it.body.velocity.set((rnd() - .5) * 3, 1 + rnd() * 2.5, (rnd() - .3) * 2.2);
        it.body.angularVelocity.set((rnd() - .5) * 7, (rnd() - .5) * 7, (rnd() - .5) * 9); it.body.wakeUp();
      });
      stage.invalidate();
    };
    const rebuild = () => {
      if (state === "idle") return; state = "rebuilding"; phys?.dispose(); phys = null;
      tl = logo.restore(1.15, { ease: "expo.inOut", stagger: .05, onComplete: () => { logo.snapHome(); state = "idle"; stage.invalidate(); } }); stage.invalidate();
    };
    const loop = stage.add((dt) => {
      if (state === "rebuilding") stage.invalidate();
      if (state !== "falling") return;
      const awake = phys.step(dt); stage.invalidate(); calm = awake ? 0 : calm + dt;
      if (!awake && calm > .15 && o.auto && !call) call = gsap.delayedCall(1.6, () => { call = null; rebuild(); });
    });
    logo.group.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
    stage.on(stage.canvas, "click", () => (state === "idle" ? collapse() : state === "falling" && !o.auto ? rebuild() : null));
    return {
      play() { if (state === "idle") collapse(); }, pause() { stage.off(loop); }, reset() { stage.add(loop); call?.kill(); call = null; rebuild(); },
      destroy() { call?.kill(); tl?.kill(); phys?.dispose(); },
    };
  },
};
