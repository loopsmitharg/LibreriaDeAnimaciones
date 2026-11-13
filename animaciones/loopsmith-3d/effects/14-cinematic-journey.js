/* 14 · Cinematic Journey — recorrido espacial de la marca (dirección visual propia, inspirada en la calidad narrativa de Igloo Inc.). */
import * as THREE from "three";
import { Track, CamPath, rng, seg, V, clamp } from "../core/kit.js";

const CHAPTERS = [
  { at: .02, to: .13, kicker: "01 · Origen", title: "Todo empieza con un bucle.", text: "Un símbolo suspendido en la oscuridad." },
  { at: .17, to: .31, kicker: "02 · Anillos", title: "Un círculo que se cierra sobre sí mismo.", text: "Cada vuelta suma una pieza.", side: "right" },
  { at: .37, to: .57, kicker: "03 · Taller", title: "Cada pieza, a mano.", text: "Nueve letras y un símbolo, con grosor, bisel y material reales." },
  { at: .62, to: .74, kicker: "04 · Calma", title: "Volver a empezar.", side: "center" },
  { at: .79, to: .91, kicker: "05 · Forma", title: "Loop Smith.", text: "Las piezas encuentran su lugar." },
  { at: .93, to: 1.02, kicker: "06 · Cierre", title: "Work Smarter.", side: "center" },
];

