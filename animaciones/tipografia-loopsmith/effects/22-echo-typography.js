/* 22 · Echo Typography — cada letra deja una estela de sí misma. */
(() => {
  const LST = window.LoopSmithType, { gsap } = LST.kit;
  LST.register({
    id: "echo-typography", n: "22", group: "C", name: "Echo Typography", hint: ["play"],
    lead: "Las letras entran en arco y cada una arrastra ecos que repiten su trayectoria un instante después, cada vez más tenues, hasta fundirse con la original.",
    fields: [["echoes", "Ecos por letra", 3, 1, 5, 1], ["lag", "Retraso entre ecos (s)", .055, .02, .15, .005], ["duration", "Duración (s)", 1.15, .5, 2.5, .05]],
    tech: "Los ecos son clones de la pieza (misma geometría) que corren el mismo tween con retraso y menos opacidad. Al llegar coinciden píxel a píxel con la original y se apagan: no queda rastro ni glitch.",
    mobile: "Menos recorrido lateral en pantallas angostas (depende del ancho del contenedor).",
    mount(host, o) {
      const B = LST.base(host, o), tl = gsap.timeline({ paused: true, onComplete: () => gsap.set(B.parts, { clearProps: "transform" }) });
      const all = [];
      tl.set(B.parts, { opacity: 0 }, 0);
      B.parts.forEach((el, i) => {
        const dir = i % 2 ? -1 : 1, at = .1 + i * .075;
        const group = [el];
        for (let k = 1; k <= o.echoes; k++) { const e = el.cloneNode(true); e.classList.add("lst-echo"); e.style.opacity = 0; el.before(e); group.push(e); all.push(e); }
        group.forEach((g, k) => {
          const t = at + k * o.lag, a = k ? .42 / k : 1;
          tl.set(g, { opacity: a }, t)
            .fromTo(g, { x: () => B.W * .42 }, { x: 0, duration: o.duration, ease: "expo.out", immediateRender: false }, t)                       // avance: frena fuerte
            .fromTo(g, { y: () => dir * B.H * .26, rotation: dir * 38, scale: 1.5 }, { y: 0, rotation: 0, scale: 1, duration: o.duration, ease: "power3.out", immediateRender: false }, t); // arco: frena distinto
          if (k) tl.to(g, { opacity: 0, duration: o.duration * .45, ease: "power1.in" }, t + o.duration * .5);
        });
      });
      B.s.keep(tl);
      return B.api({ play: () => tl.restart(), pause: () => tl.pause(), reset: () => { tl.progress(1).pause(); gsap.set(all, { opacity: 0 }); } });
    },
  });
})();
