/** 09 · Coffee Tunnel — la cámara recorre una curva espacial rodeada de granos flotantes; una luz viaja con ella y barre las superficies. */
export default {
  scroll: 7, rig: "back", fov: 52, roast: "espresso", tech: "Curva Catmull-Rom · 620 instancias",
  hint: "Scrolleá para atravesar el túnel",
  async mount({ stage, swarm, kit, THREE }) {
    const n = stage.quality.count(620), sw = await swarm(n, { lod: "crowd" }), r = kit.rng(19), base = kit.randomQuats(n, 11), SEG = 240;
    const curve = new THREE.CatmullRomCurve3([[0, 0, 12], [1.5, .6, 0], [-2.2, 1.1, -12], [1.2, -1.6, -24], [3, .6, -36], [0, 0, -50]].map((p) => new THREE.Vector3(...p)), false, "centripetal");
    const frames = curve.computeFrenetFrames(SEG, false), pt = new THREE.Vector3(), look = new THREE.Vector3();
    for (let i = 0; i < n; i++) {                                              // el túnel es fijo: se compone una vez; el scroll mueve la cámara
      const u = i / n, k = Math.round(u * SEG), a = r() * 6.2832, rad = 1.55 + r() * 1.5; curve.getPointAt(u, pt);
      pt.addScaledVector(frames.normals[k], Math.cos(a) * rad).addScaledVector(frames.binormals[k], Math.sin(a) * rad); sw.set(i, pt.x, pt.y, pt.z); sw.scale[i] = .36 + r() * .34;
    }
    stage.scene.fog = new THREE.Fog(0x0f0a08, 4, 24);
    const follow = new THREE.PointLight(0xffd2a0, 42, 13, 1.5); stage.scene.add(follow);
    let P = 0;
    return {
      progress(p) { P = p; },
      update(dt, t) {
        const u = .02 + P * .9; curve.getPointAt(u, stage.camera.position); curve.getPointAt(Math.min(1, u + .05), look); stage.camera.lookAt(look); stage.camera.rotateZ(Math.sin(P * 6) * .18);
        follow.position.copy(stage.camera.position).lerp(look, .25);
        kit.spinQuats(sw.quat, base, P * 6 + t * .3); sw.commit();
      },
    };
  },
};
