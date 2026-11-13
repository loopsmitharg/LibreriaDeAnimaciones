/* 16 · Pinned Cinematic Sequence — seis fases fijadas en pantalla. */
(() => {
  const LST = window.LoopSmithType, { h, seg, track, applyPose, rand } = LST.kit;
  const TURNS = [0, 90, -90, 180, 45, -45, 0, 90, -90, 135];
  LST.register({
    id: "pinned-cinematic", n: "16", group: "B", scroll: true, name: "Pinned Cinematic Sequence", hint: ["scroll"],
    lead: "Una secuencia fijada en pantalla con seis tiempos: logo intacto, expansión, composición abstracta, reorganización, reconstrucción y cierre. Reversible cuadro por cuadro.",
    fields: [["length", "Largo del recorrido (pantallas)", 6, 4, 10, .5], ["abstraction", "Escala de la abstracción", 1, .5, 1.6, .05], ["scrub", "Inercia del scroll (s)", .7, 0, 1.5, .05]],
    tech: "Todo el estado es función del progreso: ocho stops de pose más el cierre (regla + lema). No hay disparadores ni callbacks de entrada/salida, por eso no existen estados inconsistentes al invertir el scroll.",
    mobile: "La composición abstracta y la escalera se recalculan con el alto y ancho reales.",
    mount(host, o) {
      const B = LST.base(host, o, {
        scroll: {
          length: o.length,
          phases: [[0, "Logo intacto"], [.1, "Expansión"], [.26, "Abstracción"], [.58, "Reorganización"], [.76, "Reconstrucción"], [.9, "Cierre"]],
          before: `<p class="lst-kicker">Antes de la secuencia</p><h3>Scroll para entrar.</h3>`,
          after: `<p class="lst-kicker">Después de la secuencia</p><h3>El scroll quedó libre.</h3>`,
        },
      });
      const close = h("div", "lst-closing", `<i></i><span>Work Smarter.</span>`);
      B.stage.append(close);
      const abstract = (turn) => (i) => {
        const r = rand(i * 17 + 2);
        return { ...B.to(i, (r() - .5) * B.W * .26, (r() - .5) * B.H * .24), r: TURNS[i % TURNS.length] + turn, s: (2 + r() * 3.4) * o.abstraction * (B.parts[i] === B.logo.symbol ? .34 : 1), o: .5 + r() * .5 };
      };
      const stair = (i) => { const t = i / (B.n - 1) - .5; return { ...B.to(i, t * B.W * .64, -t * B.H * .46), s: 1.3 }; };
      const tr = track([
        { at: 0, pose: null }, { at: .1, pose: null },
        { at: .26, ease: "power2.inOut", pose: (i) => ({ x: B.c(i).x * .24, y: Math.sin(i * 1.3) * B.logo.px * .09, s: 1.1 }) },
        { at: .46, ease: "power3.inOut", stagger: .22, pose: abstract(0) },
        { at: .58, ease: "sine.inOut", pose: abstract(35) },          // la composición sigue viva: gira despacio
        { at: .76, ease: "power3.inOut", stagger: .3, pose: stair },
        { at: .9, ease: "power4.out", stagger: .25, pose: null },
        { at: 1, pose: null },
      ], B.n);
      const measure = () => tr.measure(); measure(); B.onResize(measure);
      const sc = B.scrollScene((p) => {
        applyPose(B.parts, tr.at(p));
        const t = seg(p, .9, .98);
        close.style.opacity = t;
        close.firstChild.style.transform = `scaleX(${t})`;
        close.lastChild.style.transform = `translateY(${(1 - t) * 14}px)`;
      }, { scrub: o.scrub });
      return B.api({ play: sc.play, pause: sc.pause, reset: sc.reset });
    },
  });
})();
