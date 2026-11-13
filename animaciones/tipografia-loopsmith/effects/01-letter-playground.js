/* 01 · Letter Playground — arrastre con peso, inercia y vuelta al logo. */
(() => {
  const LST = window.LoopSmithType, { clamp, bodies, drag } = LST.kit;
  LST.register({
    id: "letter-playground", n: "01", group: "A", name: "Letter Playground", hint: ["drag"],
    lead: "Agarrá cualquier letra, arrastrala y soltala. Pesa, conserva la inercia, se inclina con la velocidad y vuelve sola a su lugar.",
    fields: [["weight", "Peso", 1, .4, 2.5, .1], ["rest", "Espera antes de volver (s)", 1.1, 0, 4, .1], ["bounds", "Rebotar en los bordes", true]],
    tech: "Cada pieza sigue al puntero con un resorte subamortiguado (la masa retrasa la respuesta). Al soltar conserva su velocidad con fricción y, tras la espera, un segundo resorte la devuelve. La simulación se duerme en reposo.",
    mobile: "Pointer Events con touch-action: none sobre cada letra: el arrastre funciona igual con el dedo.",
    mount(host, o) {
      const B = LST.base(host, o), sim = bodies(B);
      sim.list.forEach((b) => (b.free = 99));
      drag(B, B.parts, {
        start(k) { const b = sim.list[k]; b.held = true; b.ox = b.tx = b.x; b.oy = b.ty = b.y; sim.wake(); },
        move(k, dx, dy) { const b = sim.list[k]; b.tx = b.ox + dx; b.ty = b.oy + dy; },
        end(k) { const b = sim.list[k]; b.held = false; b.free = 0; },
      });
      sim.run((dt, list) => {
        let alive = false;
        const m = o.weight, hw = B.W / 2, hh = B.H / 2;
        for (const b of list) {
          if (b.held) {
            // Resorte hacia el puntero: más masa = más retraso y más sobrepaso.
            b.vx += ((b.tx - b.x) * 220 / m - b.vx * 22 / Math.sqrt(m)) * dt;
            b.vy += ((b.ty - b.y) * 220 / m - b.vy * 22 / Math.sqrt(m)) * dt;
          } else if ((b.free += dt) > o.rest) {
            b.vx += (-b.x * 70 - b.vx * 10) * dt; b.vy += (-b.y * 70 - b.vy * 10) * dt; // vuelta elegante
          } else {
            const f = Math.exp(-1.7 * dt / m); b.vx *= f; b.vy *= f;                   // inercia con fricción
          }
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (o.bounds && !b.held) {
            const lx = hw - b.w / 2, ly = hh - b.h / 2, ax = b.cx + b.x, ay = b.cy + b.y;
            if (Math.abs(ax) > lx) { b.x = Math.sign(ax) * lx - b.cx; b.vx *= -.55; }
            if (Math.abs(ay) > ly) { b.y = Math.sign(ay) * ly - b.cy; b.vy *= -.55; }
          }
          const tilt = clamp(b.vx * .035, -28, 28);                                     // se inclina con la velocidad
          b.vr += ((tilt - b.r) * 120 - b.vr * 14) * dt; b.r += b.vr * dt;
          if (b.held || Math.abs(b.x) + Math.abs(b.y) > .3 || Math.abs(b.vx) + Math.abs(b.vy) > 4 || Math.abs(b.r) > .2) alive = true;
        }
        if (!alive) list.forEach((b) => (b.x = b.y = b.r = b.vx = b.vy = b.vr = 0));
        return alive;
      });
      return B.api({
        /** Demo: lanza las letras como si alguien las hubiera tirado. */
        play() { sim.list.forEach((b, i) => { b.free = 0; b.vx = Math.sin(i * 2.4) * 900; b.vy = -500 - Math.cos(i * 1.7) * 500; }); sim.wake(); },
        pause() { sim.sleep(); },
        reset() { sim.home(); },
      });
    },
  });
})();
