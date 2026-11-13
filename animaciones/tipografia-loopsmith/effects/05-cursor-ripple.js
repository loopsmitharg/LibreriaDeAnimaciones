/* 05 · Cursor Ripple — una onda que viaja por la palabra. */
(() => {
  const LST = window.LoopSmithType, { clamp, bodies, pointer } = LST.kit;
  LST.register({
    id: "cursor-ripple", n: "05", group: "A", name: "Cursor Ripple", hint: ["hover", "click"],
    lead: "Cruzá el logo con el cursor: nace una onda donde pasaste y se propaga letra por letra, con retraso y amplitud decrecientes.",
    fields: [["intensity", "Amplitud", 1, .3, 2, .05], ["speed", "Velocidad de propagación", 1, .4, 2.5, .05]],
    tech: "Cada perturbación es una función pura del tiempo: sin(ωτ)·e^(−γτ) retrasada por la distancia a su origen. Al sumar cero cuando se extingue, el logo vuelve exacto sin corrección.",
    mobile: "Un toque sobre el logo emite una onda fuerte desde ese punto.",
    mount(host, o) {
      const B = LST.base(host, o), sim = bodies(B), p = pointer(B);
      const ripples = [];
      let travelled = 0, lx = 0, ly = 0;
      const emit = (x, amp) => { ripples.push({ x, t: 0, a: amp }); if (ripples.length > 8) ripples.shift(); sim.wake(); };
      const near = () => Math.abs(p.y) < B.logo.px * 1.1 && Math.abs(p.x) < (B.logo.width * B.logo.px) / 2 + B.logo.px * .6;
      p.onMove = () => {
        travelled += Math.hypot(p.x - lx, p.y - ly); lx = p.x; ly = p.y;
        if (travelled > B.logo.px * .55 && near()) { travelled = 0; emit(p.x, clamp(Math.hypot(p.vx, p.vy) / 1400, .22, .9)); }
      };
      B.s.on(B.stage, "pointerdown", () => emit(p.x, 1.25));
      sim.run((dt, list) => {
        const f = B.logo.px, c = B.logo.width * f * 1.5 * o.speed, span = B.logo.width * f;
        for (let k = ripples.length - 1; k >= 0; k--) if ((ripples[k].t += dt) > span / c + 1.5) ripples.splice(k, 1);
        for (const b of list) {
          let y = 0, x = 0, r = 0;
          for (const rp of ripples) {
            const d = b.cx - rp.x, tau = rp.t - Math.abs(d) / c;
            if (tau <= 0) continue;
            const w = Math.sin(tau * 15) * Math.exp(-tau * 4.2) * rp.a * Math.exp(-Math.abs(d) / (span * .7));
            y -= w; x += Math.sign(d) * w * .28; r += Math.sign(d || 1) * w * 9;
          }
          const A = f * .3 * o.intensity;
          b.y = y * A; b.x = x * A; b.r = r * o.intensity;
        }
        return ripples.length > 0;
      });
      let timer;
      B.s.onKill(() => clearTimeout(timer));
      return B.api({
        play() { const w = (B.logo.width * B.logo.px) / 2; emit(-w, 1.1); clearTimeout(timer); timer = setTimeout(() => emit(w, .8), 900); },
        pause() { sim.sleep(); },
        reset() { ripples.length = 0; sim.home({ duration: .4, ease: "power2.out", stagger: 0 }); },
      });
    },
  });
})();
