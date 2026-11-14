/**
 * 18 · Infinite Coffee Flow — una corriente continua sobre una curva espacial cerrada.
 * Loop perfecto: cada grano avanza por la misma curva (parámetro módulo 1) y gira un número entero de vueltas por ciclo.
 */
export default {
  rig: "back", fov: 36, tech: "Curva cerrada · loop exacto · 380 instancias",
  hint: "La corriente no tiene principio ni fin",
  controls: [{ key: "speed", label: "Velocidad", type: "range", min: 0, max: 3, step: .1, value: 1 }],
  async mount({ stage, swarm, kit, o, THREE }) {
    const n = stage.quality.count(380), sw = await swarm(n, { lod: "crowd" }), r = kit.rng(53), SEG = 480, pts = [];
    for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.2832; pts.push(new THREE.Vector3(Math.cos(a) * 5.2, Math.sin(a * 2) * 1.5, Math.sin(a) * 3.6 - 2)); }
    const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal"), table = curve.getSpacedPoints(SEG), fr = curve.computeFrenetFrames(SEG, true);
    const seed = Array.from({ length: n }, (_, i) => ({ u: i / n + (r() - .5) * .004, a: r() * 6.2832, rad: Math.sqrt(r()) * .78, turns: 1 + Math.floor(r() * 3), axis: new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize(), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28)) }));
    for (let i = 0; i < n; i++) sw.scale[i] = .28 + r() * .22;
    stage.camera.position.set(0, 1.2, 9.5); stage.camera.lookAt(0, 0, -1.5);
    const q = new THREE.Quaternion(), s = new THREE.Quaternion(); let T = 0;
    return {
      update(dt) {
        T = (T + dt * o.speed * .035) % 1;
        for (let i = 0; i < n; i++) {
          const k = seed[i], u = (k.u + T + 1) % 1, f = u * SEG, i0 = Math.floor(f), i1 = (i0 + 1) % (SEG + 1), w = f - i0, a = table[i0], b = table[i1], N = fr.normals[i0], B = fr.binormals[i0], c = Math.cos(k.a) * k.rad, d = Math.sin(k.a) * k.rad;
          sw.set(i, a.x + (b.x - a.x) * w + N.x * c + B.x * d, a.y + (b.y - a.y) * w + N.y * c + B.y * d, a.z + (b.z - a.z) * w + N.z * c + B.z * d);
          q.copy(k.q).multiply(s.setFromAxisAngle(k.axis, u * k.turns * 6.2832)).toArray(sw.quat, i * 4);
        }
        sw.commit();
      },
    };
  },
};
