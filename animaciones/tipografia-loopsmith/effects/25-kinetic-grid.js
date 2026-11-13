/* 25 · Kinetic Grid — las letras viven en una grilla que se reordena y vuelve a ser logo. */
(() => {
  const LST = window.LoopSmithType, { h, bodies, pointer } = LST.kit;
  LST.register({
    id: "kinetic-grid", n: "25", group: "D", name: "Kinetic Grid", hint: ["hover", "click"],
    lead: "Cada pieza ocupa una celda. La que está bajo el cursor crece y las vecinas se inclinan hacia él. Cada clic baraja la grilla; al tercero, las celdas se disuelven y la grilla se reorganiza en el logo.",
    fields: [["focus", "Crecimiento bajo el cursor", .45, 0, 1, .05], ["speed", "Velocidad de reacomodo", 7, 2, 16, .5], ["cycle", "Clics hasta rearmar el logo", 3, 1, 6, 1]],
    tech: "Cada estado es solo un destino por pieza (celda o lugar en el logo); un suavizado exponencial lleva la posición, la escala y el giro. Cambiar de estado es cambiar destinos: la transición sale sola y se puede interrumpir.",
    mobile: "La grilla pasa a 2 columnas en vertical. Tocar baraja.",
    mount(host, o) {
      const B = LST.base(host, o), sim = bodies(B), p = pointer(B), n = B.n;
      const lines = h("div", "lst-gridlines");
      B.stage.prepend(lines);
      let slots = sim.list.map((_, i) => i), mode = "grid", clicks = 0, cols = 5, rows = 2;
      const layout = () => {
        cols = B.W > B.H * 1.15 ? 5 : 2; rows = Math.ceil(n / cols);
        lines.style.cssText = `grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)`;
        lines.innerHTML = "<i></i>".repeat(cols * rows);
      };
      layout(); B.onResize(layout);
      const shuffle = () => { for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; } };
      const next = () => {
        if (mode === "logo") { mode = "grid"; clicks = 0; shuffle(); }
        else if (++clicks >= o.cycle) mode = "logo";
        else shuffle();
        lines.style.opacity = mode === "grid" ? 1 : 0;
        sim.wake();
      };
      B.s.on(B.stage, "click", next);
      p.onMove = sim.wake; p.onLeave = sim.wake;
      sim.run((dt, list) => {
        const gw = B.W * .9, gh = B.H * .82, cw = gw / cols, ch = gh / rows, a = 1 - Math.exp(-o.speed * dt);
        let alive = p.inside;
        list.forEach((b, i) => {
          let tx = 0, ty = 0, ts = 1, tr = 0;
          if (mode === "grid") {
            const s = slots[i], X = ((s % cols) + .5) * cw - gw / 2, Y = (Math.floor(s / cols) + .5) * ch - gh / 2;
            tx = X - b.cx; ty = Y - b.cy; ts = Math.min((cw * .42) / b.w, (ch * .46) / b.h, 3);
            if (p.inside) {
              const dx = p.x - X, dy = p.y - Y, d = Math.hypot(dx / cw, dy / ch);
              const f = Math.max(0, 1 - d / 1.6);
              ts *= 1 + f * f * o.focus; tr = (dx / cw) * 9 * f; tx += dx * .06 * f; ty += dy * .06 * f;   // se inclina y se asoma hacia el cursor
            }
          }
          b.x += (tx - b.x) * a; b.y += (ty - b.y) * a; b.r += (tr - b.r) * a; b.sx = b.sy += (ts - b.sx) * a;
          if (Math.abs(tx - b.x) + Math.abs(ty - b.y) > .2 || Math.abs(ts - b.sx) > .002) alive = true;
        });
        if (!alive && mode === "logo") list.forEach((b) => { b.x = b.y = b.r = 0; b.sx = b.sy = 1; });
        return alive;
      });
      return B.api({
        play: next,
        pause() { sim.sleep(); },
        reset() { mode = "logo"; clicks = 0; lines.style.opacity = 0; sim.wake(); },
      });
    },
  });
})();
