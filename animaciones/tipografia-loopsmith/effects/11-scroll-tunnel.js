/* 11 · Scroll Typography Tunnel — atravesar las letras en profundidad (CSS 3D). */
(() => {
  const LST = window.LoopSmithType, { gsap, seg } = LST.kit;
  LST.register({
    id: "scroll-tunnel", n: "11", group: "B", scroll: true, name: "Scroll Typography Tunnel", hint: ["scroll"],
    lead: "Las letras se escalonan en profundidad y el scroll empuja la cámara a través de ellas: crecen, pasan de largo y vuelven desde atrás del espectador para cerrar el logo.",
    fields: [["length", "Largo del recorrido (pantallas)", 4.5, 3, 8, .25], ["spacing", "Distancia entre planos (px)", 520, 250, 900, 10], ["scrub", "Inercia del scroll (s)", .7, 0, 1.5, .05]],
    tech: "Solo CSS 3D: perspective en el escenario, translateZ por letra. La posición de cada plano es función pura del progreso, así el recorrido es idéntico en ambos sentidos.",
    mobile: "Misma escena con menos apertura lateral para que las letras no se corten.",
    mount(host, o) {
      const B = LST.base(host, o, {
        className: "lst--3d",
        scroll: {
          length: o.length, phases: [[0, "Logo"], [.05, "Profundidad"], [.24, "Travesía"], [.84, "Regreso"]],
          after: `<p class="lst-kicker">Siguiente sección</p><h3>Fin del túnel.</h3>`,
        },
      });
      const P = 900, inOut = gsap.parseEase("power2.inOut"), outE = gsap.parseEase("power3.out"), sine = gsap.parseEase("sine.inOut");
      B.stage.style.perspective = P + "px";
      const sc = B.scrollScene((p) => {
        const spread = inOut(seg(p, .05, .24)), cam = sine(seg(p, .22, .84)), back = outE(seg(p, .84, 1));
        const R = Math.min(B.W, B.H) * .2, total = B.n * o.spacing + P * .8;
        B.parts.forEach((el, i) => {
          const a = i * 2.39996, t = B.to(i, Math.cos(a) * R, Math.sin(a) * R * .8);
          const z = (-(i + 1) * o.spacing * spread + cam * total) * (1 - back);
          const near = 1 - seg(z, P * .5, P * .82), far = seg(z, -total, -total * .45) * .75 + .25; // se funde al cruzar la cámara
          gsap.set(el, { x: t.x * spread * (1 - back), y: t.y * spread * (1 - back), z, rotation: (i % 2 ? 9 : -9) * spread * (1 - back), opacity: Math.min(near, far) });
        });
      }, { scrub: o.scrub });
      return B.api({ play: sc.play, pause: sc.pause, reset: sc.reset });
    },
  });
})();
