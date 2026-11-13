/* 12 · Scroll Orbit — las piezas orbitan en planos inclinados y terminan formando el logo. */
import * as THREE from "three";
import { clamp, lerp, seg, V } from "../core/kit.js";
import { gsap } from "../core/gsap.js";

export default {
  id: "scroll-orbit", n: "12", group: "B", name: "Scroll Orbit", hint: ["scroll"],
  scroll: { length: 4.5, phases: [[0, "Logo"], [.1, "Despegue"], [.25, "Órbita"], [.72, "Formación"]], after: "<small>Siguiente sección</small>La órbita se cerró." },
  lead: "Las piezas se despegan del logo y giran alrededor del centro en órbitas de distinto radio e inclinación mientras la cámara las acompaña a medias. Al final, la formación orbital se transforma de nuevo en el logo original.",
  fields: [["length", "Largo del recorrido (pantallas)", 4.5, 3, 8, .25], ["turns", "Vueltas", 1.6, .5, 3, .05], ["radius", "Radio de las órbitas (u)", 1.7, 1, 3, .05], ["scrub", "Inercia del scroll (s)", .6, 0, 1.5, .05]],
  tech: "Cada pieza describe una circunferencia de radio e inclinación propios (fase = progreso × vueltas + índice). Se orienta hacia afuera con lookAt. Tres tramos: despegue, órbita y formación; la formación mezcla posición (lerp) y rotación (slerp) hacia la transformación original. La cámara solo acompaña con un giro suave que se anula al final.",
  mobile: "El radio se limita al ancho visible.",
  mount({ stage, logo, o, scrollScene }) {
    const n = logo.pieces.length, dummy = new THREE.Object3D(), qa = new THREE.Quaternion(), pos = V(), out = V(), eu = new THREE.Euler();
    let d = stage.frame();
    const orbitAt = (i, ang, k) => {                       // k: despegue 0..1 (el radio crece desde la posición original)
      const R = (o.radius + (i % 3) * .38) * Math.min(1, stage.camera.aspect * .75 + .35), inc = ((i % 4) - 1.5) * .42, tilt = (i % 2 ? 1 : -1) * .35;
      pos.set(Math.cos(ang) * R, Math.sin(ang) * R * Math.sin(inc), Math.sin(ang) * R * Math.cos(inc) - 1.2);
      pos.applyEuler(eu.set(tilt * .6, 0, tilt));
      return pos;
    };
    const sc = scrollScene((p) => {
      const lift = seg(p, .04, .22), form = seg(p, .68, .94), ease = gsap.parseEase("power2.inOut"), eform = gsap.parseEase("expo.inOut")(form);
      const base = p * Math.PI * 2 * o.turns * 1.5;
      logo.pieces.forEach((piece, i) => {
        const h = piece.userData.home, ang = base + (i / n) * Math.PI * 2;
        orbitAt(i, ang, 1); out.copy(pos); dummy.position.copy(out); dummy.lookAt(out.clone().multiplyScalar(2).add(V(0, 0, -1.2)));
        qa.copy(dummy.quaternion);
        piece.position.lerpVectors(h.position, out, ease(lift)); piece.quaternion.slerpQuaternions(h.quaternion, qa, ease(lift));
        if (eform > 0) { piece.position.lerp(h.position, eform); piece.quaternion.slerp(h.quaternion, eform); }
        piece.scale.copy(h.scale);
      });
      const yaw = Math.sin(clamp(p * 1.06) * Math.PI) * .5 * (1 - eform), el = Math.sin(clamp(p * 1.06) * Math.PI) * .22 * (1 - eform);
      stage.camera.position.set(Math.sin(yaw) * d, Math.sin(el) * d, Math.cos(yaw) * d * Math.cos(el)); stage.target.set(0, 0, -.2 * (1 - eform)); stage.look();
    });
    stage.onResize = () => { d = stage.frame(); sc.paint(); };
    return sc;
  },
};
