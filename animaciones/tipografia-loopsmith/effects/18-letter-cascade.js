/* 18 · Letter Cascade — una entrada coreografiada, no un stagger. */
(() => {
  const LST = window.LoopSmithType, { gsap } = LST.kit;
  // Por pieza: [inicio (s), peso 0..1]. El ritmo es irregular a propósito (dos, pausa, tres…)
  // y el peso decide cuánto tarda en caer, cuánto se aplasta y cuánto empuja a su vecina.
  const SCORE = [[0, 1], [.3, .55], [.4, .4], [.5, .4], [.66, .6], [.95, .8], [1.1, .95], [1.26, .15], [1.34, .3], [1.5, .6]];
  LST.register({
    id: "letter-cascade", n: "18", group: "C", name: "Letter Cascade", hint: ["play"],
    lead: "Las letras caen una tras otra con ritmo propio. Las pesadas tardan más, se aplastan al aterrizar y empujan a la vecina; las livianas rebotan cortito.",
    fields: [["speed", "Velocidad", 1, .4, 2, .05], ["height", "Altura de caída", 1, .4, 1.6, .05]],
    tech: "Cada pieza tiene tiempo de inicio y peso propios. La caída acelera (power2.in), el aterrizaje se resuelve aparte: aplastamiento desde la base, retorno elástico y un empujón que recibe la letra anterior.",
    mobile: "La altura de caída se calcula con el alto del contenedor.",
    mount(host, o) {
      const B = LST.base(host, o), off = SCORE.length - B.n;
      const tl = gsap.timeline({ paused: true, onComplete: () => gsap.set(B.parts, { clearProps: "transform,transformOrigin" }) });
      tl.set(B.parts, { opacity: 0, transformOrigin: "50% 100%" }, 0);
      B.parts.forEach((el, i) => {
        const [t, w] = SCORE[i + off], f = B.logo.px, d = .34 + w * .22, land = t + d, prev = B.parts[i - 1];
        tl.set(el, { opacity: 1 }, t)
          .fromTo(el, { y: () => -B.H * .55 * o.height }, { y: 0, duration: d, ease: "power2.in", immediateRender: false }, t)
          .fromTo(el, { x: (i % 2 ? 1 : -1) * f * .35, rotation: (i % 2 ? 1 : -1) * (18 + w * 26) }, { x: 0, rotation: 0, duration: d, ease: "power1.out", immediateRender: false }, t)
          .to(el, { scaleY: 1 - .24 * w - .05, scaleX: 1 + .14 * w + .03, duration: .07, ease: "power1.out" }, land)
          .to(el, { scaleY: 1, scaleX: 1, duration: .75, ease: `elastic.out(1, ${.3 + (1 - w) * .2})` }, land + .07);
        if (w < .5) tl.to(el, { y: -f * .09, duration: .13, ease: "power2.out", yoyo: true, repeat: 1 }, land + .07); // las livianas rebotan
        if (prev) tl.to(prev, { x: -f * .04 * w, rotation: -3 * w, duration: .08, ease: "power2.out" }, land)
          .to(prev, { x: 0, rotation: 0, duration: .7, ease: "elastic.out(1, .4)" }, land + .08);
      });
      B.s.keep(tl);
      return B.api({ play: () => tl.timeScale(o.speed).restart(), pause: () => tl.pause(), reset: () => tl.progress(1).pause() });
    },
  });
})();
