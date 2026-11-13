/* 09 · Scroll Assembly — el scroll arma el logo. */
(() => {
  const LST = window.LoopSmithType, { track, applyPose, rand } = LST.kit;
  LST.register({
    id: "scroll-assembly", n: "09", group: "B", scroll: true, name: "Scroll Assembly", hint: ["scroll"],
    lead: "El logo entra desarmado por todo el viewport. Cada tramo de scroll acerca las letras, corrige su giro, su escala y su espaciado hasta dejar el logo perfecto. Hacia arriba, se vuelve a desarmar.",
    fields: [["length", "Largo del recorrido (pantallas)", 3.2, 2, 6, .2], ["scrub", "Inercia del scroll (s)", .6, 0, 1.5, .05]],
    tech: "Tres poses (disperso, suelto, logo) interpoladas por un progreso único con scrub. La dispersión es determinista: no cambia al refrescar ni al volver.",
    mobile: "Mismo recorrido; la dispersión se calcula con el tamaño real del contenedor.",
    mount(host, o) {
      const B = LST.base(host, o, {
        scroll: {
          length: o.length, phases: [[0, "Disperso"], [.2, "Acercamiento"], [.68, "Ajuste fino"], [.9, "Logo"]],
          after: `<p class="lst-kicker">Siguiente sección</p><h3>El logo quedó armado.<br>La página sigue.</h3>`,
        },
      });
      const tr = track([
        { at: 0, pose: (i) => { const r = rand(i * 7 + 3); return { ...B.to(i, (r() - .5) * B.W * .84, (r() - .5) * B.H * .7), r: (r() - .5) * 240, s: .5 + r() * 2.3, o: .85 }; } },
        { at: .68, ease: "power2.inOut", stagger: .4, pose: (i) => ({ x: B.c(i).x * .34, y: (i % 2 ? -1 : 1) * B.logo.px * .09, r: i % 2 ? 5 : -5, s: 1.04 }) },
        { at: .9, ease: "power3.out", pose: null },   // ajuste fino: espaciado, giro y escala exactos
        { at: 1, pose: null },
      ], B.n);
      const measure = () => tr.measure(); measure(); B.onResize(measure);
      const sc = B.scrollScene((p) => applyPose(B.parts, tr.at(p)), { scrub: o.scrub });
      return B.api({ play: sc.play, pause: sc.pause, reset: sc.reset });
    },
  });
})();
