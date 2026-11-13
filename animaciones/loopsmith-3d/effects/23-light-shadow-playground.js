/* 23 · Light & Shadow Playground — una luz que se mueve alrededor del logo y revela volumen, bordes y sombras. */
import * as THREE from "three";
import { enableDrag, clamp, damp, V } from "../core/kit.js";
import { gsap } from "../core/gsap.js";

export default {
  id: "light-shadow-playground", n: "23", group: "D", name: "Light & Shadow Playground", hint: ["drag"], shadows: true, preset: "porcelain",
  lead: "Agarrá la luz y llevala alrededor del logo. Las letras proyectan su sombra sobre el piso y la pared, los biseles atrapan brillos y el grosor se lee en cada ángulo. Si la soltás, sigue sola una órbita lenta.",
  fields: [["power", "Intensidad de la luz", 1, .3, 2.2, .05], ["spread", "Apertura del haz", .75, .35, 1.2, .01], ["soft", "Suavidad de la sombra", .7, 0, 1, .05], ["auto", "Órbita automática", true]],
  tech: "Un SpotLight real con mapa de sombras (2048² en escritorio) sobre un piso y una pared que solo reciben sombra (ShadowMaterial), así el fondo sigue siendo el del CSS. La luz es un objeto raycasteable: se arrastra en un plano perpendicular a la cámara y su radio se limita. Sin luz ambiente fuerte, el volumen se lee solo por la luz y el entorno tenue.",
  mobile: "Se arrastra con el dedo. En dispositivos de poca potencia las sombras se desactivan y queda la iluminación.",
  mount({ stage, logo, o }) {
    stage.key.intensity = 0; stage.scene.environmentIntensity = .28;
    const floorY = -.95; stage.addFloor(floorY, 30);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), stage.shadows ? new THREE.ShadowMaterial({ opacity: .5 }) : new THREE.MeshBasicMaterial({ visible: false })); wall.position.set(0, 2, -1.05); wall.receiveShadow = true; stage.scene.add(wall); stage.own(wall.geometry, wall.material);
    logo.group.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    const spot = new THREE.SpotLight(0xfff0dc, 150, 0, .75, .7, 1.7); spot.position.set(-2.4, 2.6, 3.2); spot.target.position.set(0, -.1, 0); stage.scene.add(spot, spot.target);
    if (stage.shadows) { spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -.0003; spot.shadow.normalBias = .018; spot.shadow.camera.near = 1; spot.shadow.camera.far = 14; }
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); stage.scene.add(bulb); stage.own(bulb.geometry, bulb.material);
    const bulbHit = new THREE.Mesh(new THREE.SphereGeometry(.38, 12, 8), new THREE.MeshBasicMaterial({ visible: false })); bulb.add(bulbHit); stage.own(bulbHit.geometry, bulbHit.material);
    const fake = { pieces: [bulb], pick: (rc) => { const h = rc.intersectObject(bulbHit)[0]; return h ? { piece: bulb, point: h.point } : null; } };
    let idle = 3, t0 = 0; stage.camera.position.set(0, .35, stage.home.position.z); stage.target.set(0, -.1, 0); stage.look();
    const tgt = V(-2.4, 2.6, 3.2); let dragging = false;
    enableDrag(stage, fake, {
      start() { dragging = true; idle = 0; },
      move(p, target) { target.z = Math.max(.6, target.z); const r = target.length(); if (r > 6.8) target.multiplyScalar(6.8 / r); if (r < 2.2) target.multiplyScalar(2.2 / r); tgt.copy(target); idle = 0; },
      end() { dragging = false; idle = 0; },
    }, { depthWheel: false });
    stage.continuous = true;
    stage.add((dt, t) => {
      if (!dragging) { idle += dt; if (o.auto && idle > 3) { t0 += dt; const a = Math.sin(t0 * .55) * 1.2, e = .32 + Math.sin(t0 * .37) * .28; tgt.set(Math.sin(a) * 4.3, Math.sin(e) * 4.3 + .4, Math.cos(a) * 4.3 * Math.cos(e) + .2); } }
      bulb.position.lerp(tgt, 1 - Math.exp(-14 * dt)); spot.position.copy(bulb.position); spot.intensity = 150 * o.power; spot.angle = o.spread; spot.penumbra = .35 + o.soft * .6;
      if (stage.shadows) spot.shadow.radius = 1 + o.soft * 7;
    });
    return { play() { idle = 99; }, reset() { tgt.set(-2.4, 2.6, 3.2); idle = 0; }, destroy() { stage.key.intensity = 1.7; stage.scene.environmentIntensity = .75; } };
  },
};
