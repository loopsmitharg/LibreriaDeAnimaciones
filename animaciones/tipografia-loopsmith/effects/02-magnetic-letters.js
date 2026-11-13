/* 02 · Magnetic Letters — campo magnético con deformación colectiva. */
(() => {
  const LST = window.LoopSmithType, { gsap, bodies, pointer } = LST.kit;
  LST.register({
    id: "magnetic-letters", n: "02", group: "A", name: "Magnetic Letters", hint: ["hover"],
    lead: "Cada letra siente la cercanía del cursor. Las vecinas se contagian y la palabra entera se curva alrededor del puntero.",
    fields: [["mode", "Polaridad", "attract", { attract: "Atraer", repel: "Repeler" }], ["radius", "Radio de influencia (em)", 1.6, .6, 3, .1], ["strength", "Intensidad", .26, .05, .8, .01]],
    tech: "La fuerza cae con el cuadrado de la distancia al centro en reposo de cada letra (así no hay realimentación). Los objetivos se suavizan con los vecinos y un resorte lleva cada pieza a su objetivo.",
    mobile: "Con el dedo: tocar y deslizar sobre el logo mueve el campo; al levantar, todo vuelve.",
    mount(host, o) {
      const B = LST.base(host, o), sim = bodies(B), p = pointer(B), n = sim.list.length;
      const tx = new Float32Array(n), ty = new Float32Array(n), fall = new Float32Array(n);
      B.s.on(B.stage, "touchmove", (e) => e.preventDefault(), { passive: false });
      p.onMove = sim.wake; p.onLeave = sim.wake;
      sim.run((dt, list) => {
        const R = o.radius * B.logo.px, sign = o.mode === "repel" ? -1 : 1;
        list.forEach((b, i) => {
          const dx = p.x - b.cx, dy = p.y - b.cy, d = Math.hypot(dx, dy) || 1;
          const f = p.inside && d < R ? (1 - d / R) ** 2 : 0, pull = Math.min(d, R * o.strength) * f * sign;
          fall[i] = f; tx[i] = (dx / d) * pull; ty[i] = (dy / d) * pull;
        });
        let alive = p.inside;
        list.forEach((b, i) => {
          // Deformación colectiva: cada objetivo se mezcla con el de sus vecinas.
          const a = Math.max(0, i - 1), c = Math.min(n - 1, i + 1);
          const gx = tx[i] * .6 + (tx[a] + tx[c]) * .2, gy = ty[i] * .6 + (ty[a] + ty[c]) * .2;
          b.vx += ((gx - b.x) * 150 - b.vx * 17) * dt; b.vy += ((gy - b.y) * 150 - b.vy * 17) * dt;
          b.x += b.vx * dt; b.y += b.vy * dt;
          b.r += (gx * .09 - b.r) * Math.min(1, 12 * dt);
          b.sx = b.sy += (1 + fall[i] * .14 - b.sx) * Math.min(1, 10 * dt);
          if (Math.abs(b.x) + Math.abs(b.y) > .15 || Math.abs(b.vx) + Math.abs(b.vy) > 3) alive = true;
        });
        return alive;
      });
      let sweep;
      B.s.onKill(() => sweep && sweep.kill());
      return B.api({
        /** Demo: un puntero fantasma barre la palabra. */
        play() {
          sweep && sweep.kill();
          const w = B.logo.width * B.logo.px * .62; p.inside = true; p.y = -B.logo.px * .25; sim.wake();
          sweep = gsap.fromTo(p, { x: -w }, { x: w, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: 1, onComplete: () => { p.inside = false; } });
        },
        pause() { sweep && sweep.pause(); },
        reset() { sweep && sweep.kill(); p.inside = false; sim.home({ duration: .6, ease: "power3.out" }); },
      });
    },
  });
})();
