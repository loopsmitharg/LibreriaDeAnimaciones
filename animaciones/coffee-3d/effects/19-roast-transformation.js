/**
 * 19 · Roast Transformation — el grano pasa por los cuatro tostados. No es un fundido de color: el shader mezcla
 * base color, roughness y normales hacia el siguiente juego de mapas con un frente irregular, y una luz cálida acompaña el calor.
 */
import { loadMaps, ROASTS } from "../core/beans.js";
import { setBlendTarget } from "../shaders/bean-shader.js";

const ORDER = Object.keys(ROASTS);
export default {
  rig: "soft", fov: 28, roast: "light", roasts: false, shadows: true, tech: "Shader de mezcla · 4 juegos de mapas 2K",
  hint: "Mové el control de tostado o dejá que avance solo",
  controls: [{ key: "level", label: "Tostado", type: "range", min: 0, max: 3, step: .01, value: 0 }, { key: "auto", label: "Automático", type: "toggle", value: true }],
  async mount({ stage, bean, o, host, kit, THREE }) {
    const mesh = await bean({ variant: 0, lod: "hero", res: "2k", blend: true }), mat = mesh.material, maps = await Promise.all(ORDER.map((r) => loadMaps(r, "2k")));
    mesh.rotation.set(-.3, .4, .12); stage.camera.position.set(0, 0, 3.1);
    const heat = new THREE.PointLight(0xff6a1f, 0, 6, 1.6); heat.position.set(-1.2, -.9, 1.6); stage.scene.add(heat);
    const label = document.createElement("div"); label.style.cssText = "position:absolute;left:50%;top:16%;translate:-50% 0;font:700 clamp(1.6rem,4vw,3rem)/1 'Playfair Display',serif;color:#f6ecdf;letter-spacing:-.01em;pointer-events:none"; host.append(label);
    let seg = -1, clock = 0;
    const apply = (v) => {
      const i = Math.min(2, Math.floor(v)), f = v - i;
      if (i !== seg) { seg = i; const A = maps[i]; mat.map = A.map; mat.normalMap = A.normalMap; mat.roughnessMap = mat.aoMap = A.orm; setBlendTarget(mat, maps[i + 1]); }      // A = tostado actual, B = el siguiente
      mat.userData.c3.uMix.value = f; heat.intensity = 7 * Math.sin(f * Math.PI) ** 2; label.textContent = ROASTS[ORDER[Math.round(v)]];
    };
    apply(0);
    return {
      update(dt) {
        mesh.rotation.y += dt * .3;
        if (o.auto) { clock += dt; o.level = 1.5 - 1.5 * Math.cos(clock * .32); }
        apply(o.level);
      },
      set(k, v) { if (k === "level") { o.auto = false; clock = Math.acos(kit.clamp(1 - v / 1.5, -1, 1)) / .32; } },
      reset() { clock = 0; o.auto = true; }, play() { clock = 0; o.auto = true; }, destroy() { label.remove(); },
    };
  },
};
