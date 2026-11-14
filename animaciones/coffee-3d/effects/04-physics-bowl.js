/**
 * 04 · Coffee Physics Bowl — un cuenco con granos que se inclina, se mueve y se agita.
 * La simulación corre en el espacio local del cuenco: al inclinarlo o acelerarlo cambia la gravedad relativa
 * (g_local = R⁻¹·(g − a)). Las paredes son una restricción analítica (esfera interior), así que ningún grano las atraviesa.
 */
import { beanWorld } from "../physics/world.js";

export default {
  rig: "soft", fov: 34, shadows: true, tech: "cannon-es · contención analítica",
  hint: "Mové el cursor para inclinar el cuenco · arrastrá para moverlo · Agitar lo sacude",
  controls: [{ key: "shake", label: "Agitar", type: "button" }],
  async mount({ stage, swarm, kit, THREE }) {
    const R = 2.1, n = stage.quality.low ? 60 : 110, sw = await swarm(n, { lod: "std", shadows: true }), r = kit.rng(31);
    const bowl = new THREE.Group(); stage.scene.add(bowl); bowl.add(sw.group);
    const prof = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push(new THREE.Vector2(Math.sin(a) * R, -Math.cos(a) * R)); }
    prof.push(new THREE.Vector2(R + .14, .03)); for (let i = 24; i >= 0; i--) { const a = (i / 24) * Math.PI / 2; prof.push(new THREE.Vector2(Math.sin(a) * (R + .14), -Math.cos(a) * (R + .14))); }
    const shell = new THREE.Mesh(stage.own(new THREE.LatheGeometry(prof, 72)), stage.own(new THREE.MeshPhysicalMaterial({ color: 0xeadfce, roughness: .32, clearcoat: .7, clearcoatRoughness: .25, side: THREE.DoubleSide })));
    shell.receiveShadow = shell.castShadow = true; bowl.add(shell); stage.addFloor(-R - .16, .4);
    stage.camera.position.set(0, 3.6, 7.4); stage.camera.lookAt(0, -.7, 0);
    const W = beanWorld(sw, { gravity: [0, -12, 0], restitution: .2, friction: .4, angularDamping: .12 });
    const fill = () => { for (let i = 0; i < n; i++) { if (!W.bodies[i]) sw.scale[i] = .5 + r() * .12; const b = W.bodies[i] || W.add(i); const a = r() * 6.28, d = Math.sqrt(r()) * 1.2; b.position.set(Math.cos(a) * d, -.6 + r() * 2.6, Math.sin(a) * d); b.velocity.setZero(); b.wakeUp(); } };
    fill();
    const contain = () => {                                                    // pared interior del cuenco: proyección + rebote, tras cada subpaso
      for (let i = 0; i < n; i++) {
        const b = W.bodies[i], p = b.position, v = b.velocity, lim = R - .27 * sw.scale[i], below = p.y < 0, d = below ? Math.hypot(p.x, p.y, p.z) : Math.hypot(p.x, p.z);
        if (d > lim) { const nx = p.x / d, ny = below ? p.y / d : 0, nz = p.z / d, vn = v.x * nx + v.y * ny + v.z * nz; p.x = nx * lim; if (below) p.y = ny * lim; p.z = nz * lim; if (vn > 0) { v.x -= nx * vn * 1.2; v.y -= ny * vn * 1.2; v.z -= nz * vn * 1.2; } v.scale(.985, v); }
        if (p.y > 2.6 && v.y > 0) v.y = 0;
      }
    };
    const pos = new THREE.Vector3(), vel = new THREE.Vector3(), prevVel = new THREE.Vector3(), target = new THREE.Vector3(), g = new THREE.Vector3(), q = new THREE.Quaternion(), at = new THREE.Vector3();
    let shake = 0, tx = 0, tz = 0;
    return {
      update(dt, t) {
        const P = stage.pointer;
        if (P.down && kit.pointerOnPlane(stage, at)) target.set(kit.clamp(at.x, -2.4, 2.4), kit.clamp(at.y * .6, -.6, 1.2), 0); else target.set(0, 0, 0);
        if (shake > 0) { shake -= dt; target.x += Math.sin(t * 34) * .55; target.y += Math.cos(t * 27) * .25; }
        prevVel.copy(vel); vel.addScaledVector(pos.clone().sub(target), -70 * dt).multiplyScalar(Math.exp(-9 * dt)); pos.addScaledVector(vel, dt); bowl.position.copy(pos);
        tx = kit.damp(tx, P.inside && !P.down ? P.y * .42 : 0, 5, dt); tz = kit.damp(tz, P.inside && !P.down ? -P.x * .5 : 0, 5, dt); bowl.rotation.set(tx, 0, tz);
        g.set(0, -12, 0).addScaledVector(vel.clone().sub(prevVel), -1 / Math.max(dt, 1e-3)).applyQuaternion(q.copy(bowl.quaternion).invert());
        W.world.gravity.set(g.x, g.y, g.z); if (g.lengthSq() > 150 || Math.abs(tx) + Math.abs(tz) > .02) W.wakeAll();
        W.step(dt, contain);
      },
      set(k) { if (k === "shake") { shake = 1; W.wakeAll(); } },
      reset: fill, destroy() { W.dispose(); }, test: { W, sw, R },
    };
  },
};
