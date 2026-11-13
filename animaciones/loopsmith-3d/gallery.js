/**
 * Galería del 3D Motion Lab.
 *   index.html                 colección: hero 3D, Best of y tarjetas con preview real (solo las visibles)
 *   index.html?demo=<id>       escena activa con controles, materiales, ficha técnica y código
 *   index.html?demo=<id>&full=1  escenas de scroll a página completa (scroller = ventana)
 * Estrategia de WebGL: un renderer compartido para TODAS las tarjetas (se copia a un canvas 2D por tarjeta) + un renderer propio
 * para la escena activa. Las tarjetas se montan al entrar en pantalla y se destruyen al salir.
 */
import { EFFECTS, GROUPS } from "./effects/index.js";
import { mountExperience, defaults } from "./core/experience.js";
import { loadLogoAsset } from "./core/assets.js";
import { reducedMotion, isTouch } from "./core/engine.js";

const $ = (s, r = document) => r.querySelector(s), params = new URLSearchParams(location.search), demoId = params.get("demo");
const HINTS = { drag: ["pan_tool_alt", "Arrastrar"], hover: ["mouse", "Hover"], scroll: ["swipe_vertical", "Scroll"], click: ["ads_click", "Clic"], play: ["play_arrow", "Replay"], auto: ["all_inclusive", "Automático"], wheel: ["unfold_more", "Rueda"] };
const BEST = [
  ["cinematic-journey", "El hero de una home: seis capítulos con inicio, desarrollo y cierre que presentan la marca y terminan en el lockup."],
  ["scroll-assembly", "La intro más directa: el visitante arma el logo en el espacio con su propio scroll, y hacia arriba lo desarma."],
  ["spatial-section-transition", "Una transición entre secciones que no es un fundido: el logo cruza la cámara y firma la página siguiente."],
  ["magnetic-3d", "Vida ambiente para un hero o un footer: reacciona al cursor en tres ejes sin comprometer nunca la marca."],
  ["material-transformation", "Mostrar las versiones de marca (negro, lima, cromo, vidrio, porcelana) como una sola pieza que se transforma."],
];
const hints = (d) => d.hint.map((k) => `<span><i class="material-icons-round" aria-hidden="true">${HINTS[k][0]}</i>${HINTS[k][1]}</span>`).join("");
const byId = (id) => EFFECTS.find((e) => e.id === id);

/* ------------------------------------------------------------------ Colección */
async function collection() {
  const asset = await loadLogoAsset();
  const tris = [asset.meta.symbol, ...asset.meta.letters].reduce((n, m) => n + (m.triangles ?? Object.values(m.parts || {}).reduce((a, p) => a + p.triangles, 0)), 0);
  $("#stat-tris").textContent = `${Math.round(tris / 1000)}k`; $("#stat-n").textContent = EFFECTS.length;
  if (isTouch) $("#hero-hint").textContent = "Tocá y deslizá sobre el logo";

  const hero = await mountExperience({ ...byId("magnetic-3d"), frameWidth: 5.4, frameHeight: 2.7 }, $("#hero-stage"), { params: { radius: 2.2, strength: 1.15 } });
  setTimeout(() => hero.play(), 900);

  $("#best-list").innerHTML = BEST.map(([id, why]) => { const d = byId(id); return `<li><a href="?demo=${id}"><span class="lab-n">${d.n}</span><strong>${d.name}</strong><p>${why}</p></a></li>`; }).join("");
  $("#groups").innerHTML = Object.entries(GROUPS).map(([g, [title, sub]]) => `
    <section class="lab-group" data-group="${g}">
      <header class="lab-group__head"><h2><span>${g}</span>${title}</h2><p>${sub}</p></header>
      <div class="lab-grid">${EFFECTS.filter((d) => d.group === g).map((d) => `
        <article class="lab-card" data-id="${d.id}">
          <div class="lab-stage"><span class="lab-loading">Cargando</span></div>
          <a class="lab-card__foot" href="?demo=${d.id}"><span class="lab-n">${d.n}</span><h3>${d.name}</h3><span class="lab-hints">${hints(d)}</span><span class="lab-open">Abrir <i class="material-icons-round" aria-hidden="true">arrow_forward</i></span></a>
        </article>`).join("")}</div>
    </section>`).join("");

  const chips = [["all", "Todos"], ["best", "Best of"], ...Object.entries(GROUPS).map(([g, [t]]) => [g, `${g} · ${t}`])], filters = $("#filters");
  filters.innerHTML = chips.map(([k, t], i) => `<button type="button" data-filter="${k}" aria-pressed="${!i}">${t}</button>`).join("");
  filters.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filter]"); if (!chip) return; const k = chip.dataset.filter;
    filters.querySelectorAll("button").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    $("#best").hidden = k !== "all" && k !== "best"; document.querySelectorAll(".lab-group").forEach((s) => (s.hidden = k !== "all" && s.dataset.group !== k));
  });

  // Previews reales: un experimento solo existe mientras su tarjeta está en pantalla.
  const live = new Map();
  const io = new IntersectionObserver((entries) => entries.forEach(async ({ target, isIntersecting }) => {
    const d = byId(target.dataset.id), host = $(".lab-stage", target);
    if (isIntersecting && !live.has(target)) {
      const slot = { dead: false, exp: null, timer: 0 }; live.set(target, slot);
      const exp = await mountExperience(d, host, { preview: true }).catch((err) => { console.error(d.id, err); return null; });
      if (!exp) return; if (slot.dead) return exp.destroy();
      slot.exp = exp; host.querySelector(".lab-loading")?.remove();
      const beat = () => { if (!document.hidden) exp.play(); };
      slot.first = setTimeout(beat, 600 + Math.random() * 600); slot.timer = setInterval(beat, d.scroll ? 16000 : d.hint.includes("auto") ? 1e9 : 7000);
    } else if (!isIntersecting && live.has(target)) {
      const slot = live.get(target); slot.dead = true; clearTimeout(slot.first); clearInterval(slot.timer); slot.exp?.destroy(); live.delete(target);
      if (!$(".lab-loading", host)) host.innerHTML = `<span class="lab-loading">Cargando</span>`;
    }
  }), { rootMargin: "120px 0px", threshold: .12 });
  document.querySelectorAll(".lab-card").forEach((c) => io.observe(c));
  window.__lab = { live, hero };
}

