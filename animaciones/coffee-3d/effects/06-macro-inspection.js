/** 06 · Macro Bean Inspection — el grano hero (49k tris, PBR 2K) para rotar y acercarse. La prueba de fuego de los materiales. */
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VARIANTS } from "../core/beans.js";

export default {
  rig: "side", fov: 28, shadows: true, tech: "Hero 49k tris · 2K",
  hint: "Arrastrá para rotar · rueda o pellizco para acercarte · probá la luz rasante",
  controls: [
    { key: "variant", label: "Variante", type: "select", value: "0", options: VARIANTS.map((v, i) => [String(i), v]) },
    { key: "graze", label: "Luz rasante", type: "toggle", value: true },
    { key: "spin", label: "Giro automático", type: "toggle", value: true },
  ],
  async mount({ stage, o, bean, THREE }) {
    const mesh = await bean({ variant: 0, lod: "hero", res: "2k" });
    mesh.rotation.set(-.35, .5, .15);
    stage.camera.position.set(0, 0, 3.4);
    const orbit = new OrbitControls(stage.camera, stage.canvas);
    Object.assign(orbit, { enableDamping: true, dampingFactor: .08, minDistance: .68, maxDistance: 6, enablePan: false, rotateSpeed: .8, zoomSpeed: .7 }); stage.keep({ kill: () => orbit.dispose() });
    // Luz rasante: una puntual muy baja que orbita lento; es la que revela el microrrelieve.
    const graze = new THREE.SpotLight(0xffe6c4, 0, 0, .5, .6, 1.2); stage.scene.add(graze, graze.target);
    if (stage.shadows) {                                                           // sombras propias ajustadas al grano: la hendidura proyecta sombra real
      graze.castShadow = true; graze.shadow.mapSize.set(2048, 2048); graze.shadow.bias = -.0008; graze.shadow.normalBias = .012; graze.shadow.camera.near = 1; graze.shadow.camera.far = 5;
      const sc = stage.lights.key.shadow; Object.assign(sc.camera, { left: -.9, right: .9, top: .9, bottom: -.9, near: 1, far: 14 }); sc.camera.updateProjectionMatrix(); sc.bias = -.0008; sc.normalBias = .012;
    }
    return {
      update(dt, t) {
        orbit.update();
        if (o.spin && !stage.pointer.down) mesh.rotation.y += dt * .22;
        const a = t * .35; graze.position.set(Math.cos(a) * 2.6, .32 + Math.sin(t * .2) * .12, Math.sin(a) * 2.6 + .4);
        graze.intensity += ((o.graze ? 11 : 0) - graze.intensity) * Math.min(1, dt * 4);
      },
      set(key, v) { if (key === "variant") mesh.geometry = mesh.userData.geos[+v]; },
      reset() { stage.camera.position.set(0, 0, 3.4); orbit.target.set(0, 0, 0); mesh.rotation.set(-.35, .5, .15); },
    };
  },
};
