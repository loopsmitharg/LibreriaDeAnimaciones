/** Galería: un único renderer (el grano hero) + tarjetas con capturas. Cada escena se carga recién al abrirla en scene.html. */
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mountScene } from "./core/mount.js";
import { ROASTS } from "./core/beans.js";
import { EFFECTS, GROUPS } from "./effects/index.js";

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

/* ---- tarjetas ---- */
const groups = $("groups");
for (const [key, name] of Object.entries(GROUPS)) {
  const list = EFFECTS.filter((e) => e.group === key);
  groups.append(el("section", { className: "group", id: `g-${key}` },
    el("div", { className: "group__head" }, el("h2", { textContent: name }), el("p", { textContent: `Grupo ${key} · ${list.length} escenas` })),
    el("div", { className: "cards" }, ...list.map((e) => el("a", { className: "card", href: `scene.html?id=${e.id}` },
      el("div", { className: "card__img" }, el("img", { src: `assets/previews/${e.id}.jpg`, alt: `Vista previa de ${e.title}`, loading: "lazy", width: 1280, height: 800 })),
      el("div", { className: "card__body" }, el("span", { className: "card__n", textContent: String(e.n).padStart(2, "0") }), el("h3", { textContent: e.title }), el("p", { textContent: e.desc }),
        el("div", { className: "card__tags" }, ...e.tags.map((t) => el("span", { textContent: t }))))))),
  ));
}
const filters = $("filters"), setFilter = (key) => { [...filters.children].forEach((b) => b.setAttribute("aria-pressed", b.dataset.key === key)); for (const k of Object.keys(GROUPS)) $(`g-${k}`).hidden = key !== "all" && key !== k; };
filters.append(...[["all", "Todas"], ...Object.entries(GROUPS)].map(([key, name]) => { const b = el("button", { type: "button", textContent: name, onclick: () => setFilter(key) }); b.dataset.key = key; return b; }));
setFilter("all");

/* ---- hero: el grano hiperrealista, arrastrable ---- */
const heroDef = {
  rig: "side", fov: 26, shadows: true,
  async mount({ stage, bean }) {
    const mesh = await bean({ variant: 0, lod: "hero", res: "2k" }); mesh.rotation.set(-.3, -.5, .15); stage.camera.position.set(0, 0, 3.3);
    const sc = stage.lights.key.shadow; Object.assign(sc.camera, { left: -.9, right: .9, top: .9, bottom: -.9, near: 1, far: 14 }); sc.camera.updateProjectionMatrix(); sc.bias = -.0008; sc.normalBias = .012;
    const orbit = new OrbitControls(stage.camera, stage.canvas); Object.assign(orbit, { enableDamping: true, enableZoom: false, enablePan: false, rotateSpeed: .8 }); stage.keep({ kill: () => orbit.dispose() });
    return { update(dt) { orbit.update(); if (!stage.pointer.down) mesh.rotation.y += dt * .16; } };
  },
};
const hero = await mountScene(heroDef, $("hero"));
const roasts = $("roasts");
roasts.append(...Object.entries(ROASTS).map(([key, name]) => { const b = el("button", { type: "button", textContent: name, onclick: async () => { await hero.setRoast(key); [...roasts.children].forEach((x) => x.setAttribute("aria-pressed", x === b)); } }); b.setAttribute("aria-pressed", key === hero.roast); return b; }));
window.__hero = hero;
