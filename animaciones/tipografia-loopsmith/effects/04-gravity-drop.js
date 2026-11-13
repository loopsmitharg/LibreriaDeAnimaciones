/* 04 · Gravity Drop — las letras pierden el soporte, caen, rebotan y se rearman. */
(() => {
  const LST = window.LoopSmithType, { gsap, bodies, rand } = LST.kit;
  LST.register({
    id: "gravity-drop", n: "04", group: "A", name: "Gravity Drop", hint: ["click"],
    lead: "Un clic y el logo pierde el soporte. Cada letra cae con su peso, rebota contra el piso, rueda y se acomoda. Después, todas saltan de vuelta a su lugar.",
    fields: [["gravity", "Gravedad", 1, .3, 2.5, .05], ["bounce", "Rebote", .42, 0, .8, .02], ["rest", "Pausa en el piso (s)", 1, .2, 4, .1]],
    tech: "Caída con gravedad real (px/s²), colisión contra el piso según la caja rotada de cada letra, pérdida de energía en cada rebote, fricción que convierte velocidad en giro y separación entre letras apoyadas.",
    mobile: "Tocar el escenario dispara la caída. El piso es el borde inferior del contenedor.",
    mount(host, o) {
      const B = LST.base(host, o, { fitH: .26 }), sim = bodies(B);
      let state = "idle", T = 0, calm = 0, rebuild;
      const drop = () => {
        if (state !== "idle") return;
        const rnd = rand(Date.now() % 9973);
        sim.list.forEach((b) => { b.t0 = rnd() * .45; b.live = false; b.kick = (rnd() - .5); });
        state = "falling"; T = calm = 0; sim.wake();
      };
      const back = () => {
        state = "rebuilding";
        rebuild = sim.home({ duration: .85, ease: "back.out(1.5)", stagger: { each: .05, from: "start" }, onComplete: () => (state = "idle") });
      };
      sim.run((dt, list) => {
        if (state !== "falling") return false;
        T += dt;
        const g = 2600 * o.gravity * (B.logo.px / 80), floor = B.H / 2, wall = B.W / 2;
        let moving = false;
        for (const b of list) {
          if (!b.live) { if (T < b.t0) { moving = true; continue; } b.live = true; b.vx = b.kick * 260; b.vr = b.kick * 320; }
          b.vy += g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
          const a = (b.r * Math.PI) / 180, half = (Math.abs(Math.sin(a)) * b.w + Math.abs(Math.cos(a)) * b.h) / 2;
          const bottom = b.cy + b.y + half;
          if (bottom >= floor) {
            b.y = floor - half - b.cy;
            if (b.vy > 0) b.vy = b.vy > 90 ? -b.vy * o.bounce : 0;       // pierde energía; bajo un umbral queda apoyada
            b.vx *= .86; b.vr = b.vr * .7 + b.vx * .35;                  // la fricción convierte avance en giro
            if (b.vy === 0) { const flat = Math.round(b.r / 90) * 90; b.vr += ((flat - b.r) * 40 - b.vr * 9) * dt; } // se acuesta sobre un lado
          }
          const ax = b.cx + b.x, lim = wall - b.w / 2;
          if (Math.abs(ax) > lim) { b.x = Math.sign(ax) * lim - b.cx; b.vx *= -.5; }
          if (Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vr) > 14) moving = true;
        }
        // Las letras apoyadas no se superponen: se empujan en horizontal.
        for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
          const p = list[i], q = list[j];
          if (!p.live || !q.live || Math.abs(p.cy + p.y - (q.cy + q.y)) > (p.h + q.h) / 2) continue;
          const d = q.cx + q.x - (p.cx + p.x), min = (p.w + q.w) / 2 * .9;
          if (Math.abs(d) < min) { const push = (min - Math.abs(d)) / 2 * (d < 0 ? -1 : 1); p.x -= push * .5; q.x += push * .5; p.vx -= push * 4; q.vx += push * 4; }
        }
        calm = moving ? 0 : calm + dt;
        if (calm > o.rest || T > 6) back();
        return true;
      });
      B.s.on(B.stage, "click", drop);
      return B.api({
        play() { if (state === "idle") drop(); },
        pause() { sim.sleep(); },
        reset() { state = "idle"; sim.home({ duration: .6, ease: "power3.out", stagger: .02 }); },
      });
    },
  });
})();
