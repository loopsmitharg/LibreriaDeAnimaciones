/**
 * Monta una escena sobre cualquier contenedor y entrega una API uniforme. No depende de la galería:
 *
 *   import { mountScene } from "./core/mount.js";
 *   import def from "./effects/02-coffee-rain.js";
 *   const scene = await mountScene(def, document.querySelector("#hero"), { roast: "dark", params: { count: 160 } });
 *   scene.pause(); scene.play(); scene.reset(); scene.setRoast("light"); scene.setRig("side"); scene.set("force", 2); scene.destroy();
 *
 * Escenas de scroll (def.scroll = alto en pantallas): se crea un tramo alto con el escenario `sticky` y un ScrollTrigger con scrub
 * que entrega el progreso 0..1 a `inst.progress(p)`. El scroll es el de la ventana.
 */
import { createStage, reducedMotion, THREE, gsap } from "./stage.js";
import { loadGeometries, beanMaterial, setRoast as swapRoast, Swarm } from "./beans.js";
import * as kit from "./kit.js";
import { enhance } from "../shaders/bean-shader.js";

const ScrollTrigger = window.ScrollTrigger;
if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

export async function mountScene(def, host, { roast = def.roast || "medium", rig = def.rig || "soft", params = {} } = {}) {
  const o = { ...Object.fromEntries((def.controls || []).filter((c) => c.key).map((c) => [c.key, c.value])), ...params };
  const cleanups = []; let stageHost = host, track = null;
  host.classList.add("c3-host");
  if (def.scroll) {
    track = document.createElement("div"); track.className = "c3-track"; track.style.height = `${def.scroll * 100}vh`;
    stageHost = document.createElement("div"); stageHost.className = "c3-sticky"; track.append(stageHost); host.append(track); cleanups.push(() => track.remove());
  }
  const stage = createStage(stageHost, { fov: def.fov || 32, shadows: !!def.shadows, rig });
  const materials = new Set(), swarms = [];
  const state = { roast };

  const ctx = {
    stage, THREE, gsap, kit, o, host: stageHost, state,
    /** Material del tostado actual; las escenas lo piden acá para que `setRoast` los alcance a todos. */
    async material(res = "1k", { detail = res === "2k", blend = false } = {}) { const m = await beanMaterial(state.roast, res, { shared: false }); if (detail || blend) enhance(m, { detail, blend }); materials.add(m); stage.own(m); return m; },
    /** Enjambre instanciado de `count` granos. lod: "crowd" | "std" | "hero". */
    async swarm(count, { lod = "crowd", res = "1k", shadows = false, variants = null } = {}) {
      const [geos, mat] = await Promise.all([loadGeometries({ hero: lod === "hero" }), ctx.material(res)]);
      const s = new Swarm(geos[lod], mat, count, { shadows: shadows && stage.shadows, variants }); stage.scene.add(s.group); swarms.push(s); return s;
    },
    /** Un grano suelto (Mesh). Por defecto el hero con texturas 2K: para primeros planos. */
    async bean({ variant = 0, lod = "hero", res = "2k", blend = false } = {}) {
      const [geos, mat] = await Promise.all([loadGeometries({ hero: lod === "hero" }), ctx.material(res, { detail: res === "2k", blend })]);
      const m = new THREE.Mesh(geos[lod][variant], mat); m.castShadow = m.receiveShadow = stage.shadows; m.userData.geos = geos[lod]; stage.scene.add(m); return m;
    },
    /** Textos editoriales por tramo de scroll: [{ at, to, kicker, title, text, side }] -> update(p). */
    captions(list) {
      const els = list.map((c) => { const e = document.createElement("div"); e.className = `c3-caption c3-caption--${c.side || "left"}`; e.innerHTML = `<small>${c.kicker || ""}</small><strong>${c.title}</strong><p>${c.text || ""}</p>`; stageHost.append(e); cleanups.push(() => e.remove()); return e; });
      return (p) => list.forEach((c, i) => { const a = kit.clamp((p - c.at) / .03) * (1 - kit.clamp((p - (c.to - .03)) / .03)); els[i].style.opacity = a; els[i].style.transform = `translateY(${(1 - a) * 18}px)`; });
    },
  };

  const inst = (await def.mount(ctx)) || {};
  if (inst.update) stage.tick(inst.update);

  let st = null, auto = null, progress = 0, api = null;
  const stopAuto = () => { auto?.kill(); auto = null; };
  if (def.scroll) {
    const paint = (p) => { progress = p; inst.progress?.(p); api?.onProgress?.(p); };
    st = ScrollTrigger.create({ trigger: track, start: "top top", end: "bottom bottom", scrub: def.scrub ?? .7, onUpdate: (s) => paint(s.progress) });
    paint(0); stage.keep(st);
    ["wheel", "touchstart", "keydown"].forEach((t) => stage.on(window, t, stopAuto, { passive: true }));
  }
  if (reducedMotion() && !def.scroll) stage.paused = true;                    // movimiento reducido: la escena arranca quieta; Play la activa

  api = {
    def, stage, params: o, inst,
    get roast() { return state.roast; }, get progress() { return progress; },
    play() { stage.paused = false; if (st) { stopAuto(); const v = { y: st.start }; window.scrollTo(0, st.start); auto = gsap.to(v, { y: st.end, duration: Math.max(8, def.scroll * 2.4), ease: "sine.inOut", onUpdate: () => window.scrollTo(0, v.y) }); } inst.play?.(); },
    pause() { stopAuto(); stage.paused = true; },
    resume() { stage.paused = false; },
    reset() { stopAuto(); stage.paused = false; if (st) window.scrollTo(0, st.start); inst.reset?.(); },
    async setRoast(r) { state.roast = r; if (inst.setRoast) await inst.setRoast(r); else await Promise.all([...materials].map((m) => swapRoast(m, r))); },
    setRig(name) { stage.setRig(name); inst.setRig?.(name); },
    set(key, value) { o[key] = value; inst.set?.(key, value); },
    destroy() { stopAuto(); inst.destroy?.(); swarms.forEach((s) => s.dispose()); stage.dispose(); cleanups.forEach((c) => c()); host.classList.remove("c3-host"); },
  };
  return api;
}
