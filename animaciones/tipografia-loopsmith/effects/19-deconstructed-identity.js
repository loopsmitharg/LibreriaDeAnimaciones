/* 19 · Deconstructed Identity — fragmentos de las propias letras que se recomponen. */
(() => {
  const LST = window.LoopSmithType, { gsap, rand } = LST.kit;
  // Dos cortes oblicuos dividen cada pieza en cuatro cuadriláteros que se solapan apenas en los cortes (sin costuras).
  const CUTS = [
    "polygon(-8% -8%, 56.5% -8%, 46.3% 52.5%, -8% 61.5%)", "polygon(53.5% -8%, 108% -8%, 108% 41.5%, 43.3% 52.5%)",
    "polygon(43.3% 49.5%, 108% 38.5%, 108% 108%, 33.5% 108%)", "polygon(-8% 58.5%, 46.3% 49.5%, 36.5% 108%, -8% 108%)",
  ];
  const DIR = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  LST.register({
    id: "deconstructed-identity", n: "19", group: "C", name: "Deconstructed Identity", hint: ["play"],
    lead: "La marca empieza como una composición de fragmentos geométricos. Son pedazos de sus propias letras: giran, viajan y encajan hasta reconstruir cada carácter.",
    fields: [["duration", "Duración (s)", 1.5, .6, 3, .05], ["spread", "Dispersión", 1, .3, 2, .05]],
    tech: "Cada pieza se clona cuatro veces y cada clon se recorta con clip-path. Al terminar, los clones se ocultan y vuelve la pieza original: el logo final es el oficial, sin costuras.",
    mobile: "La dispersión es proporcional al contenedor.",
    mount(host, o) {
      const B = LST.base(host, o), frags = [];
      B.parts.forEach((el, i) => CUTS.forEach((cut, q) => {
        const f = el.cloneNode(true);
        f.classList.add("lst-frag"); f.style.clipPath = cut; f.style.opacity = 0;
        B.logo.el.append(f); frags.push({ f, i, q });
      }));
      const tl = gsap.timeline({ paused: true });
      tl.set(B.parts, { opacity: 0 }, 0).set(frags.map((x) => x.f), { opacity: 1 }, 0);
      frags.forEach(({ f, i, q }, k) => {
        const r = rand(k * 3 + 1), far = (.25 + r() * .75) * o.spread;
        tl.fromTo(f, {
          x: () => DIR[q][0] * B.W * .16 * far + (r() - .5) * B.W * .3 * o.spread - B.c(i).x * .5,
          y: () => DIR[q][1] * B.H * .2 * far, rotation: (Math.round(r() * 4) - 2) * 90, scale: .5 + r() * 1.6,
        }, { x: 0, y: 0, rotation: 0, scale: 1, duration: o.duration * (.7 + r() * .3), ease: "expo.inOut", immediateRender: false }, .25 + r() * o.duration * .35);
      });
      tl.set(B.parts, { opacity: 1 }).set(frags.map((x) => x.f), { opacity: 0 }); // relevo: fragmentos -> piezas originales
      B.s.keep(tl);
      return B.api({ play: () => tl.restart(), pause: () => tl.pause(), reset: () => tl.progress(1).pause() });
    },
  });
})();
