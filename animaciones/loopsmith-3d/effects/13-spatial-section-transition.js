/* 13 · Spatial Section Transition — el logo cruza la cámara y se convierte en la marca de la sección siguiente. */
import * as THREE from "three";
import { Track, seg, clamp, V } from "../core/kit.js";
import { gsap } from "../core/gsap.js";

export default {
  id: "spatial-section-transition", n: "13", group: "B", name: "Spatial Section Transition", hint: ["scroll"],
  scroll: { length: 4.2, phases: [[0, "Sección 01"], [.12, "Separación"], [.36, "Cruce"], [.62, "Sección 02"], [.8, "Encabezado"]], after: "" },
  lead: "El logo vive dentro de la primera escena. Con el scroll sus letras se abren, cruzan la cámara y salen de cuadro; una segunda sección sube desde abajo y el mismo logo reaparece desde el fondo convertido en el encabezado de la nueva página, ya con tinta oscura.",
  fields: [["length", "Largo del recorrido (pantallas)", 4.2, 3, 7, .2], ["size", "Tamaño del encabezado", .3, .18, .5, .01], ["scrub", "Inercia del scroll (s)", .55, 0, 1.5, .05]],
  tech: "Las letras vuelan hacia la cámara en Z y la superan (se recortan por el plano cercano); en la segunda mitad reaparecen desde −Z hacia una pose de encabezado calculada con el frustum real. Una capa DOM sube por encima del canvas y el color de cada material cambia de claro a oscuro cuando la capa lo cubre; todo se invierte al volver.",
  mobile: "El encabezado usa un margen proporcional al ancho visible.",
  mount({ stage, logo, o, host, scrollScene }) {
    const panel = document.createElement("div"); panel.className = "ls-panel"; panel.style.cssText = "position:absolute;inset:0;z-index:0;background:#eef3e8;transform:translateY(101%);display:grid;align-content:center;gap:1rem;padding:7% 6%;color:#0b1120;pointer-events:none";
    panel.innerHTML = `<small style="color:#43700c;font:500 .72rem/1 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase">Sección 02</small><strong style="font:600 clamp(1.4rem,5vw,4rem)/1 Outfit,system-ui,sans-serif;letter-spacing:-.045em;max-width:14ch;margin-top:clamp(2rem,9vw,6rem)">Y el logo ahora firma la página.</strong>`;
    host.append(panel);
    const mats = logo.meshes.map((m) => ({ m, c0: m.material.color.clone(), c1: new THREE.Color(m.userData.slot === "smith" ? "#43700c" : m.userData.slot === "loop" ? "#0b1120" : "#ffffff") })), eg = gsap.parseEase("power2.inOut");
    let track, d;
    const build = () => {
      d = stage.frame(); const camZ = d, halfH = Math.tan(THREE.MathUtils.degToRad(stage.camera.fov / 2)) * camZ, halfW = halfH * stage.camera.aspect, k = o.size * Math.min(1, stage.camera.aspect / 1.4 + .35);
      const header = (p) => { const h = p.userData.home.position, w = logo.meta.width; return { p: [-halfW * .86 + (w / 2 + h.x) * k, halfH * .84 + h.y * k, 0], s: k }; };
      const cross = (p, i) => { const h = p.userData.home.position, s = i % 2 ? 1 : -1; return { p: [h.x * 3.2 + s * .8, h.y * 3 + s * 1.1, camZ + 3.5 + i * .25], r: [s * .6, -s * 1.3, s * .5], s: 1.4 }; };
      const behind = (p, i) => ({ p: [header(p).p[0] * .6, header(p).p[1] * .6, -9 - i * .2], r: [0, Math.PI, 0], s: header(p).s });
      track = new Track(logo.pieces, [{ at: 0, pose: null }, { at: .1, pose: null }, { at: .42, ease: "power3.in", stagger: .25, pose: cross }, { at: .5, pose: (p, i) => ({ ...cross(p, i), p: cross(p, i).p.map((v, j) => (j === 2 ? camZ + 12 : v)) }) },
        { at: .62, pose: behind }, { at: .9, ease: "expo.out", stagger: .35, pose: header }, { at: 1, pose: header }]);
    };
    build();
    const sc = scrollScene((p) => {
      track.at(p);
      const up = eg(seg(p, .4, .68)), tone = seg(p, .62, .86); panel.style.transform = `translateY(${(1 - up) * 101}%)`;
      for (const { m, c0, c1 } of mats) m.material.color.lerpColors(c0, c1, m.userData.slot === "symbol" ? 0 : tone);
      stage.camera.position.set(0, 0, d); stage.target.set(0, 0, 0); stage.look();
    });
    stage.onResize = () => { build(); sc.paint(); };
    return { ...sc, destroy() { panel.remove(); for (const { m, c0 } of mats) m.material.color.copy(c0); } };
  },
};
