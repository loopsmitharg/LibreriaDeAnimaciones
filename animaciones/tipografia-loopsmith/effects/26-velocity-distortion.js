/* 26 · Velocity Distortion — la velocidad del puntero (o de la rueda) estira las letras. */
(() => {
  const LST = window.LoopSmithType, { gsap, clamp, bodies, pointer } = LST.kit;
  LST.register({
    id: "velocity-distortion", n: "26", group: "D", name: "Velocity Distortion", hint: ["hover", "scroll"],
    lead: "Mové el cursor rápido sobre el escenario o girá la rueda: las letras se inclinan, se estiran y se rezagan según la velocidad. Al frenar, recuperan la forma con amortiguación.",
    fields: [["sensitivity", "Sensibilidad", 1, .2, 2.5, .05], ["damping", "Amortiguación", 7, 2, 16, .5], ["trail", "Rezago entre letras", .55, 0, .9, .05]],
    tech: "La velocidad del puntero pasa por un filtro pasa-bajos distinto por letra (las últimas reaccionan más tarde), y de esa señal salen skew, escala y desplazamiento. La rueda suma un impulso vertical. Con velocidad cero la señal decae a cero: no queda deformación residual.",
    mobile: "Deslizar el dedo sobre el escenario produce el mismo efecto.",
    mount(host, o) {
      const B = LST.base(host, o), sim = bodies(B), p = pointer(B), n = B.n;
      const sig = sim.list.map(() => ({ x: 0, y: 0 }));
      p.onMove = sim.wake;
      B.s.on(B.stage, "wheel", (e) => { p.vy += clamp(e.deltaY, -160, 160) * 14; sim.wake(); }, { passive: true });
      B.s.on(B.stage, "touchmove", (e) => e.preventDefault(), { passive: false });
      sim.run((dt, list) => {
        const decay = Math.exp(-o.damping * dt);
        p.vx *= decay; p.vy *= decay;                               // sin eventos nuevos, la velocidad se apaga
        let alive = false;
        list.forEach((b, i) => {
          const s = sig[i], k = 1 - Math.exp(-dt * o.damping * 2.4 * (1 - (i / (n - 1)) * o.trail));
          s.x += (p.vx - s.x) * k; s.y += (p.vy - s.y) * k;
          const vx = s.x * o.sensitivity, vy = s.y * o.sensitivity;
          b.x = clamp(vx * .05, -B.logo.px, B.logo.px); b.y = clamp(vy * .04, -B.logo.px * .8, B.logo.px * .8);
          b.sx = 1 + clamp(Math.abs(vx) * .00035, 0, .7); b.sy = 1 + clamp(Math.abs(vy) * .00045, 0, .8);
          b.k = clamp(-vx * .018, -38, 38);
          if (Math.abs(s.x) + Math.abs(s.y) > 2) alive = true;
        });
        if (!alive) list.forEach((b) => { b.x = b.y = b.k = 0; b.sx = b.sy = 1; });
        return alive;
      });
      sim.apply = () => sim.list.forEach((b) => gsap.set(b.el, { x: b.x, y: b.y, scaleX: b.sx, scaleY: b.sy, skewX: b.k || 0 }));
      let demo;
      B.s.onKill(() => demo && demo.kill());
      return B.api({
        /** Demo: dos latigazos horizontales y uno vertical. */
        play() {
          demo && demo.kill();
          demo = gsap.timeline().call(() => { p.vx = 5200; sim.wake(); }).call(() => { p.vx = -5200; sim.wake(); }, null, .7).call(() => { p.vy = 4200; sim.wake(); }, null, 1.5);
        },
        pause() { sim.sleep(); },
        reset() { sig.forEach((s) => (s.x = s.y = 0)); p.vx = p.vy = 0; sim.sleep(); B.logo.restore(.4); },
      });
    },
  });
})();
