/**
 * Física rígida (cannon-es) para las escenas que necesitan colisiones y apilado reales: lluvia, playground, cuenco, caída, gravedad.
 * Cada grano es un cuerpo compuesto por 3 esferas (centro + extremos): aproxima el elipsoide, rueda y se apila de forma creíble
 * y es mucho más barato y estable que un convex hull. Paso fijo con acumulador: el resultado no depende de los fps.
 */
import * as CANNON from "cannon-es";

export function beanWorld(swarm, { gravity = [0, -12, 0], restitution = .32, friction = .45, linearDamping = .02, angularDamping = .06, sleep = true, step = 1 / 90 } = {}) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(...gravity) });
  world.broadphase = new CANNON.SAPBroadphase(world); world.allowSleep = sleep; world.solver.iterations = 8;
  const mat = new CANNON.Material("bean"), contact = new CANNON.ContactMaterial(mat, mat, { friction, restitution, contactEquationStiffness: 5e7, contactEquationRelaxation: 4 });
  world.addContactMaterial(contact); world.defaultContactMaterial = contact;
  const bodies = new Array(swarm.count).fill(null); let acc = 0;
  const api = {
    world, bodies, contact, CANNON,
    /** Crea el cuerpo del grano i a partir de su posición/rotación/escala en el enjambre. `live: false` lo deja fuera del mundo hasta `release`. */
    add(i, { live = true } = {}) {
      const s = swarm.scale[i], b = new CANNON.Body({ mass: 1.2 * s * s * s, material: mat, linearDamping, angularDamping, allowSleep: sleep, sleepSpeedLimit: .12, sleepTimeLimit: .5 });
      b.addShape(new CANNON.Sphere(.26 * s)); b.addShape(new CANNON.Sphere(.2 * s), new CANNON.Vec3(0, .27 * s, 0)); b.addShape(new CANNON.Sphere(.2 * s), new CANNON.Vec3(0, -.27 * s, 0));
      b.position.set(swarm.pos[i * 3], swarm.pos[i * 3 + 1], swarm.pos[i * 3 + 2]); b.quaternion.set(swarm.quat[i * 4], swarm.quat[i * 4 + 1], swarm.quat[i * 4 + 2], swarm.quat[i * 4 + 3]);
      bodies[i] = b; b.userData = { live: false }; if (live) api.release(i); return b;
    },
    release(i) { const b = bodies[i]; if (!b.userData.live) { world.addBody(b); b.userData.live = true; } b.wakeUp(); return b; },
    park(i) { const b = bodies[i]; if (b.userData.live) { world.removeBody(b); b.userData.live = false; } b.velocity.setZero(); b.angularVelocity.setZero(); return b; },
    /** Pared / piso infinito: punto y normal hacia adentro. */
    plane(point, normal) { const b = new CANNON.Body({ mass: 0, material: mat }); b.addShape(new CANNON.Plane()); b.position.set(...point); b.quaternion.setFromVectors(new CANNON.Vec3(0, 0, 1), new CANNON.Vec3(...normal)); world.addBody(b); return b; },
    /** Caja cerrada de medio-tamaño [x, y, z] centrada en `c`. */
    box([x, y, z], c = [0, 0, 0]) { return [api.plane([c[0] - x, c[1], c[2]], [1, 0, 0]), api.plane([c[0] + x, c[1], c[2]], [-1, 0, 0]), api.plane([c[0], c[1] - y, c[2]], [0, 1, 0]), api.plane([c[0], c[1] + y, c[2]], [0, -1, 0]), api.plane([c[0], c[1], c[2] - z], [0, 0, 1]), api.plane([c[0], c[1], c[2] + z], [0, 0, -1])]; },
    wakeAll() { for (const b of bodies) b?.wakeUp(); },
    /** Avanza la simulación (dt real, ya escalado si hay cámara lenta) y copia los cuerpos al enjambre. `after` corre tras cada subpaso. */
    step(dt, after) {
      acc += Math.min(dt, 1 / 20); let n = 0;
      while (acc >= step && n++ < 4) { world.step(step); after?.(step); acc -= step; }
      if (n > 4) acc = 0;
      for (let i = 0; i < bodies.length; i++) { const b = bodies[i]; if (!b) continue; const p = b.position, q = b.quaternion; swarm.pos[i * 3] = p.x; swarm.pos[i * 3 + 1] = p.y; swarm.pos[i * 3 + 2] = p.z; swarm.quat[i * 4] = q.x; swarm.quat[i * 4 + 1] = q.y; swarm.quat[i * 4 + 2] = q.z; swarm.quat[i * 4 + 3] = q.w; }
      swarm.commit();
    },
    dispose() { for (const b of [...world.bodies]) world.removeBody(b); },
  };
  return api;
}
export { CANNON };
