/** Visor de una escena a pantalla completa: HUD (replay, pausa, reset, tostado, luz, controles propios) e información técnica. */
import { mountScene } from "./core/mount.js";
import { ROASTS } from "./core/beans.js";
import { RIGS } from "./core/stage.js";
import { EFFECTS, GROUPS, loadEffect } from "./effects/index.js";

const $ = (id) => document.getElementById(id), q = new URLSearchParams(location.search);
const meta = EFFECTS.find((e) => e.id === q.get("id")) || EFFECTS[0];
const def = await loadEffect(meta);
document.title = `${meta.title} · Coffee 3D Motion Lab`;
document.body.dataset.bg = def.bg || "dark";
$("title").textContent = `${String(meta.n).padStart(2, "0")} · ${meta.title}`; $("desc").textContent = meta.desc; $("hint").textContent = def.hint || "";
const view = $("view"); if (def.scroll) view.classList.add("view--scroll");

const scene = await mountScene(def, view, { roast: q.get("roast") || undefined, rig: q.get("rig") || undefined });
window.__scene = scene; window.__ready = true;                                 // para pruebas automatizadas
$("loading").classList.add("done"); setTimeout(() => $("loading").remove(), 700);

/* ---- barra de controles ---- */
const bar = $("bar");
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const button = (label, fn) => el("button", { type: "button", textContent: label, onclick: fn });
const select = (label, options, value, fn) => { const s = el("select", { ariaLabel: label, onchange: () => fn(s.value) }, ...options.map(([v, t]) => el("option", { value: v, textContent: t, selected: v === value }))); return s; };
const pause = button("Pausa", () => { const p = !scene.stage.paused; p ? scene.pause() : scene.resume(); pause.textContent = p ? "Reanudar" : "Pausa"; pause.setAttribute("aria-pressed", p); });
if (scene.stage.paused) { pause.textContent = "Reanudar"; pause.setAttribute("aria-pressed", "true"); }
bar.append(button("Replay", () => { scene.play(); pause.textContent = "Pausa"; pause.setAttribute("aria-pressed", "false"); }), pause, button("Reset", () => scene.reset()), el("span", { className: "sep" }));
if (def.roasts !== false) bar.append(select("Tostado", Object.entries(ROASTS), scene.roast, (v) => scene.setRoast(v)));
if (def.rigs !== false) bar.append(select("Iluminación", Object.entries(RIGS).map(([k, r]) => [k, r.label]), scene.stage.rig, (v) => scene.setRig(v)));
for (const c of def.controls || []) {
  if (c.type === "range") { const out = el("b", { textContent: c.value }), i = el("input", { type: "range", min: c.min, max: c.max, step: c.step || .01, value: c.value, oninput: () => { out.textContent = i.value; scene.set(c.key, +i.value); } }); bar.append(el("label", {}, c.label, i)); }
  else if (c.type === "select") bar.append(select(c.label, c.options, c.value, (v) => scene.set(c.key, v)));
  else if (c.type === "toggle") { const b = button(c.label, () => { const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on); scene.set(c.key, on); }); b.setAttribute("aria-pressed", !!c.value); bar.append(b); }
  else if (c.type === "button") bar.append(button(c.label, () => scene.set(c.key, true)));
}

/* ---- fases de las escenas narrativas ---- */
if (def.phases) {
  const ph = $("phase"); ph.append(...def.phases.map(([, label]) => el("span", { textContent: label })));
  scene.onProgress = (p) => { let k = 0; def.phases.forEach(([at], i) => { if (p >= at) k = i; }); [...ph.children].forEach((s, i) => s.classList.toggle("on", i === k)); };
  scene.onProgress(scene.progress);
}

/* ---- información técnica ---- */
const stats = $("stats");
setInterval(() => {
  const s = scene.stage.stats();
  stats.innerHTML = `<div>Grupo <b>${GROUPS[meta.group]}</b></div><div>FPS <b>${s.fps}</b></div><div>Triángulos <b>${s.triangles.toLocaleString("es")}</b></div><div>Draw calls <b>${s.calls}</b></div><div>Texturas GPU <b>${s.textures}</b></div><div>Pixel ratio <b>${s.pixelRatio}</b></div><div>Técnica <b>${def.tech || "—"}</b></div>`;
}, 500);
