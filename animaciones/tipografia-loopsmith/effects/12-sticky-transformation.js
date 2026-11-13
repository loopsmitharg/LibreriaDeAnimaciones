/* 12 · Sticky Wordmark Transformation — el logo fijo cambia de composición. */
(() => {
  const LST = window.LoopSmithType, { track, applyPose } = LST.kit;
  LST.register({
    id: "sticky-transformation", n: "12", group: "B", scroll: true, name: "Sticky Wordmark Transformation", hint: ["scroll"],
    lead: "El logo queda fijo y el scroll lo transforma por etapas: se expande, se distribuye en una grilla editorial, una letra toma el centro y, al final, todo vuelve a ensamblarse.",
    fields: [["length", "Largo del recorrido (pantallas)", 5, 3, 8, .25], ["hero", "Letra protagonista", "5", { 1: "L", 5: "S", 6: "m", 0: "Símbolo" }], ["scrub", "Inercia del scroll (s)", .6, 0, 1.5, .05]],
    tech: "Cinco poses con pausas entre ellas (dos stops con la misma pose = fase quieta). El indicador de fase marca dónde empieza y termina cada una.",
    mobile: "La grilla pasa de 5×2 a 2×5 cuando el contenedor es vertical.",
    mount(host, o) {
      const B = LST.base(host, o, {
        scroll: {
          length: o.length, phases: [[0, "Original"], [.08, "Expansión"], [.28, "Distribución"], [.48, "Protagonista"], [.76, "Reensamble"], [.94, "Salida"]],
          after: `<p class="lst-kicker">Siguiente sección</p><h3>La marca ya se presentó.</h3>`,
        },
      });
      const hero = Math.min(B.n - 1, +o.hero);
      const grid = (i) => { const cols = B.W > B.H ? 5 : 2, rows = Math.ceil(B.n / cols); return { ...B.to(i, ((i % cols) / (cols - 1) - .5) * B.W * .64, (Math.floor(i / cols) / (rows - 1) - .5) * B.H * .5), s: B.parts[i] === B.logo.symbol ? .8 : 1.5, r: 0 }; };
      const star = (i) => {
        const c = B.c(i);
        if (i === hero) return { ...B.to(i, 0, B.H * .04), s: Math.min((B.H * .56) / c.h, (B.W * .6) / c.w) };
        const k = i - (i > hero), m = B.n - 2;   // el resto forma una línea de crédito arriba
        return { ...B.to(i, (k / m - .5) * Math.min(B.W * .5, B.logo.px * 5), -B.H * .38), s: .5, o: .6 };
      };
      const tr = track([
        { at: 0, pose: null }, { at: .08, pose: null },
        { at: .26, ease: "power2.inOut", pose: (i) => ({ x: B.c(i).x * .3, s: 1.12 }) },
        { at: .46, ease: "power3.inOut", stagger: .25, pose: grid },
        { at: .66, ease: "power3.inOut", stagger: .2, pose: star },
        { at: .76, pose: star },
        { at: .94, ease: "power3.inOut", stagger: .3, pose: null },
        { at: 1, pose: null },
      ], B.n);
      const measure = () => tr.measure(); measure(); B.onResize(measure);
      const sc = B.scrollScene((p) => applyPose(B.parts, tr.at(p)), { scrub: o.scrub });
      return B.api({ play: sc.play, pause: sc.pause, reset: sc.reset });
    },
  });
})();
