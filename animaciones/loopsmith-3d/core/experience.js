/**
 * Monta un experimento sobre un contenedor HTML: crea el Stage (renderer, cámara, luces), instancia el logo desde el GLB,
 * arma el DOM de scroll cuando corresponde y entrega una API uniforme { play, pause, reset, setProgress, destroy }.
 *
 *   const exp = await mountExperience(def, contenedor, { preview: false, params: { force: 1.2 }, preset: "original" });
 *   exp.play(); exp.pause(); exp.reset(); exp.logo.setPreset("chrome", { duration: .8 }); exp.destroy();
 *
 * Escenas de scroll (def.scroll = { length }): con `scroller` (elemento con overflow o window) se crea un tramo alto con
 * un escenario `position: sticky` y un ScrollTrigger con scrub; sin scroller (previews) el progreso se anima solo.
 */
import * as THREE from "three";
import { gsap, ScrollTrigger } from "./gsap.js";
import { Stage, reducedMotion } from "./engine.js";
import { loadLogoAsset, loadPropsAsset } from "./assets.js";
import { Logo } from "./logo.js";
import { clamp } from "./kit.js";

export const defaults = (def) => Object.fromEntries((def.fields || []).map(([key, , value]) => [key, value]));

export async function mountExperience(def, host, { preview = false, scroller = null, params = {}, preset = null, force = false } = {}) {
  const o = { ...defaults(def), ...params };
  const useScroll = !!def.scroll && !preview && !!scroller;
  const cleanups = [];
  let stageHost = host, track = null, phase = null;

  let sizeBox = null;
  if (useScroll) {
    const win = scroller === window, len = o.length ?? def.scroll.length ?? 4;
    track = document.createElement("div"); track.className = "ls-track";
    stageHost = document.createElement("div"); stageHost.className = "ls-sticky";
    track.append(stageHost); host.append(track);
    // El alto del escenario es el del visor (px reales): con porcentajes el tramo alto lo estiraría.
    sizeBox = () => { const h = win ? innerHeight : scroller.clientHeight; if (!h) return; track.style.height = `${len * h}px`; stageHost.style.height = `${h}px`; };
    sizeBox();
    if (def.scroll.after) { const after = document.createElement("section"); after.className = "ls-after"; after.innerHTML = def.scroll.after; after.style.minHeight = "70vh"; host.append(after); cleanups.push(() => after.remove()); }
    cleanups.push(() => track.remove());
  }
  if (def.scroll?.phases && !preview) {
    phase = document.createElement("div"); phase.className = "ls-phase"; phase.innerHTML = "<b></b><span></span><i></i>"; stageHost.append(phase); cleanups.push(() => phase.remove());
  }

  const stage = new Stage(stageHost, { preview, shadows: !!def.shadows, fov: def.fov || 30, scroller: useScroll ? scroller : null });
  if (sizeBox) {
    let t = 0; const on = () => { sizeBox(); clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 120); };
    if (scroller === window) stage.on(window, "resize", on); else { const ro = new ResizeObserver(on); ro.observe(scroller); stage.keep(ro); }
    stage.keep({ kill: () => clearTimeout(t) });
  }
  const asset = await loadLogoAsset();
  const logo = new Logo(asset, { preset: preset || def.preset || "original" });
  stage.scene.add(logo.group); stage.frame(def.frameWidth || 4.3, def.frameHeight || 1.9);

  const hud = (p) => {
    if (!phase) return; const P = def.scroll.phases; let k = 0; P.forEach(([at], i) => { if (p >= at) k = i; });
    phase.children[0].textContent = String(k + 1).padStart(2, "0"); phase.children[1].textContent = P[k][1]; phase.children[2].style.transform = `scaleX(${p})`;
  };

  /** Escena de scroll: `draw(p)` aplica el estado del progreso p (0..1) a objetos reales de Three.js. */
  const scrollScene = (draw, { scrub = o.scrub ?? .6 } = {}) => {
    const state = { p: 0 }; let auto = null;
    const paint = () => { draw(state.p); hud(state.p); stage.invalidate(); };
    const tween = gsap.to(state, { p: 1, ease: "none", paused: true, onUpdate: paint }); stage.keep(tween);
    if (useScroll) stage.keep(ScrollTrigger.create({ trigger: track, scroller, start: "top top", end: "bottom bottom", scrub, animation: tween, invalidateOnRefresh: true }));
    paint();
    const win = scroller === window, pos = () => (win ? scrollY : scroller.scrollTop), go = (y) => (win ? scrollTo(0, y) : (scroller.scrollTop = y));
    const max = () => (win ? document.documentElement.scrollHeight - innerHeight : scroller.scrollHeight - scroller.clientHeight);
    const stop = () => { auto?.kill(); auto = null; };
    if (useScroll) ["wheel", "touchstart", "pointerdown", "keydown"].forEach((t) => stage.on(win ? window : scroller, t, stop, { passive: true }));
    return {
      state, paint,
      setProgress(p) { stop(); if (useScroll) go(p * (track.offsetHeight - (win ? innerHeight : scroller.clientHeight))); else { state.p = clamp(p); paint(); } },
      play() {
        stop(); const len = o.length ?? def.scroll?.length ?? 4, dur = Math.max(6, len * 2.2);
        if (useScroll) { const v = { y: pos() }; go(0); auto = gsap.to(v, { y: () => max(), duration: dur, ease: "power1.inOut", delay: .2, yoyo: true, repeat: 1, repeatDelay: .8, onUpdate: () => go(v.y) }); }
        else { tween.pause(); auto = gsap.timeline().to(state, { p: 1, duration: dur * .55, ease: "power1.inOut", onUpdate: paint }).to(state, { p: 0, duration: dur * .45, ease: "power1.inOut", onUpdate: paint }, "+=.6"); }
      },
      pause() { stop(); },
      reset() { stop(); if (useScroll) go(0); else { state.p = 0; paint(); } },
    };
  };

  /** Textos editoriales sobre el canvas: [{ at, to, kicker, title, text, side }] -> función update(p). */
  const captions = (list) => {
    const els = list.map((c) => { const e = document.createElement("div"); e.className = `ls-caption ls-caption--${c.side || "left"}`; e.innerHTML = `<small>${c.kicker || ""}</small><strong>${c.title}</strong><p>${c.text || ""}</p>`; stageHost.append(e); cleanups.push(() => e.remove()); return e; });
    return (p) => list.forEach((c, i) => { const a = clamp((p - c.at) / .035) * (1 - clamp((p - (c.to - .035)) / .035)); els[i].style.opacity = a; els[i].style.transform = `translateY(${(1 - a) * 22}px)`; });
  };

  const ctx = { stage, logo, asset, captions, o, host: stageHost, track, scroller: useScroll ? scroller : null, useScroll, preview, scrollScene, props: loadPropsAsset, THREE, gsap };
  let inst = {};
  if (reducedMotion() && !force) { stage.render(); inst = { static: true }; }          // movimiento reducido: logo completo y quieto
  else inst = (await def.mount(ctx)) || {};
  stage.start(); stage.render();

  return {
    def, stage, logo, params: o, static: !!inst.static,
    play: () => inst.play?.(), pause: () => inst.pause?.(), reset: () => { if (inst.reset) inst.reset(); else logo.restore(.8); },
    setProgress: (p) => inst.setProgress?.(p), inst,
    destroy() {
      inst.destroy?.(); gsap.killTweensOf(logo.pieces); logo.destroy(); stage.destroy(); cleanups.forEach((c) => c());
    },
  };
}
