/* 23 · Typography Physics Lab — un banco de pruebas con fuerzas configurables. */
(() => {
  const LST = window.LoopSmithType, { h, bodies, drag } = LST.kit;
  const DIRS = { up: [0, -1, "↑"], left: [-1, 0, "←"], none: [0, 0, "○"], right: [1, 0, "→"], down: [0, 1, "↓"] };
  LST.register({
    id: "physics-lab", n: "23", group: "D", name: "Typography Physics Lab", previewReset: true, hint: ["drag", "click"],
    lead: "Las letras son cuerpos. Arrastralas, usá una para empujar a las demás, cambiá la dirección de la gravedad o apagala. «Reorganizar» las devuelve a la palabra.",
    fields: [["gravity", "Gravedad", 1, 0, 2.5, .05], ["bounce", "Rebote", .45, 0, .9, .05], ["friction", "Fricción del aire", .6, 0, 3, .1]],
    tech: "Simulación propia y liviana: círculos envolventes, colisión par a par con intercambio de impulso, rebote contra los bordes y giro inducido por el roce. La letra agarrada pesa infinito, por eso empuja.",
    mobile: "Arrastre táctil. Los botones de gravedad quedan al pie del escenario.",
    mount(host, o) {
      const B = LST.base(host, o, { fitH: .24 }), sim = bodies(B), L = sim.list;
      let g = [0, 0], free = false, calm = 0;
      const pad = h("div", "lst-pad", Object.entries(DIRS).map(([k, d]) => `<button type="button" data-g="${k}" aria-label="Gravedad ${k}">${d[2]}</button>`).join("") + `<button type="button" data-act="home">Reorganizar</button>`);
      B.stage.append(pad);
      const mark = (k) => pad.querySelectorAll("[data-g]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.g === k)));
      const release = (k) => { g = DIRS[k]; free = true; calm = 0; mark(k); L.forEach((b) => { if (!b.vx && !b.vy) { b.vx = (Math.random() - .5) * 60; b.vr = (Math.random() - .5) * 90; } }); sim.wake(); };
      const home = () => { free = false; mark(""); sim.home(); };
      B.s.on(pad, "click", (e) => { const b = e.target.closest("button"); if (!b) return; b.dataset.act ? home() : release(b.dataset.g); });
      drag(B, B.parts, {
        start(k) { const b = L[k]; b.held = true; b.ox = b.x; b.oy = b.y; b.px = b.x; b.py = b.y; if (!free) { free = true; mark("none"); g = DIRS.none; } calm = 0; sim.wake(); },
        move(k, dx, dy) { const b = L[k]; b.tx = b.ox + dx; b.ty = b.oy + dy; },
        end(k, vx, vy) { const b = L[k]; b.held = false; b.vx = vx; b.vy = vy; },
      });
      sim.run((dt, list) => {
        if (!free) return false;
        const G = 2400 * o.gravity * (B.logo.px / 80), air = Math.exp(-o.friction * dt), hw = B.W / 2, hh = B.H / 2;
        let energy = 0;
        for (const b of list) {
          b.rad = (b.w + b.h) / 4 * 1.05;
          if (b.held) { b.vx = (b.tx - b.x) / dt * .6; b.vy = (b.ty - b.y) / dt * .6; b.x = b.tx ?? b.x; b.y = b.ty ?? b.y; continue; }
          b.vx = (b.vx + g[0] * G * dt) * air; b.vy = (b.vy + g[1] * G * dt) * air;
          b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt; b.vr *= Math.exp(-1.2 * dt);
          const ax = b.cx + b.x, ay = b.cy + b.y, edge = Math.hypot(b.w, b.h) / 2;   // contra los bordes cuenta la media diagonal: ni girada queda cortada
          if (Math.abs(ax) > hw - edge) { b.x = Math.sign(ax) * (hw - edge) - b.cx; b.vx *= -o.bounce; b.vr += b.vy * .25 * Math.sign(ax); b.vy *= .96; }
          if (Math.abs(ay) > hh - edge) { b.y = Math.sign(ay) * (hh - edge) - b.cy; b.vy = Math.abs(b.vy) > 40 ? -b.vy * o.bounce : 0; b.vr -= b.vx * .25 * Math.sign(ay); b.vx *= .96; }
          energy += Math.abs(b.vx) + Math.abs(b.vy);
        }
        for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
          const p = list[i], q = list[j], dx = q.cx + q.x - p.cx - p.x, dy = q.cy + q.y - p.cy - p.y, d = Math.hypot(dx, dy) || .01, min = p.rad + q.rad;
          if (d >= min) continue;
          const nx = dx / d, ny = dy / d, pen = min - d, wp = p.held ? 0 : q.held ? 1 : .5, wq = 1 - wp;
          p.x -= nx * pen * wp; p.y -= ny * pen * wp; q.x += nx * pen * wq; q.y += ny * pen * wq;
          const rel = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
          if (rel < 0) { const jmp = -(1 + o.bounce) * rel; p.vx -= nx * jmp * wp; p.vy -= ny * jmp * wp; q.vx += nx * jmp * wq; q.vy += ny * jmp * wq; p.vr -= jmp * .3 * wp; q.vr += jmp * .3 * wq; }
        }
        calm = energy < 6 * list.length && !list.some((b) => b.held) ? calm + dt : 0;
        return calm < 1.2;   // en reposo se duerme; cualquier arrastre o botón lo despierta
      });
      mark("");
      return B.api({
        /** Demo: suelta las letras hacia abajo. */
        play() { release("down"); },
        pause() { sim.sleep(); },
        reset: home,
      });
    },
  });
})();
