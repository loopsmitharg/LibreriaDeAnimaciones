/**
 * Física rígida con cannon-es para los experimentos que necesitan colisiones reales (Physical Collapse, Dominoes).
 * Cada pieza del logo recibe un cuerpo con colisionadores aproximados a su silueta (cajas compuestas y cilindros para las "o");
 * el paso es de tiempo fijo con subpasos, así la simulación es estable e independiente de los fps.
 */
import * as THREE from "three";
import * as CANNON from "cannon-es";

/** Colisionadores por carácter, como fracciones de la caja de la pieza (derivadas de los contornos de Outfit 700). */
function shapesFor(piece) {
  const [w, h, d] = piece.userData.dims.toArray(), ch = piece.userData.char, out = [];
  const box = (sx, sy, cx, cy) => out.push({ shape: new CANNON.Box(new CANNON.Vec3((sx * w) / 2, (sy * h) / 2, d / 2)), offset: new CANNON.Vec3(cx * w, cy * h, 0) });
  if (piece.userData.id === "Symbol") box(1, 1, 0, 0);
  else if (ch === "L") { box(.335, 1, -.3325, 0); box(1, .195, 0, -.4025); }
  else if (ch === "t") { box(.41, 1, 0, 0); box(1, .19, 0, .113); }
  else if (ch === "i") { box(1, .66, 0, -.17); box(1, .23, 0, .385); }
  else if (ch === "o") {
    const r = Math.min(w, h) / 2, cyl = new CANNON.Cylinder(r, r, d, 18), q = new CANNON.Quaternion(); q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
    out.push({ shape: cyl, offset: new CANNON.Vec3(0, 0, 0), orientation: q });
  } else box(1, 1, 0, 0);
  return out;
}

export function createWorld({ gravity = -24, floorY = -1.2, width = 7, depth = 2.6, restitution = .22, friction = .5 } = {}) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, gravity, 0) });
  world.allowSleep = true; world.defaultContactMaterial.friction = friction; world.defaultContactMaterial.restitution = restitution;
  world.solver.iterations = 14;
  const mat = new CANNON.Material("ls"); world.addContactMaterial(new CANNON.ContactMaterial(mat, mat, { friction, restitution, contactEquationStiffness: 1e8 }));
  const wall = (pos, axis, angle) => { const b = new CANNON.Body({ mass: 0, material: mat }); b.addShape(new CANNON.Plane()); b.position.set(...pos); b.quaternion.setFromAxisAngle(new CANNON.Vec3(...axis), angle); world.addBody(b); return b; };
  const floor = wall([0, floorY, 0], [1, 0, 0], -Math.PI / 2);
  const walls = [wall([-width / 2, 0, 0], [0, 1, 0], Math.PI / 2), wall([width / 2, 0, 0], [0, 1, 0], -Math.PI / 2), wall([0, 0, -depth / 2], [0, 1, 0], 0), wall([0, 0, depth / 2], [0, 1, 0], Math.PI)];
  const items = [];
  let acc = 0;
  return {
    world, floor, floorY, mat, items,
    /** Crea un cuerpo dinámico para la pieza (queda dormido hasta `wake`). */
    add(piece, { mass = null, position = piece.position, quaternion = piece.quaternion } = {}) {
      const [w, h, d] = piece.userData.dims.toArray(), body = new CANNON.Body({ mass: mass ?? Math.max(.4, w * h * d * 90), material: mat, allowSleep: true, sleepSpeedLimit: .18, sleepTimeLimit: .6, linearDamping: .06, angularDamping: .12 });
      for (const s of shapesFor(piece)) body.addShape(s.shape, s.offset, s.orientation);
      body.position.set(position.x, position.y, position.z); body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
      world.addBody(body); const it = { piece, body }; items.push(it); return it;
    },
    /** Avanza con paso fijo (1/120 s) y copia los cuerpos a las piezas. Devuelve true mientras algo se mueva. */
    step(dt) {
      acc += Math.min(dt, 1 / 20); let n = 0; while (acc >= 1 / 120 && n++ < 8) { world.step(1 / 120); acc -= 1 / 120; }
      let awake = false;
      for (const { piece, body } of items) { piece.position.copy(body.position); piece.quaternion.copy(body.quaternion); if (body.sleepState !== CANNON.Body.SLEEPING && (body.velocity.lengthSquared() > .02 || body.angularVelocity.lengthSquared() > .15)) awake = true; }   // en reposo aunque no haya dormido (apoyos que vibran)
      return awake;
    },
    dispose() { for (const { body } of items) world.removeBody(body); items.length = 0; for (const b of [floor, ...walls]) world.removeBody(b); },
  };
}
export { CANNON };
