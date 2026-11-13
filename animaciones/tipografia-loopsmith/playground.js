/**
 * Galería del Typography Playground.
 *  - index.html            -> colección: tarjetas con preview real (solo se montan las visibles).
 *  - index.html?demo=<id>  -> detalle: escenario grande, controles, ficha y código.
 *  - ...&full=1            -> escenas de scroll a página completa (scroller = ventana).
 */
(() => {
  const LST = window.LoopSmithType, $ = (s, r = document) => r.querySelector(s);
  const params = new URLSearchParams(location.search), demoId = params.get("demo");
  const GROUPS = {
    A: ["Interacciones con las letras", "Mouse · touch · física"],
    B: ["Scroll storytelling", "El scroll controla el movimiento"],
    C: ["Logo reveals", "Entradas cinematográficas"],
    D: ["Experimentos avanzados", "Laboratorio"],
  };
  const HINTS = { drag: ["pan_tool_alt", "Arrastrar"], hover: ["mouse", "Hover"], scroll: ["swipe_vertical", "Scroll"], click: ["ads_click", "Clic"], play: ["play_arrow", "Replay"], auto: ["all_inclusive", "Loop"] };
  const BEST = [
    ["pinned-cinematic", "El hero de una home: seis tiempos fijados en pantalla que presentan la marca y sueltan el scroll."],
    ["section-transition", "El logo deja de ser un adorno y pasa a ser la transición: viaja de una sección a la firma del encabezado."],
    ["scroll-assembly", "La intro más directa. El visitante arma el logo con su propio scroll, ida y vuelta."],
    ["magnetic-letters", "Vida ambiente para un hero o un footer: reacciona al cursor sin pedir nada y nunca rompe la marca."],
    ["precision-reveal", "La entrada sobria para un loader o una apertura: guías tipográficas, máscaras exactas, cero ruido."],
  ];
  const hints = (def) => def.hint.map((k) => `<span><i class="material-icons-round" aria-hidden="true">${HINTS[k][0]}</i>${HINTS[k][1]}</span>`).join("");
  const logoIn = (host, px) => { const l = LST.createLogo(host); l.setSize(px); return l; };

  logoIn($("#bar-logo"), 26);

  /* ---------------------------------------------------------------- Colección */
  function collection() {
    const hero = LST.mount("magnetic-letters", $("#hero-stage"), { radius: 1.9, strength: .4 });
    setTimeout(() => hero.play(), 700);

    $("#best-list").innerHTML = BEST.map(([id, why]) => { const d = LST.demos[id]; return `<li><a href="?demo=${id}"><span class="tp-n">${d.n}</span><strong>${d.name}</strong><p>${why}</p></a></li>`; }).join("");

    $("#groups").innerHTML = Object.entries(GROUPS).map(([g, [title, sub]]) => `
      <section class="tp-group" data-group="${g}">
        <header class="tp-group__head"><h2><span>${g}</span>${title}</h2><p>${sub}</p></header>
        <div class="tp-grid">${LST.order.map((id) => LST.demos[id]).filter((d) => d.group === g).map((d) => `
          <article class="tp-card" data-id="${d.id}">
            <div class="tp-stage${d.scroll ? " tp-stage--scroll" : ""}" ${d.scroll ? 'tabindex="0"' : ""}></div>
            <a class="tp-card__foot" href="?demo=${d.id}">
              <span class="tp-n">${d.n}</span>
              <h3>${d.name}</h3>
              <span class="tp-hints">${hints(d)}</span>
              <span class="tp-open">Abrir <i class="material-icons-round" aria-hidden="true">arrow_forward</i></span>
            </a>
          </article>`).join("")}</div>
      </section>`).join("");

    const chips = [["all", "Todas"], ["best", "Best of"], ...Object.entries(GROUPS).map(([g, [t]]) => [g, `${g} · ${t}`])];
    const filters = $("#filters");
    filters.innerHTML = chips.map(([k, t], i) => `<button type="button" data-filter="${k}" aria-pressed="${!i}">${t}</button>`).join("");
    filters.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-filter]"); if (!chip) return;
      const key = chip.dataset.filter;
      filters.querySelectorAll("button").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      $("#best").hidden = key !== "all" && key !== "best";
      document.querySelectorAll(".tp-group").forEach((s) => (s.hidden = key !== "all" && s.dataset.group !== key));
    });

    // Previews reales: una animación solo existe mientras su tarjeta está en pantalla.
    const live = new Map();
    const io = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
      const def = LST.demos[target.dataset.id], stage = $(".tp-stage", target);
      if (isIntersecting && !live.has(target)) {
        const inst = LST.mount(def.id, stage, def.scroll ? { scroller: stage } : {});
        let k = 0, hover = false;
        const beat = () => { if (!hover && !document.hidden) (def.previewReset && k++ % 2 ? inst.reset : inst.play)(); };
        const first = setTimeout(beat, 500);
        const every = def.scroll ? (LST.defaults(def).length * 3 + 3) * 1000 : def.hint.includes("auto") ? 1e9 : 6500;
        const loop = setInterval(beat, every);
        const on = () => (hover = true), off = () => (hover = false);
        target.addEventListener("pointerenter", on); target.addEventListener("pointerleave", off);
        live.set(target, () => { clearTimeout(first); clearInterval(loop); target.removeEventListener("pointerenter", on); target.removeEventListener("pointerleave", off); inst.destroy(); });
      } else if (!isIntersecting && live.has(target)) { live.get(target)(); live.delete(target); }
    }), { rootMargin: "80px 0px", threshold: .15 });
    document.querySelectorAll(".tp-card").forEach((c) => io.observe(c));
  }

  /* ------------------------------------------------------------------ Detalle */
  function detail(def) {
    $("#collection").hidden = true; $("#detail").hidden = false;
    document.title = `${def.name} · Typography Playground`;
    $("#d-kicker").textContent = `${def.n} / 30 · ${GROUPS[def.group][0]}`;
    $("#d-name").textContent = def.name; $("#d-lead").textContent = def.lead;
    $("#d-hints").innerHTML = hints(def); $("#d-tech").textContent = def.tech; $("#d-mobile").textContent = def.mobile;
    const i = LST.order.indexOf(def.id), link = (el, id, label) => { const d = LST.demos[id]; el.href = `?demo=${id}`; el.innerHTML = `<small>${label}</small><span>${d.n} · ${d.name}</span>`; };
    link($("#d-prev"), LST.order.at(i - 1), "← Anterior"); link($("#d-next"), LST.order[(i + 1) % LST.order.length], "Siguiente →");

    const stage = $("#d-stage"), values = LST.defaults(def);
    if (def.scroll) { stage.classList.add("tp-stage--scroll"); stage.tabIndex = 0; const full = $("#b-full"); full.hidden = false; full.href = `?demo=${def.id}&full=1`; }

    $("#d-fields").innerHTML = (def.fields || []).map(([key, label, value, a, b, step]) => {
      if (typeof value === "boolean") return `<label class="tp-field tp-field--check"><input type="checkbox" name="${key}" ${value ? "checked" : ""}><span>${label}</span></label>`;
      if (a && typeof a === "object") return `<label class="tp-field"><span>${label}</span><select name="${key}">${Object.entries(a).map(([v, t]) => `<option value="${v}" ${v == value ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
      return `<label class="tp-field"><span>${label}<output>${value}</output></span><input type="range" name="${key}" min="${a}" max="${b}" step="${step}" value="${value}"></label>`;
    }).join("") || `<p class="tp-empty">Esta pieza no tiene parámetros.</p>`;

    const file = `${def.n}-${def.id}.js`;
    const code = () => {
      const changed = Object.fromEntries(Object.entries(values).filter(([k, v]) => v !== LST.defaults(def)[k]));
      const opts = Object.keys(changed).length ? ", " + JSON.stringify(changed).replace(/"(\w+)":/g, " $1: ").replace(/}$/, " }") : "";
      return `<link rel="stylesheet" href="core/logo.css">
<link rel="stylesheet" href="core/kit.css">

<div id="marca" style="height: ${def.scroll ? "auto" : "70vh"}"></div>

<script src="gsap.min.js"><\/script>${def.scroll ? `\n<script src="ScrollTrigger.min.js"><\/script>` : ""}
<script src="core/logo-data.js"><\/script>
<script src="core/logo.js"><\/script>
<script src="core/kit.js"><\/script>
<script src="effects/${file}"><\/script>
<script>
  const anim = LoopSmithType.mount("${def.id}", document.querySelector("#marca")${opts});
  anim.play();      // pause() · reset() · destroy()
<\/script>`;
    };

    let inst, timer;
    const mount = () => {
      inst && inst.destroy();
      inst = LST.mount(def.id, stage, { ...values, ...(def.scroll ? { scroller: stage } : {}) });
      $("#d-code").textContent = code();
      clearTimeout(timer); timer = setTimeout(() => inst.play(), 450);
    };
    const form = $("#d-controls");
    form.addEventListener("input", (e) => {
      const el = e.target, v = el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value;
      values[el.name] = v;
      if (el.type === "range") el.previousElementSibling.lastChild.textContent = v;
      clearTimeout(form._t); form._t = setTimeout(mount, 180);   // remonta: destroy() limpia todo lo anterior
    });
    form.addEventListener("reset", () => setTimeout(() => {
      Object.assign(values, LST.defaults(def));
      form.querySelectorAll("output").forEach((o) => (o.textContent = o.parentElement.nextElementSibling.value));
      mount();
    }));
    $("#b-play").onclick = () => inst.play();
    $("#b-pause").onclick = () => inst.pause();
    $("#b-reset").onclick = () => inst.reset();
    $("#b-copy").onclick = (e) => navigator.clipboard.writeText(code()).then(() => { e.target.textContent = "Copiado"; setTimeout(() => (e.target.textContent = "Copiar"), 1400); });
    mount();
  }

  /* ------------------------------------------- Página completa (scroll real) */
  function full(def) {
    document.body.classList.add("tp-full");
    document.body.querySelectorAll("body > :not(.lib-back)").forEach((n) => n.remove());
    const back = $(".lib-back"); back.href = `?demo=${def.id}`; back.querySelector("b").textContent = "Volver"; back.querySelector("small").textContent = def.name;
    const host = document.createElement("div");
    document.body.prepend(host);
    LST.mount(def.id, host, LST.defaults(def));
  }

  const def = demoId && LST.demos[demoId];
  if (def && params.has("full") && def.scroll) full(def);
  else if (def) detail(def);
  else collection();
})();
