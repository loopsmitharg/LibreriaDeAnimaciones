/** 20 · Coffee Material Laboratory — inspector objetivo de los mapas horneados: albedo, roughness, normales, AO y comparación contra un material plano. */
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { setRoast, ROAST_TINT } from "../core/beans.js";

const VIEWS = [["pbr", "PBR completo"], ["albedo", "Base color"], ["rough", "Roughness"], ["normal", "Normales"], ["ao", "Oclusión"], ["simple", "Material simple"]];
const LABEL = "position:absolute;top:50%;translate:0 -50%;white-space:nowrap;font:500 11px/1 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase";
export default {
  rig: "side", fov: 28, rigs: false, tech: "Vistas de depuración · split por scissor",
  hint: "Arrastrá para rotar · rueda para zoom · mové la línea para comparar contra un material plano",
  controls: [
    { key: "view", label: "Vista", type: "select", value: "pbr", options: VIEWS },
    { key: "compare", label: "Comparar", type: "toggle", value: true },
    { key: "intensity", label: "Luz", type: "range", min: 0, max: 8, step: .1, value: 3.4 },
    { key: "azimuth", label: "Posición", type: "range", min: -180, max: 180, step: 1, value: 58 },
    { key: "elevation", label: "Altura", type: "range", min: -10, max: 85, step: 1, value: 10 },
    { key: "spin", label: "Rotación", type: "toggle", value: true },
  ],
  async mount({ stage, bean, o, host, state, THREE }) {
    const mesh = await bean({ variant: 0, lod: "hero", res: "2k" }), pbr = mesh.material; mesh.rotation.set(-.25, .4, .1);
    // Canal suelto del ORM como gris (el pow compensa la salida sRGB: el gris en pantalla es el valor del mapa).
    const channel = (ch) => { const m = new THREE.MeshBasicMaterial({ map: pbr.roughnessMap }); m.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace("#include <map_fragment>", `diffuseColor.rgb = pow(vec3(texture2D(map, vMapUv).${ch}), vec3(2.2));`); }; m.customProgramCacheKey = () => "c3-channel-" + ch; return m; };
    const mats = { pbr, albedo: new THREE.MeshBasicMaterial({ map: pbr.map }), rough: channel("g"), ao: channel("r"), normal: new THREE.MeshNormalMaterial({ normalMap: pbr.normalMap }), simple: new THREE.MeshStandardMaterial({ color: ROAST_TINT[state.roast], roughness: .6 }) };
    stage.own(mats.albedo, mats.rough, mats.ao, mats.normal, mats.simple);
    stage.camera.position.set(0, 0, 3.3);
    const orbit = new OrbitControls(stage.camera, stage.canvas); Object.assign(orbit, { enableDamping: true, minDistance: .68, maxDistance: 6, enablePan: false, zoomSpeed: .7 }); stage.keep({ kill: () => orbit.dispose() });
    const key = stage.lights.key, light = () => { const a = o.azimuth * Math.PI / 180, e = o.elevation * Math.PI / 180; key.position.set(Math.sin(a) * Math.cos(e) * 6, Math.sin(e) * 6, Math.cos(a) * Math.cos(e) * 6); key.intensity = o.intensity; };
    light();
    // Divisor arrastrable: izquierda material simple, derecha la vista elegida.
    let split = .5, drag = false; const bar = document.createElement("div");
    bar.style.cssText = "position:absolute;z-index:4;top:0;bottom:0;width:28px;margin-left:-14px;cursor:ew-resize;touch-action:none;background:linear-gradient(90deg,transparent 13px,rgba(246,236,223,.75) 13px 15px,transparent 15px)";
    bar.innerHTML = `<span style="${LABEL};right:26px;color:#f6ecdf">Material simple</span><span style="${LABEL};left:26px;color:#d9a066">Mapas horneados</span>`;
    host.append(bar); const place = () => { bar.style.left = `${split * 100}%`; bar.style.display = o.compare ? "" : "none"; }; place();
    stage.on(bar, "pointerdown", (e) => { drag = true; bar.setPointerCapture(e.pointerId); }); stage.on(bar, "pointerup", () => (drag = false));
    stage.on(bar, "pointermove", (e) => { if (!drag) return; const r = host.getBoundingClientRect(); split = Math.min(.95, Math.max(.05, (e.clientX - r.left) / r.width)); place(); });
    stage.renderOverride = () => {
      const r = stage.renderer, w = stage.width, h = stage.height, x = Math.round(w * split);
      if (!o.compare) { mesh.material = mats[o.view]; r.render(stage.scene, stage.camera); return; }
      r.setScissorTest(true); r.setScissor(0, 0, x, h); mesh.material = mats.simple; r.render(stage.scene, stage.camera);
      r.setScissor(x, 0, w - x, h); mesh.material = mats[o.view]; r.render(stage.scene, stage.camera); r.setScissorTest(false);
    };
    return {
      update(dt) { orbit.update(); if (o.spin && !stage.pointer.down) mesh.rotation.y += dt * .25; },
      set(k) { if (k === "compare") place(); else if (k !== "view" && k !== "spin") light(); },
      async setRoast(r) { await setRoast(pbr, r); mats.albedo.map = pbr.map; mats.rough.map = mats.ao.map = pbr.roughnessMap; mats.normal.normalMap = pbr.normalMap; mats.simple.color.set(ROAST_TINT[r]); },
      reset() { stage.camera.position.set(0, 0, 3.3); orbit.target.set(0, 0, 0); split = .5; place(); },
      destroy() { bar.remove(); },
    };
  },
};
