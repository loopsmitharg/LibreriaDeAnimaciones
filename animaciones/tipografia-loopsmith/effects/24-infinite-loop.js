/* 24 · Infinite Letter Loop — un ciclo perfecto que siempre vuelve al logo. */
(() => {
  const LST = window.LoopSmithType, { gsap } = LST.kit;
  LST.register({
    id: "infinite-loop", n: "24", group: "D", name: "Infinite Letter Loop", hint: ["auto"],
    lead: "Cada letra sale de la palabra, describe un lazo y vuelve a entrar. Todas usan la misma curva con radios emparentados y un pequeño desfase: la ola recorre el nombre y se cierra sobre sí misma.",
    fields: [["period", "Duración del ciclo (s)", 6, 3, 14, .5], ["radius", "Radio del lazo", 1, .4, 1.8, .05], ["lag", "Desfase entre letras", .03, .01, .04, .002], ["autoplay", "Reproducir al montar", true]],
    tech: "La posición es una función periódica del tiempo: un círculo tangente al lugar de reposo, recorrido con velocidad nula en ambos extremos. El último cuadro del ciclo es el primero; durante un instante el logo está completo.",
    mobile: "Sin interacción: corre solo y se pausa con el botón.",
    mount(host, o) {
      const B = LST.base(host, o), ACTIVE = .6;
      let t = 0, on = false;
      const frame = (_t, dms) => {
        t += Math.min(dms, 50) / 1000;
        B.parts.forEach((el, i) => {
          const u = (((t / o.period - i * o.lag) % 1) + 1) % 1;
          if (u >= ACTIVE) return gsap.set(el, { x: 0, y: 0, rotation: 0, scale: 1 });
          const v = u / ACTIVE, s = v - Math.sin(6.2832 * v) / 6.2832, th = 6.2832 * s;  // arranca y llega con velocidad cero
          const R = B.logo.px * (.42 + (i % 3) * .16) * o.radius, dir = el.dataset.word === "1" ? -1 : 1;
          gsap.set(el, { x: dir * R * Math.sin(th), y: -R * (1 - Math.cos(th)), rotation: dir * 360 * s, scale: 1 + .22 * Math.sin(Math.PI * s) });
        });
      };
      const stop = () => { if (on) { on = false; gsap.ticker.remove(frame); } };
      B.s.onKill(stop);
      const api = B.api({
        play() { if (!on) { on = true; gsap.ticker.add(frame); } },
        pause: stop,
        reset() { stop(); t = 0; B.logo.restore(.6); },
      });
      if (o.autoplay) api.play();
      return api;
    },
  });
})();
