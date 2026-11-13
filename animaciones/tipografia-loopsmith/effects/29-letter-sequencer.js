/* 29 · Interactive Letter Sequencer — una caja de ritmos para coreografiar el logo. */
(() => {
  const LST = window.LoopSmithType, { gsap, h } = LST.kit;
  // Cada movimiento usa propiedades distintas: se pueden superponer sin pisarse.
  const MOVES = [
    ["Salto", (el, f, k, d) => gsap.timeline().to(el, { y: -f * .26 * k, duration: d * .45, ease: "power2.out", overwrite: "auto" }).to(el, { y: 0, duration: d * .9, ease: "bounce.out" })],
    ["Giro", (el, f, k, d) => gsap.fromTo(el, { rotation: 0 }, { rotation: 360, duration: d * 1.6, ease: "power3.inOut", overwrite: "auto" })],
    ["Pulso", (el, f, k, d) => gsap.fromTo(el, { scale: 1 + .32 * k }, { scale: 1, duration: d * 1.8, ease: "elastic.out(1, .4)", overwrite: "auto" })],
    ["Desliz", (el, f, k, d) => gsap.timeline().to(el, { x: f * .16 * k, skewX: -16 * k, duration: d * .4, ease: "power2.out", overwrite: "auto" }).to(el, { x: 0, skewX: 0, duration: d * 1.2, ease: "elastic.out(1, .5)" })],
  ];
  const PRESET = ["x...x...", "..x.....", ".x.x.x.x", "......x."];
  LST.register({
    id: "letter-sequencer", n: "29", group: "D", name: "Interactive Letter Sequencer", hint: ["click"],
    lead: "Cuatro movimientos, ocho pasos. Encendé casillas para escribir un patrón: en cada paso activo, el movimiento recorre la palabra como una ola sincronizada con el tempo.",
    fields: [["bpm", "Tempo (BPM)", 96, 50, 160, 2], ["spread", "Propagación por la palabra", .7, 0, 1.5, .05], ["intensity", "Intensidad", 1, .4, 1.8, .05], ["autoplay", "Reproducir al montar", true]],
    tech: "Un reloj con delayedCall dispara cada paso. Los movimientos animan propiedades disjuntas (y, rotation, scale, x+skew), así cualquier combinación de filas coexiste. Al detener, las piezas terminan su gesto y quedan en reposo.",
    mobile: "La grilla de pasos se toca con el dedo; ocupa el pie del escenario.",
    mount(host, o) {
      const B = LST.base(host, o, { fitH: .2, className: "lst--ui" });
      const grid = PRESET.map((row) => [...row].map((c) => c === "x"));
      const ui = h("div", "lst-seq", `<div class="lst-seq__bar"><button type="button" data-act="toggle">Iniciar</button><button type="button" data-act="clear">Vaciar</button><button type="button" data-act="preset">Patrón base</button></div>` +
        MOVES.map(([name], r) => `<div class="lst-seq__row"><span>${name}</span>${grid[r].map((_, c) => `<button type="button" data-r="${r}" data-c="${c}" aria-label="${name}, paso ${c + 1}"></button>`).join("")}</div>`).join(""));
      B.stage.append(ui);
      const cells = [...ui.querySelectorAll("[data-r]")], toggleBtn = ui.querySelector('[data-act="toggle"]');
      const paint = () => cells.forEach((b) => b.setAttribute("aria-pressed", String(grid[b.dataset.r][b.dataset.c])));
      let step = -1, clock = null;
      const tick = () => {
        step = (step + 1) % 8;
        const d = 60 / o.bpm / 2;   // corcheas
        cells.forEach((b) => b.classList.toggle("is-now", +b.dataset.c === step));
        MOVES.forEach(([, fire], r) => grid[r][step] && B.parts.forEach((el, i) => gsap.delayedCall((i / B.n) * d * o.spread, fire, [el, B.logo.px, o.intensity, d * 2])));
        clock = gsap.delayedCall(d, tick);
      };
      const stop = () => { clock && clock.kill(); clock = null; step = -1; cells.forEach((b) => b.classList.remove("is-now")); toggleBtn.textContent = "Iniciar"; };
      const play = () => { if (!clock) { toggleBtn.textContent = "Detener"; tick(); } };
      const set = (rows) => { rows.forEach((row, r) => [...row].forEach((c, k) => (grid[r][k] = c === "x"))); paint(); };
      B.s.on(ui, "click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.r) { grid[b.dataset.r][b.dataset.c] = !grid[b.dataset.r][b.dataset.c]; paint(); }
        else if (b.dataset.act === "toggle") clock ? stop() : play();
        else set(b.dataset.act === "clear" ? ["........", "........", "........", "........"] : PRESET);
      });
      paint();
      B.s.onKill(() => { stop(); MOVES.forEach(([, fire]) => gsap.killTweensOf(fire)); gsap.killTweensOf(B.parts); });
      if (o.autoplay) play();
      return B.api({ play, pause: stop, reset() { stop(); set(PRESET); B.logo.restore(.5); } });
    },
  });
})();
