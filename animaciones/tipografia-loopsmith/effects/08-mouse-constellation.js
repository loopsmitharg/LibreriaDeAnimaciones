/* 08 · Mouse Constellation — las letras flotan y el cursor altera su equilibrio. */
(() => {
  const LST = window.LoopSmithType, { h, bodies, pointer, rand } = LST.kit;
  LST.register({
    id: "mouse-constellation", n: "08", group: "A", name: "Mouse Constellation", hint: ["hover"],
    lead: "Al entrar, las letras se sueltan del wordmark y quedan suspendidas como una constelación. El cursor las empuja; al salir, vuelven a formar el logo.",
    fields: [["radius", "Radio de empuje (em)", 1.5, .5, 3, .1], ["drift", "Deriva", 1, 0, 2.5, .1]],
    tech: "Resorte blando y subamortiguado hacia un ancla flotante por letra, más una fuerza de repulsión del cursor. Un trazo SVG une las letras en orden de lectura y se desvanece al rearmarse.",
    mobile: "Tocar suelta las letras; levantar el dedo las reúne.",
    mount(host, o) {
      const B = LST.base(host, o), sim = bodies(B), p = pointer(B), n = sim.list.length;
      const svg = h("div", "lst-constellation", `<svg><polyline fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`);
      B.stage.prepend(svg);
      const line = svg.querySelector("polyline");
      let loose = false, forced = false, time = 0, timer;
      const place = () => {
        const rnd = rand(11);
        sim.list.forEach((b, i) => {
          const X = (i / (n - 1) - .5) * B.W * .78 + (rnd() - .5) * B.W * .06, Y = (rnd() - .5) * B.H * .56;
          b.ax = X - b.cx; b.ay = Y - b.cy; b.ar = (rnd() - .5) * 44; b.ph = rnd() * 6.28; b.w0 = .5 + rnd() * .6;
        });
      };
      place(); B.onResize(place);
      p.onMove = sim.wake; p.onLeave = sim.wake;
      sim.run((dt, list) => {
        time += dt; loose = p.inside || forced;
        const R = o.radius * B.logo.px, d0 = B.logo.px * .1 * o.drift;
        let alive = loose, spread = 0, pts = "";
        for (const b of list) {
          const gx = loose ? b.ax + Math.sin(time * b.w0 + b.ph) * d0 : 0, gy = loose ? b.ay + Math.cos(time * b.w0 * .8 + b.ph) * d0 : 0;
          let fx = (gx - b.x) * 22 - b.vx * 5.5, fy = (gy - b.y) * 22 - b.vy * 5.5;
          if (p.inside) { // el cursor es una fuerza, no un imán de posición
            const dx = b.cx + b.x - p.x, dy = b.cy + b.y - p.y, d = Math.hypot(dx, dy) || 1;
            if (d < R) { const k = (1 - d / R) ** 2 * 5200; fx += (dx / d) * k; fy += (dy / d) * k; }
          }
          b.vx += fx * dt; b.vy += fy * dt; b.x += b.vx * dt; b.y += b.vy * dt;
          b.r += ((loose ? b.ar : 0) - b.r) * Math.min(1, 3 * dt);
          spread += Math.abs(b.x) + Math.abs(b.y);
          pts += `${(B.W / 2 + b.cx + b.x).toFixed(1)},${(B.H / 2 + b.cy + b.y).toFixed(1)} `;
          if (Math.abs(b.x) + Math.abs(b.y) > .3 || Math.abs(b.vx) + Math.abs(b.vy) > 3) alive = true;
        }
        line.setAttribute("points", pts);
        svg.style.opacity = Math.min(.5, spread / n / (B.W * .25));
        if (!alive) { list.forEach((b) => (b.x = b.y = b.r = b.vx = b.vy = 0)); svg.style.opacity = 0; }
        return alive;
      });
      B.s.onKill(() => clearTimeout(timer));
      return B.api({
        play() { forced = true; sim.wake(); clearTimeout(timer); timer = setTimeout(() => (forced = false), 3600); },
        pause() { sim.sleep(); },
        reset() { forced = false; clearTimeout(timer); svg.style.opacity = 0; sim.home(); },
      });
    },
  });
})();