/* ------------------------------------------------------------------ Detalle */
async function detail(def) {
  $("#collection").hidden = true; $("#detail").hidden = false; document.title = `${def.name} · 3D Motion Lab`;
  $("#d-kicker").textContent = `${def.n} / ${EFFECTS.length} · ${GROUPS[def.group][0]}`; $("#d-name").textContent = def.name; $("#d-lead").textContent = def.lead;
  $("#d-hints").innerHTML = hints(def); $("#d-tech").textContent = def.tech; $("#d-mobile").textContent = def.mobile;
  const i = EFFECTS.indexOf(def), link = (el, d, label) => { el.href = `?demo=${d.id}`; el.innerHTML = `<small>${label}</small><span>${d.n} · ${d.name}</span>`; };
  link($("#d-prev"), EFFECTS.at(i - 1), "← Anterior"); link($("#d-next"), EFFECTS[(i + 1) % EFFECTS.length], "Siguiente →");

  const asset = await loadLogoAsset(), stageEl = $("#d-stage"), values = defaults(def), state = { preset: def.preset || "original" };
  if (def.scroll) { stageEl.classList.add("lab-stage--scroll"); stageEl.tabIndex = 0; $("#b-page").hidden = false; $("#b-page").href = `?demo=${def.id}&full=1`; }
  $("#d-fields").innerHTML = (def.fields || []).map(([key, label, value, a, b, step]) => {
    if (typeof value === "boolean") return `<label class="lab-field lab-field--check"><input type="checkbox" name="${key}" ${value ? "checked" : ""}><span>${label}</span></label>`;
    if (a && typeof a === "object") return `<label class="lab-field"><span>${label}</span><select name="${key}">${Object.entries(a).map(([v, t]) => `<option value="${v}" ${v == value ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
    return `<label class="lab-field"><span>${label}<output>${value}</output></span><input type="range" name="${key}" min="${a}" max="${b}" step="${step}" value="${value}"></label>`;
  }).join("") || `<p class="lab-empty">Esta pieza no tiene parámetros.</p>`;
  $("#d-materials").innerHTML = `<span>Material</span>` + Object.entries(asset.presets).map(([k, p]) => `<button type="button" data-preset="${k}" aria-pressed="${k === state.preset}">${p.label}</button>`).join("");

  const code = () => {
    const changed = Object.fromEntries(Object.entries(values).filter(([k, v]) => v !== defaults(def)[k])), P = [];
    if (Object.keys(changed).length) P.push(`params: ${JSON.stringify(changed).replace(/"(\w+)":/g, "$1: ")}`); if (state.preset !== (def.preset || "original")) P.push(`preset: "${state.preset}"`); if (def.scroll) P.push("scroller: window");
    return `<script src="gsap.min.js"><\/script>${def.scroll ? `\n<script src="ScrollTrigger.min.js"><\/script>` : ""}
<script type="importmap">{ "imports": { "three": "vendor/three/build/three.module.js", "three/addons/": "vendor/three/jsm/"${def.id === "physical-collapse" || def.id === "letter-dominoes" ? `, "cannon-es": "vendor/cannon-es/cannon-es.js"` : ""} } }<\/script>
<link rel="stylesheet" href="core/scene.css">

<div id="marca" style="height: ${def.scroll ? "auto" : "70vh"}"></div>

<script type="module">
  import { mountExperience } from "./core/experience.js";
  import def from "./effects/${def.n}-${def.id}.js";
  const exp = await mountExperience(def, document.querySelector("#marca")${P.length ? `, { ${P.join(", ")} }` : ""});
  exp.play();   // pause() · reset() · destroy() · exp.logo.setPreset("chrome")
<\/script>`;
  };

  let exp = null, statTimer = 0, seq = 0;
  const remount = async () => {
    const my = ++seq; clearInterval(statTimer); exp?.destroy(); exp = null; stageEl.scrollTop = 0; $("#d-state").textContent = "Cargando escena…";
    const e = await mountExperience(def, stageEl, { params: values, preset: state.preset, scroller: def.scroll ? stageEl : null, force: false }).catch((err) => { console.error(err); $("#d-state").textContent = "Error al montar la escena"; return null; });
    if (!e) return; if (my !== seq) return e.destroy();
    exp = e; window.__lab = { exp: e, def, values };
    $("#d-state").textContent = e.static ? "Movimiento reducido: logo 3D estático" : def.scroll ? "Desplazá dentro del cuadro" : "Escena activa";
    $("#d-code").textContent = code();
    statTimer = setInterval(() => { const s = exp?.stage?.stats(); if (s) $("#d-stats").innerHTML = `<span><b>${s.calls}</b> draw calls</span><span><b>${(s.triangles / 1000).toFixed(1)}k</b> triángulos</span><span><b>${s.geometries}</b> geometrías</span><span><b>${s.textures}</b> texturas</span>`; }, 1000);
    if (!def.scroll && !e.static) setTimeout(() => exp?.play(), 500);
  };
  const form = $("#d-controls");
  form.addEventListener("input", (e) => {
    const el = e.target, v = el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value; values[el.name] = v;
    if (el.type === "range") el.previousElementSibling.lastChild.textContent = v; clearTimeout(form._t); form._t = setTimeout(remount, 200);
  });
  form.addEventListener("reset", () => setTimeout(() => { Object.assign(values, defaults(def)); form.querySelectorAll("output").forEach((o) => (o.textContent = o.parentElement.nextElementSibling.value)); remount(); }));
  $("#d-materials").addEventListener("click", (e) => {
    const b = e.target.closest("[data-preset]"); if (!b) return; state.preset = b.dataset.preset;
    $("#d-materials").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); exp?.logo.setPreset(state.preset, { duration: .8, stagger: .05 }); $("#d-code").textContent = code();
  });
  $("#b-play").onclick = () => exp?.play(); $("#b-pause").onclick = () => exp?.pause(); $("#b-reset").onclick = () => exp?.reset();
  $("#b-full").onclick = () => (document.fullscreenElement ? document.exitFullscreen() : $(".lab-preview").requestFullscreen?.());
  $("#b-copy").onclick = (e) => navigator.clipboard.writeText(code()).then(() => { e.currentTarget.textContent = "Copiado"; setTimeout(() => (e.currentTarget.textContent = "Copiar"), 1400); });
  await remount();
}

/* ------------------------------------------------------- Página completa (scroll real) */
async function full(def) {
  document.body.classList.add("lab-full"); document.body.querySelectorAll("body > :not(.lib-back):not(script)").forEach((n) => n.remove());
  const back = $(".lib-back"); back.href = `?demo=${def.id}`; back.querySelector("b").textContent = "Volver"; back.querySelector("small").textContent = def.name;
  const host = document.createElement("div"); document.body.prepend(host);
  window.__lab = { exp: await mountExperience(def, host, { scroller: window, preset: def.preset }), def };
}

const def = demoId && byId(demoId);
if (def && params.has("full") && def.scroll) full(def); else if (def) detail(def); else collection();
