/* 22 · Material Transformation — el logo cambia de material pieza por pieza, girando sobre sí mismo. */
import { gsap } from "../core/gsap.js";

export default {
  id: "material-transformation", n: "22", group: "D", name: "Material Transformation", hint: ["click", "auto"],
  lead: "Original, negro Studio, lima satinado, cromo, vidrio y porcelana: la misma geometría con seis materiales. Cada pieza gira una vuelta completa mientras su material se transforma, una detrás de otra; el cambio recorre el logo como una ola.",
  fields: [["duration", "Duración de la transición (s)", 1.3, .5, 3, .05], ["wave", "Retardo entre piezas (s)", .07, 0, .2, .005], ["auto", "Cambiar solo", true], ["every", "Cada (s)", 3.4, 1.8, 8, .1]],
  tech: "Cada malla tiene un único MeshPhysicalMaterial vivo cuyas propiedades (color, rugosidad, metal, laca, transmisión) se interpolan hacia el preset elegido, con retardo por pieza. Los presets son los mismos materiales del .blend (loopsmith-presets.json). Al cruzar a vidrio se activa la transmisión, que Three resuelve con un pase de refracción.",
  mobile: "Tocar el escenario pasa al siguiente material.",
  mount({ stage, logo, o, host }) {
    const names = Object.keys(logo.asset.presets), hud = document.createElement("div"); hud.className = "ls-hud"; hud.style.cssText = "left:5%;top:7%"; host.append(hud);
    let idx = Math.max(0, names.indexOf(logo.preset)), call = null; stage.continuous = true;
    const label = () => (hud.innerHTML = `Material · ${logo.asset.presets[names[idx]].label}`); label();
    const go = (to) => {
      idx = to ?? (idx + 1) % names.length; label(); logo.setPreset(names[idx], { duration: o.duration, stagger: o.wave });
      logo.pieces.forEach((p, i) => { gsap.killTweensOf(p.rotation); p.rotation.y = 0; gsap.to(p.rotation, { y: Math.PI * 2, duration: o.duration + .4, delay: i * o.wave, ease: "power3.inOut", onComplete: () => { p.rotation.y = 0; } }); });
    };
    const schedule = () => { call?.kill(); if (o.auto) call = gsap.delayedCall(o.every, () => { go(); schedule(); }); };
    stage.on(stage.canvas, "click", () => { go(); schedule(); }); schedule();
    return { play() { go(); schedule(); }, pause() { call?.kill(); }, reset() { call?.kill(); go(0); schedule(); }, destroy() { call?.kill(); hud.remove(); logo.pieces.forEach((p) => gsap.killTweensOf(p.rotation)); } };
  },
};
