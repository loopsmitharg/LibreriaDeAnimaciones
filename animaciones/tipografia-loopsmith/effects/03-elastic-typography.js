/* 03 · Elastic Typography — letras unidas por resortes. */
(() => {
  const LST = window.LoopSmithType, { clamp, bodies, drag } = LST.kit;
  LST.register({
    id: "elastic-typography", n: "03", group: "A", name: "Elastic Typography", hint: ["drag"],
    lead: "Las letras están atadas entre sí. Tirá de una: las vecinas la siguen con retraso y la palabra oscila hasta recuperar el equilibrio.",
    fields: [["stiffness", "Elasticidad", 120, 40, 300, 5], ["coupling", "Contagio a vecinas", .55, 0, 1, .05], ["damping", "Amortiguación", 6, 2, 20, .5]],
    tech: "Cadena de masas: cada letra tiene un resorte a su lugar y otro a cada vecina. Integración semi-implícita con dos subpasos por frame para que no explote con resortes duros.",
    mobile: "Arrastre táctil por letra. La cadena responde igual.",
    mount(host, o) {
      const B = LST.base(host, o), sim = bodies(B), n = sim.list.length;
      drag(B, B.parts, {
        start(k) { const b = sim.list[k]; b.held = true; b.ox = b.x; b.oy = b.y; b.vx = b.vy = 0; sim.wake(); },
        move(k, dx, dy) { const b = sim.list[k]; b.x = b.ox + dx; b.y = b.oy + dy; },
        end(k, vx, vy) { const b = sim.list[k]; b.held = false; b.vx = vx * .4; b.vy = vy * .4; },
      });
      sim.run((dt, list) => {
        const kh = o.stiffness, kc = o.coupling * kh * 1.5, h = dt / 2;
        let alive = false;
        for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
          const b = list[i]; if (b.held) continue;
          const a = list[i - 1], c = list[i + 1];
          let fx = -kh * b.x - o.damping * b.vx, fy = -kh * b.y - o.damping * b.vy;
          if (a) { fx += kc * (a.x - b.x); fy += kc * (a.y - b.y); }
          if (c) { fx += kc * (c.x - b.x); fy += kc * (c.y - b.y); }
          b.vx += fx * h; b.vy += fy * h; b.x += b.vx * h; b.y += b.vy * h;
        }
        for (const b of list) {
          b.r += (clamp(b.vx * .03, -22, 22) - b.r) * Math.min(1, 10 * dt);
          if (b.held || Math.abs(b.x) + Math.abs(b.y) > .2 || Math.abs(b.vx) + Math.abs(b.vy) > 3) alive = true;
        }
        if (!alive) list.forEach((b) => (b.x = b.y = b.r = b.vx = b.vy = 0));
        return alive;
      });
      return B.api({
        /** Demo: pulsa la palabra como una cuerda. */
        play() { const b = sim.list[Math.floor(n / 2)]; b.vy = -B.logo.px * 22; b.vx = B.logo.px * 6; sim.wake(); },
        pause() { sim.sleep(); },
        reset() { sim.home({ duration: .5, ease: "power3.out", stagger: 0 }); },
      });
    },
  });
})();
