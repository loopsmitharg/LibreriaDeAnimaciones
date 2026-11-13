/* 14 · Scroll Wave Typography — una onda continua atada al scroll. */
(() => {
  const LST = window.LoopSmithType, { gsap } = LST.kit;
  LST.register({
    id: "scroll-wave", n: "14", group: "B", scroll: true, name: "Scroll Wave Typography", hint: ["scroll"],
    lead: "El scroll empuja una onda que recorre el nombre de punta a punta. Cada letra sube, gira y respira con un desfase fijo respecto de la anterior.",
    fields: [["length", "Largo del recorrido (pantallas)", 3, 2, 6, .25], ["amplitude", "Amplitud", 1, .3, 2, .05], ["cycles", "Ondas por recorrido", 2.5, 1, 6, .5], ["phase", "Desfase entre letras", .7, .2, 1.4, .05]],
    tech: "Posición = sin(fase del scroll − desfase × índice) × envolvente. La envolvente vale cero en los extremos: la escena empieza y termina con el logo exacto, sin correcciones.",
    mobile: "Idéntico; la amplitud es proporcional al tamaño del logo.",
    mount(host, o) {
      const B = LST.base(host, o, {
        scroll: {
          length: o.length, phases: [[0, "Reposo"], [.06, "Onda"], [.94, "Reposo"]],
          after: `<p class="lst-kicker">Siguiente sección</p><h3>La onda se apagó<br>justo al llegar.</h3>`,
        },
      });
      const sc = B.scrollScene((p) => {
        const env = Math.sin(Math.PI * p) ** .7, A = B.logo.px * .36 * o.amplitude * env;
        B.parts.forEach((el, i) => {
          const ph = p * o.cycles * 6.2832 - i * o.phase, sn = Math.sin(ph);
          gsap.set(el, { y: -sn * A, rotation: Math.cos(ph) * 11 * env * o.amplitude, scale: 1 + sn * .09 * env });
        });
      }, { scrub: .4 });
      return B.api({ play: sc.play, pause: sc.pause, reset: sc.reset });
    },
  });
})();
