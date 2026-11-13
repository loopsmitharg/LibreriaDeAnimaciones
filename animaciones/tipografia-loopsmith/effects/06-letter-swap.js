/* 06 · Letter Swap — reordenar la palabra arrastrando letras. */
(() => {
  const LST = window.LoopSmithType, { gsap, clamp, drag } = LST.kit;
  LST.register({
    id: "letter-swap", n: "06", group: "A", name: "Letter Swap", hint: ["drag"],
    lead: "Arrastrá una letra sobre otra para intercambiarlas. Las intermedias se corren para abrirle lugar y Reset recompone el nombre.",
    fields: [["duration", "Duración del reacomodo (s)", .5, .2, 1.2, .05]],
    tech: "El orden es un arreglo de ranuras. Al cruzar el centro de una vecina se permuta el arreglo y cada letra viaja a su nueva ranura con transform (FLIP: se calcula el destino, se anima solo la diferencia). Con el orden original las posiciones son exactamente las del logo.",
    mobile: "Arrastre táctil. El símbolo queda fijo: solo se reordenan las letras.",
    mount(host, o) {
      const B = LST.base(host, o), L = B.letters, n = L.length, off = B.parts.length - n;
      const G = B.logo.geom.slice(off);
      const gaps = G.map((g, i) => (i < n - 1 ? G[i + 1].x - (g.x + g.w) : 0)); // la separación pertenece a la ranura
      let order = L.map((_, i) => i), held = -1, x0 = 0;
      /** x destino (px) de cada letra según el orden actual. */
      const targets = () => {
        const f = B.logo.px, t = new Array(n); let x = G[0].x;
        order.forEach((k, slot) => { t[k] = { x: (x - G[k].x) * f, mid: (x + G[k].w / 2) * f }; x += G[k].w + gaps[slot]; });
        return t;
      };
      const settle = (dur = o.duration, arc = false) => {
        const t = targets();
        L.forEach((el, k) => {
          if (k === held) return;
          gsap.to(el, { x: t[k].x, duration: dur, ease: "power3.out", overwrite: "auto" });
          if (arc) gsap.fromTo(el, { y: 0 }, { y: (k % 2 ? -1 : 1) * B.logo.px * .2, duration: dur / 2, ease: "sine.out", yoyo: true, repeat: 1 });
        });
      };
      drag(B, L, {
        start(k) { held = k; x0 = +gsap.getProperty(L[k], "x"); gsap.to(L[k], { scale: 1.1, duration: .2, overwrite: "auto" }); },
        move(k, dx, dy, e) {
          const f = B.logo.px;
          gsap.set(L[k], { x: x0 + dx, y: dy, rotation: clamp(e.movementX * 1.2, -14, 14) });
          const mid = G[k].x * f + x0 + dx + (G[k].w * f) / 2, t = targets();
          let slot = order.indexOf(k), moved = false;
          while (slot < n - 1 && mid > t[order[slot + 1]].mid) { [order[slot], order[slot + 1]] = [order[slot + 1], order[slot]]; slot++; moved = true; }
          while (slot > 0 && mid < t[order[slot - 1]].mid) { [order[slot], order[slot - 1]] = [order[slot - 1], order[slot]]; slot--; moved = true; }
          if (moved) settle();
        },
        end(k) { held = -1; gsap.to(L[k], { x: targets()[k].x, y: 0, rotation: 0, scale: 1, duration: .55, ease: "back.out(1.6)", overwrite: true }); },
      });
      B.onResize(() => { const t = targets(); L.forEach((el, k) => gsap.set(el, { x: t[k].x })); });
      const original = () => order.every((k, i) => k === i);
      const api = B.api({
        /** Demo: mezcla; la siguiente llamada recompone. */
        play() {
          if (!original()) return api.reset();
          for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
          settle(.7, true);
        },
        reset() { order = L.map((_, i) => i); settle(.7, true); },
      });
      B.s.onKill(() => gsap.killTweensOf(L));
      return api;
    },
  });
})();
