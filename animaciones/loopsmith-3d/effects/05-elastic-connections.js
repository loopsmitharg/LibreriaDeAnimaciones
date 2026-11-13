/* 05 · Elastic Connections — letras unidas por conexiones elásticas invisibles. */
import * as THREE from "three";
import { Body, enableDrag, V, clamp } from "../core/kit.js";

export default {
  id: "elastic-connections", n: "05", group: "A", name: "Elastic Connections", hint: ["drag"],
  lead: "Entre cada letra y su vecina hay un resorte invisible. Tirá de una: arrastra a las demás con retraso, la cadena oscila en profundidad y recupera el equilibrio poco a poco.",
  fields: [["link", "Rigidez de los enlaces", 70, 15, 200, 5], ["anchor", "Rigidez al lugar de origen", 16, 2, 60, 1], ["damping", "Amortiguación", 3.2, .8, 9, .1]],
  tech: "Cadena de masas en 3D: cada pieza tiene un resorte a su posición original (suave) y resortes hacia sus vecinas cuya longitud de reposo es la distancia original entre ambas. Integración semi-implícita con 2 subpasos por frame. Los giros siguen a la velocidad lateral.",
  mobile: "Arrastre táctil por letra; la cadena responde igual.",
  mount({ stage, logo, o }) {
    const bodies = logo.pieces.map((p) => { const b = new Body(p); b.mass = p === logo.symbol ? 2.4 : 1; return b; }), n = bodies.length;
    const rest = bodies.map((b, i) => (i ? b.home.position.clone().sub(bodies[i - 1].home.position) : null)), f = V(), e = V(), tmpQ = new THREE.Quaternion(), eu = new THREE.Euler();
    stage.continuous = false;
    enableDrag(stage, logo, {
      start(p) { const b = bodies[logo.pieces.indexOf(p)]; b.held = true; b.v.set(0, 0, 0); stage.invalidate(); },
      move(p, target) { const b = bodies[logo.pieces.indexOf(p)]; b.piece.position.copy(target); b.v.set(0, 0, 0); },
      end(p) { bodies[logo.pieces.indexOf(p)].held = false; },
    });
    const loop = stage.add((dt) => {
      let active = false; const h = dt / 2;
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
        const b = bodies[i]; if (b.held) continue; const p = b.piece;
        f.copy(b.home.position).sub(p.position).multiplyScalar(o.anchor).addScaledVector(b.v, -o.damping * b.mass);
        for (const j of [i - 1, i + 1]) {
          if (j < 0 || j >= n) continue;
          const nb = bodies[j].piece; e.copy(nb.position).sub(p.position); const target = j < i ? rest[i].clone().negate() : rest[j];
          f.addScaledVector(e.sub(target), o.link);                 // e = (pos_j - pos_i) - reposo
        }
        b.v.addScaledVector(f, h / b.mass); p.position.addScaledVector(b.v, h);
      }
      for (const b of bodies) {
        eu.set(clamp(-b.v.y * .12, -.8, .8), clamp(b.v.x * .12, -.8, .8), clamp(-b.v.x * .06, -.5, .5)); tmpQ.setFromEuler(eu).multiply(b.home.quaternion);
        b.piece.quaternion.slerp(tmpQ, 1 - Math.exp(-14 * dt));
        if (b.held || b.energy > 1.5e-4) active = true;
      }
      if (active) stage.invalidate(); else for (const b of bodies) { b.piece.position.copy(b.home.position); b.piece.quaternion.copy(b.home.quaternion); b.v.set(0, 0, 0); }
    });
    return {
      play() { const b = bodies[Math.floor(n / 2)]; b.v.set(5, 6, -7); bodies[0].v.set(-3, -4, 4); stage.invalidate(); },
      pause() { stage.off(loop); }, reset() { stage.add(loop); bodies.forEach((b) => { b.held = false; b.v.set(0, 0, 0); }); logo.restore(.6); stage.invalidate(); },
    };
  },
};
