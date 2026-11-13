/**
 * Kit compartido por las 30 animaciones: registro, ciclo de vida, ajuste de
 * tamaño, puntero, arrastre, cuerpos con física, poses por scroll y escenas
 * de scroll aisladas. Depende de gsap (+ ScrollTrigger para las de scroll).
 *
 *   const anim = LoopSmithType.mount("magnetic-letters", contenedor, { radius: 220 });
 *   anim.play(); anim.pause(); anim.reset(); anim.destroy();
 */
(() => {
  const LST = (window.LoopSmithType = window.LoopSmithType || {});
  const gsap = window.gsap;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  /** Progreso local 0..1 de p dentro del tramo [a, b]. */
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  /** Aleatorio determinista (mulberry32): las composiciones no saltan al refrescar. */
  const rand = (seed = 1) => () => { let t = (seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* Ciclo de vida: todo lo que una animación abre se cierra en kill(). ------ */
  function scope() {
    const ac = new AbortController(), ticks = new Set(), kept = [], undo = [];
    return {
      on(target, type, fn, opts) { target.addEventListener(type, fn, { ...opts, signal: ac.signal }); },
      tick(fn) { gsap.ticker.add(fn); ticks.add(fn); return () => { gsap.ticker.remove(fn); ticks.delete(fn); }; },
      keep(x) { kept.push(x); return x; },          // tweens, timelines, ScrollTriggers, observers
      onKill(fn) { undo.push(fn); },
      kill() {
        ac.abort();
        ticks.forEach((f) => gsap.ticker.remove(f)); ticks.clear();
        kept.forEach((k) => (k.kill ? k.kill() : k.disconnect && k.disconnect()));
        undo.reverse().forEach((f) => f());
        kept.length = undo.length = 0;
      },
    };
  }

  /* Poses: interpola entre composiciones de las piezas según un progreso 0..1.
     Cada stop: { at, pose: (i, env) => ({x,y,r,s,o}) | null (logo), ease, stagger } */
  function track(stops, n) {
    const Z = { x: 0, y: 0, r: 0, s: 1, o: 1 }, keys = Object.keys(Z);
    const out = Array.from({ length: n }, () => ({ ...Z }));
    const eases = stops.map((s) => gsap.parseEase(s.ease || "power2.inOut"));
    let cache = [];
    return {
      measure(env) { cache = stops.map((s) => out.map((_, i) => ({ ...Z, ...(s.pose ? s.pose(i, env) : null) }))); },
      at(p) {
        let k = 0;
        while (k < stops.length - 2 && p >= stops[k + 1].at) k++;
        const a = stops[k], b = stops[k + 1], raw = clamp((p - a.at) / (b.at - a.at)), sg = b.stagger || 0;
        for (let i = 0; i < n; i++) {
          const t = eases[k + 1](clamp(raw * (1 + sg) - sg * (i / (n - 1 || 1))));
          for (const key of keys) out[i][key] = lerp(cache[k][i][key], cache[k + 1][i][key], t);
        }
        return out;
      },
    };
  }
  const applyPose = (parts, pose) => parts.forEach((el, i) => { const q = pose[i]; gsap.set(el, { x: q.x, y: q.y, rotation: q.r, scale: q.s, opacity: q.o }); });

  /* Base de toda animación: raíz .lst + logo + ajuste de tamaño + limpieza. -- */
  LST.base = (host, o = {}, cfg = {}) => {
    const s = scope(), sc = cfg.scroll;
    const root = h("div", "lst" + (sc ? " lst--scroll" : "") + (cfg.className ? " " + cfg.className : ""));
    host.append(root);
    s.onKill(() => root.remove());

    let stage = root, track_, scroller = null, phaseEl = null;
    if (sc) {
      scroller = o.scroller || window;
      const vh = () => (scroller === window ? innerHeight : scroller.clientHeight);
      const setVh = () => root.style.setProperty("--lst-vh", vh() + "px");
      setVh();
      if (sc.before) root.append(h("section", "lst-panel", sc.before));
      track_ = h("div", "lst-track"); track_.style.setProperty("--len", sc.length || 4);
      stage = h("div", "lst-sticky"); track_.append(stage); root.append(track_);
      if (sc.after) root.append(h("section", "lst-panel lst-panel--after", sc.after));
      if (sc.phases) { phaseEl = h("div", "lst-phase", "<b></b><span></span><i></i>"); stage.append(phaseEl); }
      s.on(window, "resize", setVh);
    }

    const logo = LST.createLogo(stage, { variant: cfg.variant || o.variant || "lockup", tone: o.tone });
    const resizeFns = [];
    const B = {
      s, root, stage, logo, parts: logo.parts, letters: logo.letters, n: logo.parts.length, scroller, track: track_,
      W: 0, H: 0,
      /** Centro de la pieza i relativo al centro del logo (px). */
      c(i) { const g = logo.geom[i], f = logo.px; return { x: (g.x + g.w / 2 - logo.width / 2) * f, y: (g.y + g.h / 2 - .5) * f, w: g.w * f, h: g.h * f }; },
      /** Offset para llevar el centro de la pieza i al punto (X, Y) medido desde el centro del escenario. */
      to(i, X, Y) { const c = B.c(i); return { x: X - c.x, y: Y - c.y }; },
      onResize(fn) { resizeFns.push(fn); },
      fit() {
        const w = stage.clientWidth, hh = stage.clientHeight;
        if (!w || (w === B.W && hh === B.H)) return;
        B.W = w; B.H = hh;
        logo.setSize(Math.max(8, Math.min((B.W * (cfg.fit || .7)) / logo.width, B.H * (cfg.fitH || .34))));
        resizeFns.forEach((fn) => fn());
      },
      api(extra = {}) { return { play() {}, pause() {}, reset() { logo.restore(.7); }, ...extra, destroy: s.kill }; },
    };
    // El ajuste va en el frame siguiente: medir y escribir dentro del observer genera bucles de layout.
    let raf = 0;
    const ro = s.keep(new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(B.fit); }));
    ro.observe(stage);
    s.onKill(() => cancelAnimationFrame(raf));
    B.fit();

    /* Escena de scroll: un progreso 0..1 atado al tramo .lst-track, sin pin
       (el anclaje es position: sticky) y con su propio scroller. */
    if (sc) B.scrollScene = (draw, { scrub = .6 } = {}) => {
      const ST = window.ScrollTrigger; gsap.registerPlugin(ST);
      const state = { p: 0 };
      const paint = () => {
        draw(state.p);
        if (phaseEl) {
          const k = Math.min(sc.phases.length - 1, sc.phases.findLastIndex(([at]) => state.p >= at));
          phaseEl.children[0].textContent = String(Math.max(0, k) + 1).padStart(2, "0");
          phaseEl.children[1].textContent = sc.phases[Math.max(0, k)][1];
          phaseEl.children[2].style.transform = `scaleX(${state.p})`;
        }
      };
      const tween = s.keep(gsap.to(state, { p: 1, ease: "none", paused: true, onUpdate: paint }));
      const st = s.keep(ST.create({ trigger: track_, scroller, start: "top top", end: "bottom bottom", scrub, animation: tween, invalidateOnRefresh: true }));
      B.onResize(() => { st.refresh(); paint(); });
      paint();
      const pos = () => (scroller === window ? scrollY : scroller.scrollTop);
      const go = (y) => (scroller === window ? scrollTo(0, y) : (scroller.scrollTop = y));
      const max = () => (scroller === window ? document.documentElement.scrollHeight - innerHeight : scroller.scrollHeight - scroller.clientHeight);
      let auto;
      const stop = () => auto && auto.kill();
      ["wheel", "touchstart", "pointerdown", "keydown"].forEach((t) => s.on(scroller, t, stop, { passive: true }));
      s.onKill(stop);
      return {
        st,
        /** Recorre la escena sola, ida y vuelta (preview y botón Replay). */
        play() { stop(); const v = { y: 0 }; go(0); auto = gsap.to(v, { y: max(), duration: (sc.length || 4) * 1.5, ease: "power1.inOut", delay: .3, yoyo: true, repeat: 1, repeatDelay: .7, onUpdate: () => go(v.y) }); },
        pause() { stop(); },
        reset() { stop(); go(0); },
        pos,
      };
    };
    return B;
  };

  /* Cuerpos: estado físico por pieza (offset respecto del logo en reposo). --- */
  function bodies(B) {
    const list = B.parts.map((el, i) => ({ el, i, x: 0, y: 0, r: 0, sx: 1, sy: 1, vx: 0, vy: 0, vr: 0, cx: 0, cy: 0, w: 0, h: 0, held: false }));
    const measure = () => list.forEach((b) => { const c = B.c(b.i); b.cx = c.x; b.cy = c.y; b.w = c.w; b.h = c.h; });
    const apply = () => list.forEach((b) => gsap.set(b.el, { x: b.x, y: b.y, rotation: b.r, scaleX: b.sx, scaleY: b.sy }));
    let step = null, awake = false, homing = null;
    const frame = (_t, dms) => { const alive = step(Math.min(dms || 16, 34) / 1000, list); api.apply(); if (alive === false) api.sleep(); };
    const api = {
      list, measure, apply,
      /** fn(dt, lista) corre por frame; si devuelve false el sistema se duerme (no gasta CPU en reposo). */
      run(fn) { step = fn; api.wake(); },
      wake() { if (homing) { homing.kill(); homing = null; } if (!awake && step) { awake = true; gsap.ticker.add(frame); } },
      sleep() { if (awake) { awake = false; gsap.ticker.remove(frame); } },
      /** Vuelve todo al logo con un tween (corta la simulación). */
      home(vars = {}) {
        api.sleep(); if (homing) homing.kill();
        list.forEach((b) => { b.vx = b.vy = b.vr = 0; b.held = false; b.r = ((b.r % 360) + 540) % 360 - 180; });
        homing = gsap.to(list, { x: 0, y: 0, r: 0, sx: 1, sy: 1, duration: .9, ease: "elastic.out(1, .75)", stagger: .025, onUpdate: () => api.apply(), ...vars });
        return homing;
      },
    };
    measure(); B.onResize(measure);
    B.s.onKill(() => { api.sleep(); if (homing) homing.kill(); gsap.killTweensOf(list); });
    return api;
  }

  /* Puntero relativo al centro del escenario, con velocidad suavizada. ------ */
  function pointer(B, target = B.stage) {
    const p = { x: 0, y: 0, vx: 0, vy: 0, inside: false, down: false, t: 0, onMove: null };
    const read = (e) => {
      const r = B.stage.getBoundingClientRect(), now = performance.now(), dt = Math.max(1, now - p.t);
      const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      if (p.inside && dt < 120) { p.vx = lerp(p.vx, ((x - p.x) / dt) * 1000, .5); p.vy = lerp(p.vy, ((y - p.y) / dt) * 1000, .5); }
      p.x = x; p.y = y; p.t = now; p.inside = true;
      p.onMove && p.onMove(e);
    };
    B.s.on(target, "pointermove", read);
    B.s.on(target, "pointerdown", (e) => { p.down = true; read(e); });
    B.s.on(window, "pointerup", () => (p.down = false));
    B.s.on(target, "pointerleave", () => { p.inside = false; p.vx = p.vy = 0; p.onLeave && p.onLeave(); });
    B.s.on(target, "pointercancel", () => { p.inside = false; p.down = false; });
    return p;
  }

  /* Arrastre por pieza (mouse + touch) con velocidad al soltar. ------------- */
  function drag(B, els, { start, move, end }) {
    B.logo.el.classList.add("lsl--drag");
    els.forEach((el, k) => B.s.on(el, "pointerdown", (e) => {
      if (e.button) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId); el.classList.add("is-held");
      const x0 = e.clientX, y0 = e.clientY;
      let lx = x0, ly = y0, lt = performance.now(), vx = 0, vy = 0;
      start && start(k, e);
      const onMove = (ev) => {
        const now = performance.now(), dt = Math.max(1, now - lt);
        vx = lerp(vx, ((ev.clientX - lx) / dt) * 1000, .6); vy = lerp(vy, ((ev.clientY - ly) / dt) * 1000, .6);
        lx = ev.clientX; ly = ev.clientY; lt = now;
        move && move(k, ev.clientX - x0, ev.clientY - y0, ev);
      };
      const onUp = () => {
        el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerup", onUp); el.removeEventListener("pointercancel", onUp);
        el.classList.remove("is-held");
        if (performance.now() - lt > 90) vx = vy = 0; // soltó quieto
        end && end(k, vx, vy);
      };
      el.addEventListener("pointermove", onMove); el.addEventListener("pointerup", onUp); el.addEventListener("pointercancel", onUp);
    }));
  }

  /* Registro ---------------------------------------------------------------- */
  LST.demos = LST.demos || {};
  LST.order = LST.order || [];
  /** def: { id, n, group, name, lead, hint[], fields[], tech, mobile, mount(host, opts) } */
  LST.register = (def) => { LST.demos[def.id] = def; LST.order.push(def.id); };
  LST.defaults = (def) => Object.fromEntries((def.fields || []).map(([key, , value]) => [key, value]));
  LST.mount = (id, host, opts = {}) => {
    const def = LST.demos[id];
    if (!def) throw new Error(`LoopSmithType: no existe la animación "${id}"`);
    const o = { ...LST.defaults(def), ...opts };
    if (!gsap || (reduced() && !o.force)) {
      // Movimiento reducido o sin GSAP: el logo completo y quieto.
      const root = h("div", "lst"); host.append(root);
      const logo = LST.createLogo(root, { variant: o.variant, tone: o.tone });
      const size = () => logo.setSize(Math.max(8, Math.min((root.clientWidth * .7) / logo.width, root.clientHeight * .34)));
      const ro = new ResizeObserver(size); ro.observe(root); size();
      return { static: true, play() {}, pause() {}, reset() {}, destroy() { ro.disconnect(); root.remove(); } };
    }
    return def.mount(host, o);
  };

  LST.kit = { gsap, clamp, lerp, seg, h, rand, reduced, scope, track, applyPose, bodies, pointer, drag };
})();
