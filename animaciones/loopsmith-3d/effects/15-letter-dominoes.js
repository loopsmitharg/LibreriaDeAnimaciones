/* 15 · Letter Dominoes — las piezas se paran de canto sobre el piso y caen una tras otra (cannon-es). */
import * as THREE from "three";
import { gsap } from "../core/gsap.js";
import { createWorld } from "../core/physics.js";

export default {
  id: "letter-dominoes", n: "15", group: "C", name: "Letter Dominoes", hint: ["click"], shadows: true, frameHeight: 3.4,
  lead: "El logo baja al piso y cada pieza se pone de canto, como una hilera de fichas. Reciben un empujón una tras otra, de derecha a izquierda: caen sobre la vecina, rebotan, chocan, las «o» ruedan, y el símbolo, el más pesado, las frena. Cuando todo se asienta, se levantan y reconstruyen el logo.",
  fields: [["push", "Fuerza del empujón", 1, .6, 1.8, .05], ["interval", "Intervalo entre empujones (s)", .3, .12, .7, .02], ["gravity", "Gravedad", 26, 10, 50, 1], ["rest", "Pausa antes de reconstruir (s)", 1.2, .4, 4, .1]],
  tech: "Cada pieza es un cuerpo rígido (cannon-es, paso fijo 1/120 s) con colisionadores de cajas compuestas y cilindros para las «o»; las fichas quedan giradas 90° sobre Y para presentar su canto. Los empujones se disparan en secuencia y todo lo demás —caídas, choques, rodado, fricción— lo resuelve la simulación (probado: una ficha apoyada contra otra no la vuelca por sí sola, por eso el impulso es escalonado). Al terminar los cuerpos se descartan y un tween restituye cada pieza.",
  mobile: "Tocar el escenario inicia la secuencia. Las paredes se ajustan al ancho visible.",
  mount({ stage, logo, o }) {
    const floorY = -1.12; stage.addFloor(floorY);
    const d = stage.camera.position.z; stage.camera.position.set(-2.3, 1.15, d * .84); stage.target.set(.1, -.55, 0); stage.look();
    logo.group.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    const edge = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    let phys = null, state = "logo", tl = null, call = null, calm = 0, elapsed = 0; const calls = []; stage.continuous = false;
    const run = () => {
      if (state !== "logo") return; state = "standing"; tl?.kill(); tl = gsap.timeline({ onUpdate: () => stage.invalidate() });
      logo.pieces.forEach((p, i) => {
        const h = p.userData.home, y = floorY + p.userData.dims.y / 2 + .002, k = { t: 0 }, q0 = p.quaternion.clone();
        tl.to(p.position, { x: h.position.x * 1.6, y, z: 0, duration: .9, ease: "bounce.out" }, i * .04).to(k, { t: 1, duration: .7, ease: "power2.inOut", onUpdate: () => p.quaternion.slerpQuaternions(q0, edge, k.t) }, i * .04);
      });
      tl.call(() => {
        phys = createWorld({ gravity: -o.gravity, floorY, width: logo.meta.width * 1.6 + 3, depth: 1.8, restitution: .12, friction: .5 }); state = "falling"; elapsed = 0;
        logo.pieces.forEach((p) => phys.add(p, { mass: p === logo.symbol ? 14 : null }).body.wakeUp());
        // Empujones escalonados de derecha a izquierda: la simulación resuelve cada caída y cada choque.
        for (let i = logo.letters.length - 1, k = 0; i >= 1; i--, k++) {
          calls.push(gsap.delayedCall(k * o.interval, () => { const b = phys?.items[i + 1]?.body; if (!b) return; b.wakeUp(); b.angularVelocity.z += 9 * o.push; b.velocity.x -= .7 * o.push; }));
        }
        stage.invalidate();
      }, null, "+=.4");
    };
    const rebuild = () => { state = "rising"; phys?.dispose(); phys = null; tl = logo.restore(1.4, { ease: "expo.inOut", stagger: .07, onComplete: () => { logo.snapHome(); state = "logo"; stage.invalidate(); } }); stage.invalidate(); };
    const loop = stage.add((dt) => {
      if (state === "standing" || state === "rising") stage.invalidate();
      if (state !== "falling") return;
      const awake = phys.step(dt); stage.invalidate(); calm = awake ? 0 : calm + dt; elapsed += dt;
      if ((elapsed > 9 || (!awake && calm > .1)) && !call && !calls.some((c) => c.progress() < 1)) call = gsap.delayedCall(o.rest, () => { call = null; calm = 0; rebuild(); });
    });
    stage.on(stage.canvas, "click", () => state === "logo" && run());
    const clear = () => { calls.splice(0).forEach((c) => c.kill()); call?.kill(); call = null; };
    return {
      play: run, pause() { stage.off(loop); },
      reset() { stage.add(loop); clear(); tl?.kill(); phys?.dispose(); phys = null; calm = 0; state = "rising"; tl = logo.restore(.9, { onComplete: () => { logo.snapHome(); state = "logo"; stage.invalidate(); } }); stage.invalidate(); },
      destroy() { clear(); tl?.kill(); phys?.dispose(); },
    };
  },
};
