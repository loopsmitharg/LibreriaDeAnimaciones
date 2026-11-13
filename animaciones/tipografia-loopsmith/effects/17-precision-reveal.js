/* 17 · Precision Reveal — máscaras y desplazamientos medidos. */
(() => {
  const LST = window.LoopSmithType, { gsap, h } = LST.kit;
  LST.register({
    id: "precision-reveal", n: "17", group: "C", name: "Precision Reveal", hint: ["play"],
    lead: "Primero se trazan la línea base y la altura de x. Después cada letra emerge desde su propia máscara: «Loop» sube desde la base, «Smith» baja desde arriba. Las guías se retiran y queda la marca.",
    fields: [["duration", "Duración por letra (s)", 1.05, .4, 2, .05], ["stagger", "Escalonado (s)", .055, 0, .2, .005], ["guides", "Mostrar guías tipográficas", true]],
    tech: "La máscara es un clip-path inset que se abre al mismo ritmo que la letra se desplaza (mismo ease, misma duración): el borde del recorte queda quieto sobre la línea base aunque el recorte viaje con la pieza.",
    mobile: "Sin cambios: todo es proporcional al tamaño del logo.",
    mount(host, o) {
      const B = LST.base(host, o), E = "expo.out";
      const guides = h("div", "lst-guides", "<i></i><i></i>");
      B.logo.el.prepend(guides);
      const L = B.letters, base = L.length ? B.logo.geom[B.parts.indexOf(L[0])] : { y: .33, h: .35 };
      guides.children[0].style.top = base.y + base.h + "em";                      // línea base (pie de la L)
      guides.children[1].style.top = (L[1] ? B.logo.geom[B.parts.indexOf(L[1])].y : .44) + "em"; // altura de x (tope de la o)
      const tl = gsap.timeline({ paused: true, onComplete: () => gsap.set(B.parts, { clearProps: "clipPath,transform" }) });
      tl.set(B.parts, { opacity: 0 }, 0)
        .set(guides.children, { opacity: o.guides ? .4 : 0, transformOrigin: "0% 50%" }, 0)
        .fromTo(guides.children, { scaleX: 0 }, { scaleX: 1, duration: .8, ease: "expo.inOut", stagger: .08, immediateRender: false }, 0);
      if (B.logo.symbol) tl.set(B.logo.symbol, { opacity: 1 }, .35).fromTo(B.logo.symbol, { clipPath: "inset(0% 100% 0% 0% round 22%)", xPercent: -18 }, { clipPath: "inset(0% 0% 0% 0% round 22%)", xPercent: 0, duration: o.duration, ease: E, immediateRender: false }, .35);
      L.forEach((el, i) => {
        const up = el.dataset.word === "0";   // «Loop» emerge desde la base; «Smith» desde arriba
        const at = .5 + i * o.stagger + (up ? 0 : .12);
        tl.set(el, { opacity: 1 }, at).fromTo(el, { yPercent: up ? 100 : -100, clipPath: up ? "inset(0% 0% 100% 0%)" : "inset(100% 0% 0% 0%)" },
          { yPercent: 0, clipPath: "inset(0% 0% 0% 0%)", duration: o.duration, ease: E, immediateRender: false }, at);
      });
      tl.set(guides.children, { transformOrigin: "100% 50%" }, ">-.35").to(guides.children, { scaleX: 0, duration: .7, ease: "expo.inOut", stagger: .06 }, "<");
      B.s.keep(tl);
      return B.api({ play: () => tl.restart(), pause: () => tl.pause(), reset: () => tl.progress(1).pause() });
    },
  });
})();
