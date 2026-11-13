/* 30 · Ultimate Logo Experience — scroll, física y composición en una sola narrativa. */
(() => {
  const LST = window.LoopSmithType, { gsap, h, seg, track, bodies, pointer, rand } = LST.kit;
  LST.register({
    id: "ultimate-experience", n: "30", group: "D", scroll: true, name: "Ultimate Logo Experience", hint: ["scroll", "hover", "click"],
    lead: "La pieza central. Calma: el logo respira bajo el cursor. Descomposición: las letras se sueltan y quedan a merced del puntero. Editorial: el nombre se rearma en dos líneas. Sorpresa: un remolino. Resolución: el logo oficial, quieto.",
    fields: [["length", "Largo del recorrido (pantallas)", 7, 5, 12, .5], ["force", "Fuerza del cursor", 1, 0, 2.5, .05], ["scrub", "Inercia del scroll (s)", .7, 0, 1.5, .05]],
    tech: "Dos capas que se suman: la pose (función pura del scroll) y un desvío físico por letra (repulsión del cursor + resorte con inercia; un clic da un golpe). El desvío se multiplica por una envolvente que llega a cero antes de la resolución: la última imagen es siempre el logo exacto.",
    mobile: "Tocar y deslizar empuja las letras; un toque corto da el golpe. La composición editorial se ajusta al ancho.",
    mount(host, o) {
      const B = LST.base(host, o, {
        scroll: {
          length: o.length,
          phases: [[0, "Calma"], [.12, "Descomposición"], [.3, "Campo abierto"], [.5, "Editorial"], [.7, "Remolino"], [.84, "Resolución"]],
          before: `<p class="lst-kicker">Loop Smith</p><h3>Una identidad<br>que cobra vida.</h3>`,
          after: `<p class="lst-kicker">Fin de la experiencia</p><h3>La marca quedó en su lugar.</h3>`,
        },
      });
      const sim = bodies(B), p = pointer(B), n = B.n, close = h("div", "lst-closing", `<i></i><span>Work Smarter.</span>`);
      B.stage.append(close);
      const field = (turn) => (i) => {
        const r = rand(i * 11 + 4), a = Math.atan2((r() - .5) * B.H * .6, (i / (n - 1) - .5) * B.W * .8) + turn, d = Math.hypot((i / (n - 1) - .5) * B.W * .8, (r() - .5) * B.H * .6);
        return { ...B.to(i, Math.cos(a) * d, Math.sin(a) * d * .85), r: (r() - .5) * 70 + turn * 40, s: .8 + r() * .9 };
      };
      // Editorial: «Loop» arriba y «Smith» abajo, grandes y alineadas a la izquierda; el símbolo firma arriba a la derecha.
      const editorial = (i) => {
        const el = B.parts[i], c = B.c(i), f = B.logo.px;
        if (el === B.logo.symbol) return { ...B.to(i, B.W * .32, -B.H * .3), s: .8 };
        const w = +el.dataset.word, mates = B.parts.map((e, k) => (e.dataset.word == w ? B.c(k) : null)).filter(Boolean);
        const x0 = mates[0].x - mates[0].w / 2, width = mates.at(-1).x + mates.at(-1).w / 2 - x0;
        const k = Math.min(2.3, (B.W * .62) / width, (B.H * .26) / (f * .37));
        return { x: -B.W * .34 + k * (c.x - x0) - c.x, y: (w ? 1 : -1) * B.H * .15 + k * c.y - c.y + f * .05 * k, s: k };
      };
      const swirl = (turn, R) => (i) => { const a = (i / n) * 6.2832 + turn; return { ...B.to(i, Math.cos(a) * Math.min(B.W, B.H) * R, Math.sin(a) * Math.min(B.W, B.H) * R), r: (a * 180) / Math.PI + 90, s: .9 }; };
      const tr = track([
        { at: 0, pose: null }, { at: .12, pose: null },
        { at: .3, ease: "power2.inOut", stagger: .3, pose: field(0) },
        { at: .46, ease: "sine.inOut", pose: field(.5) },                     // calma: el campo deriva
        { at: .58, ease: "power3.inOut", stagger: .25, pose: editorial },
        { at: .7, pose: editorial },                                          // pausa de lectura
        { at: .77, ease: "power3.in", pose: swirl(0, .3) },                   // sorpresa
        { at: .84, ease: "none", pose: swirl(2.6, .3) },
        { at: .95, ease: "expo.out", stagger: .3, pose: null },               // resolución
        { at: 1, pose: null },
      ], n);
      const measure = () => tr.measure(); measure(); B.onResize(measure);
      let pose = tr.at(0), env = 1;
      const paint = () => sim.list.forEach((b, i) => { const q = pose[i]; gsap.set(b.el, { x: q.x + b.x * env, y: q.y + b.y * env, rotation: q.r + b.r * env, scale: q.s, opacity: q.o }); });
      sim.apply = paint;
      p.onMove = sim.wake; p.onLeave = sim.wake;
      B.s.on(B.stage, "pointerdown", () => { sim.list.forEach((b, i) => { const dx = b.cx + pose[i].x + b.x - p.x, dy = b.cy + pose[i].y + b.y - p.y, d = Math.hypot(dx, dy) || 1; const k = 900 * o.force / (1 + d / (B.logo.px * 1.5)); b.vx += (dx / d) * k; b.vy += (dy / d) * k; b.vr += (dx > 0 ? 1 : -1) * k * .2; }); sim.wake(); });
      sim.run((dt, list) => {
        const R = B.logo.px * 1.7;
        let alive = p.inside && env > 0;
        list.forEach((b, i) => {
          let fx = -b.x * 46 - b.vx * 7, fy = -b.y * 46 - b.vy * 7;
          if (p.inside && env > 0) {
            const dx = b.cx + pose[i].x + b.x - p.x, dy = b.cy + pose[i].y + b.y - p.y, d = Math.hypot(dx, dy) || 1;
            if (d < R) { const k = (1 - d / R) ** 2 * 6000 * o.force; fx += (dx / d) * k; fy += (dy / d) * k; }
          }
          b.vx += fx * dt; b.vy += fy * dt; b.x += b.vx * dt; b.y += b.vy * dt;
          b.vr += (-b.r * 40 - b.vr * 6) * dt; b.r += b.vr * dt;
          if (Math.abs(b.x) + Math.abs(b.y) + Math.abs(b.r) > .2 || Math.abs(b.vx) + Math.abs(b.vy) > 3) alive = true;
        });
        return alive;
      });
      const sc = B.scrollScene((q) => {
        pose = tr.at(q); env = 1 - seg(q, .84, .9);
        paint();
        const t = seg(q, .95, 1);
        close.style.opacity = t; close.firstChild.style.transform = `scaleX(${t})`; close.lastChild.style.transform = `translateY(${(1 - t) * 14}px)`;
      }, { scrub: o.scrub });
      return B.api({ play: sc.play, pause: sc.pause, reset() { sc.reset(); sim.list.forEach((b) => (b.x = b.y = b.r = b.vx = b.vy = b.vr = 0)); } });
    },
  });
})();
