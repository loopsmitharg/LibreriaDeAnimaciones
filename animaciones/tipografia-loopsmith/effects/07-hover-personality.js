/* 07 · Hover Personality — cada carácter tiene su gesto. */
(() => {
  const LST = window.LoopSmithType, { gsap } = LST.kit;
  const E = "elastic.out(1, .38)";
  // Un gesto por pieza, en el orden del logo. Todos terminan en reposo y comparten
  // familia de curvas (ataque corto en power2, retorno elástico): distinta voz, mismo idioma.
  const MOVES = [
    /* símbolo */ (t, el, k) => t.to(el, { scale: 1 - .09 * k, rotation: -7 * k, duration: .15, ease: "power2.out" }).to(el, { scale: 1, rotation: 0, duration: 1, ease: E }),
    /* L: bisagra  */ (t, el, k) => t.set(el, { transformOrigin: "0% 100%" }).to(el, { rotation: -15 * k, duration: .2, ease: "power2.out" }).to(el, { rotation: 0, duration: 1.1, ease: E }),
    /* o: pelota   */ (t, el, k, f) => t.to(el, { scaleY: 1 - .26 * k, scaleX: 1 + .16 * k, y: f * .03, duration: .13, ease: "power2.in" }).to(el, { y: -f * .2 * k, scaleY: 1.08, scaleX: .95, duration: .26, ease: "power2.out" }).to(el, { y: 0, scaleX: 1, scaleY: 1, duration: .7, ease: "bounce.out" }),
    /* o: respira  */ (t, el, k) => t.to(el, { scale: 1 + .3 * k, duration: .22, ease: "power2.out" }).to(el, { scale: 1, duration: 1, ease: E }),
    /* p: plomada  */ (t, el, k, f) => t.to(el, { y: f * .13 * k, rotation: 5 * k, duration: .2, ease: "power2.out" }).to(el, { y: 0, rotation: 0, duration: .9, ease: "back.out(2.4)" }),
    /* S: vaivén   */ (t, el, k) => t.to(el, { rotation: -13 * k, duration: .18, ease: "sine.out" }).to(el, { rotation: 10 * k, duration: .26, ease: "sine.inOut" }).to(el, { rotation: 0, duration: .9, ease: E }),
    /* m: se estira*/ (t, el, k) => t.to(el, { scaleX: 1 + .24 * k, scaleY: 1 - .08 * k, duration: .2, ease: "power2.out" }).to(el, { scaleX: 1, scaleY: 1, duration: 1, ease: E }),
    /* i: salta    */ (t, el, k, f) => t.to(el, { scaleY: .8, duration: .1, ease: "power2.in" }).to(el, { y: -f * .24 * k, scaleY: 1.14, duration: .26, ease: "power3.out" }).to(el, { y: 0, scaleY: 1, duration: .6, ease: "bounce.out" }),
    /* t: se ladea */ (t, el, k) => t.set(el, { transformOrigin: "50% 100%" }).to(el, { rotation: 17 * k, duration: .2, ease: "power2.out" }).to(el, { rotation: 0, duration: 1.1, ease: E }),
    /* h: crece    */ (t, el, k) => t.set(el, { transformOrigin: "50% 100%" }).to(el, { scaleY: 1 + .2 * k, scaleX: 1 - .05 * k, duration: .2, ease: "power2.out" }).to(el, { scaleY: 1, scaleX: 1, duration: 1, ease: E }),
  ];
  LST.register({
    id: "hover-personality", n: "07", group: "A", name: "Hover Personality", hint: ["hover"],
    lead: "Pasá por encima de cada letra: la L se abre como una bisagra, la o rebota, la p cae por su descendente, la i salta. Diez gestos, una sola dirección de arte.",
    fields: [["intensity", "Intensidad del gesto", 1, .4, 1.8, .05]],
    tech: "Un timeline corto por pieza que siempre termina en reposo. No se reinicia si ya está en curso, así el gesto nunca se corta a mitad.",
    mobile: "El gesto se dispara al tocar la letra.",
    mount(host, o) {
      const B = LST.base(host, o), off = MOVES.length - B.parts.length, live = new Map();
      const fire = (i) => {
        const el = B.parts[i];
        if (live.get(el)?.isActive()) return;
        const t = gsap.timeline({ onComplete: () => gsap.set(el, { clearProps: "transform,transformOrigin" }) });
        MOVES[i + off](t, el, o.intensity, B.logo.px);
        live.set(el, t);
      };
      B.parts.forEach((el, i) => B.s.on(el, "pointerenter", () => fire(i)));
      const calls = [];
      B.s.onKill(() => { calls.forEach((c) => c.kill()); live.forEach((t) => t.kill()); });
      return B.api({
        /** Demo: los gestos en ola. */
        play() { B.parts.forEach((_, i) => calls.push(gsap.delayedCall(i * .11, fire, [i]))); },
        reset() { live.forEach((t) => t.progress(1)); },
      });
    },
  });
})();