export default {
  id: "cinematic-journey", n: "14", group: "B", name: "Cinematic Journey", hint: ["scroll"], preset: "chrome", fov: 32, flagship: true,
  scroll: { length: 9, phases: [[0, "Origen"], [.14, "Anillos"], [.32, "Taller"], [.6, "Calma"], [.78, "Forma"], [.93, "Cierre"]], after: "<small>Siguiente sección</small>Esto es solo el principio." },
  lead: "La experiencia central: seis capítulos con inicio, desarrollo y cierre. Un símbolo en la oscuridad, anillos que lo rodean, un taller de letras suspendidas que la cámara atraviesa, una pausa, y la reconstrucción del lockup con el material que pasa de cromo a identidad.",
  fields: [["length", "Largo del recorrido (pantallas)", 9, 6, 14, .5], ["depth", "Profundidad del taller (u)", 1.35, .8, 2.2, .05], ["props", "Piezas flotantes", true], ["scrub", "Inercia del scroll (s)", .8, 0, 1.6, .05]],
  tech: "Un único progreso gobierna tres sistemas: poses de las piezas (Track con cuaterniones), la cámara (curva Catmull-Rom con posición y objetivo independientes) y el escenario (anillos, losas y guijarros modelados en Blender, con niebla para dar profundidad). El material cambia de cromo a original al cruzar el 80 % y vuelve a cromo al retroceder. Los textos son DOM sobre el canvas.",
  mobile: "En pantallas verticales la cámara se aleja y los anillos se reducen; la niebla acorta el escenario para mantener el rendimiento.",
  async mount({ stage, logo, o, scrollScene, captions, props, preview }) {
    const P = await props(), own = [], root = new THREE.Group(); stage.scene.add(root);
    const mk = (src, mat) => { const m = new THREE.Mesh(src.geometry, mat); root.add(m); return m; };    // geometría compartida del asset; material propio
    const metal = new THREE.MeshPhysicalMaterial({ color: "#e9edf5", metalness: 1, roughness: .13, envMapIntensity: 1.2 });
    const slabM = new THREE.MeshPhysicalMaterial({ color: "#0b0e15", metalness: .2, roughness: .26, clearcoat: 1, clearcoatRoughness: .08 });
    const limeM = new THREE.MeshPhysicalMaterial({ color: "#a3e635", roughness: .42, clearcoat: .2 }), whiteM = new THREE.MeshPhysicalMaterial({ color: "#f1f5f9", roughness: .3, clearcoat: .6 });
    own.push(metal, slabM, limeM, whiteM); stage.own(...own);
    const rings = [[1.28, [Math.PI / 2.6, 0, 0], 1], [1.78, [-.5, .2, .55], -1], [2.45, [.2, .5, 1.05], 1]].map(([s, tilt, dir]) => { const m = mk(P.Prop_Ring, metal); m.userData = { s, tilt, dir }; m.scale.setScalar(.001); return m; });
    const r = rng(41), N = preview || !o.props ? 0 : 14, floaters = [];
    for (let i = 0; i < N; i++) {
      const slab = i % 4 === 0, m = mk(slab ? P.Prop_Slab : P.Prop_Pebble, slab ? slabM : i % 3 === 1 ? limeM : metal);
      m.userData = { base: V((r() - .5) * 7, (r() - .5) * 3.4, -2 - r() * 14 * (o.depth / 1.35)), s: slab ? .9 + r() * .7 : .35 + r() * .55, spin: V(r() - .5, r() - .5, r() - .5) };
      m.position.copy(m.userData.base); m.scale.setScalar(.001); floaters.push(m);
    }
    stage.scene.fog = new THREE.Fog(0x070a12, 9, quality() ? 22 : 30);
    const cap = captions(CHAPTERS);
    let track, cam, flag = false;
    const spot = (i) => V(Math.cos(i * 1.3) * 1.5, Math.sin(i * 1.7) * .9, -2.4 - (i - 1) * 1.35 * (o.depth / 1.35));
    const build = () => {
      const d = stage.frame(), far = spot(logo.pieces.length - 1).z, narrow = stage.camera.aspect < 1;
      const sym = logo.symbol, O = [0, 0, 0], hidden = (p, i) => ({ p: [p.userData.home.position.x * 3, p.userData.home.position.y * 3, -16], r: [i, i * 2, 0], s: .001 });
      const work = (p, i) => { const q = rng(i * 17 + 3); return { p: spot(i), r: [(q() - .5) * 1.1, (q() - .5) * 2.0, (q() - .5) * .8], s: 1 }; };
      const calm = (p, i) => { const w = work(p, i); return p === sym ? { p: O, r: [0, .35, 0], s: 1.05 } : { ...w, r: [w.r[0] * .6 + .2, w.r[1] + .5, w.r[2]] }; };
      track = new Track(logo.pieces, [
        { at: 0, pose: (p, i) => (p === sym ? { p: O, r: [.25, -.9, 0], s: 1.4 } : hidden(p, i)) },
        { at: .15, ease: "none", pose: (p, i) => (p === sym ? { p: O, r: [.1, .6, 0], s: 1.4 } : hidden(p, i)) },
        { at: .34, ease: "power3.inOut", stagger: .5, pose: (p, i) => (p === sym ? { p: O, r: [0, 0, 0], s: 1.05 } : work(p, i)) },
        { at: .6, ease: "sine.inOut", pose: calm },
        { at: .86, ease: "expo.inOut", stagger: .4, pose: null }, { at: 1, pose: null },
      ]);
      const k = narrow ? 1.35 : 1;
      cam = new CamPath(stage, [
        { at: 0, pos: [0, 3.4 * k, 9.2 * k], target: [0, 0, 0] }, { at: .14, pos: [0, 1.5, 6.3 * k], target: [0, 0, 0] }, { at: .3, pos: [2.1 * k, .5, 4.1 * k], target: [.1, 0, -1.2] },
        { at: .38, pos: [-1.4, .55, -1.2], target: [.3, 0, -5.5] }, { at: .46, pos: [1.3, -.25, -4.6], target: [-.2, 0, -8] }, { at: .53, pos: [-1.1, .45, -8.2], target: [0, 0, -11.5] }, { at: .58, pos: [1, .3, far + 1.8], target: [0, 0, far - 1] },
        { at: .66, pos: [3.4, 1.4, far * .62], target: [0, 0, far * .5] }, { at: .78, pos: [4.2 * k, 2.4, 2.4], target: [0, 0, -2] }, { at: .9, pos: [0, .5, d * 1.06], target: [0, 0, 0] }, { at: 1, pos: [0, 0, d], target: [0, 0, 0] },
      ]);
    };
    build();
    const tmp = new THREE.Euler();
    const sc = scrollScene((p) => {
      track.at(p); cam.at(p); cap(p);
      // Anillos: nacen alrededor del símbolo (.15–.30), giran con el progreso y al final el mayor queda como halo detrás del lockup.
      const born = seg(p, .15, .3), away = seg(p, .72, .9), halo = seg(p, .78, .94);
      rings.forEach((m, i) => {
        const { s, tilt, dir } = m.userData, k = born * (1 - (i === 0 ? 0 : away));
        const scale = Math.max(.001, s * k); m.scale.set(scale * (i === 0 ? 1 + halo * .62 : 1), scale * (i === 0 ? 1 - halo * .22 : 1), scale);
        tmp.set(tilt[0] * (1 - halo * (i === 0)), tilt[1], tilt[2] + dir * p * 11); m.rotation.copy(tmp); m.position.set(0, 0, i === 0 ? -halo * .5 : 0);
        if (i === 0) m.rotation.set(tilt[0] * (1 - halo), tilt[1] * (1 - halo), dir * p * 11 * (1 - halo));
      });
      floaters.forEach((m, i) => { const u = m.userData, vis = seg(p, .12, .32) * (1 - seg(p, .66, .84)); m.scale.setScalar(Math.max(.001, u.s * vis)); m.rotation.set(u.spin.x * p * 14, u.spin.y * p * 14, u.spin.z * p * 10); m.position.set(u.base.x, u.base.y + Math.sin(p * 9 + i) * .15, u.base.z); });
      const want = p >= .8; if (want !== flag) { flag = want; logo.setPreset(want ? "original" : "chrome", { duration: 1.3 }); }
    });
    stage.onResize = () => { build(); sc.paint(); };
    return { ...sc, destroy() { stage.scene.fog = null; root.removeFromParent(); } };
  },
};
const quality = () => matchMedia("(pointer: coarse)").matches || Math.min(innerWidth, innerHeight) < 700;
