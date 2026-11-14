/** Iluminación de estudio: entorno procedural (softboxes, sin HDRI que descargar) + key con sombra, fill y rim. */
import * as THREE from "three";

export function studioEnvironment(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), new THREE.MeshBasicMaterial({ color: 0x55565a, side: THREE.BackSide })));
  const box = (w, h, x, y, z, color, power, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m);
  };
  box(14, 7, 0, 6.8, 1, 0xffffff, 6, 0, Math.PI / 2);            // softbox cenital
  box(3, 9, -10, 1.5, 3, 0xfff6ea, 7, Math.PI / 2);                // tira lateral cálida
  box(3, 9, 10, 1.5, -2, 0xdfeaff, 5, Math.PI / 2);                // tira fría: separa el borde
  box(16, 4, 0, .5, -11, 0xffffff, 3);                              // panel trasero bajo
  box(18, 8, 0, 3, 11, 0xffffff, 2.2, Math.PI);                    // relleno frontal
  const pm = new THREE.PMREMGenerator(renderer), tex = pm.fromScene(s, .03).texture; pm.dispose();
  s.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return tex;
}

export function addLights(scene, shadowMap = 2048) {
  const key = new THREE.DirectionalLight(0xfff4e8, 2.6); key.position.set(.7, 2.0, 1.5); key.target.position.set(.14, 0, 0);
  key.castShadow = true; key.shadow.mapSize.set(shadowMap, shadowMap); key.shadow.bias = -.0004; key.shadow.normalBias = .004; key.shadow.radius = 5;
  Object.assign(key.shadow.camera, { left: -.9, right: .9, top: .9, bottom: -.9, near: .2, far: 6 });
  const fill = new THREE.DirectionalLight(0xdfe8ff, .55); fill.position.set(-1.5, .8, 1.2);
  const rim = new THREE.DirectionalLight(0xffffff, 1.5); rim.position.set(-.6, 1.2, -1.8);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: .3 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  scene.add(key, key.target, fill, rim, floor);
  return { key, fill, rim, floor };
}
