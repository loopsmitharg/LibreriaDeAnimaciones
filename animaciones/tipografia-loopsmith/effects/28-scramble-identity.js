/* 28 · Scramble to Identity — un desorden de glifos reales que se resuelve en el nombre. */
(() => {
  const LST = window.LoopSmithType, { gsap } = LST.kit;
  LST.register({
    id: "scramble-identity", n: "28", group: "D", name: "Scramble to Identity", hint: ["play"],
    lead: "Cada posición del nombre cicla entre los glifos del propio logo, fuera de registro. De izquierda a derecha, una por una, se traban en la letra correcta hasta revelar la marca.",
    fields: [["rate", "Cambios por segundo", 16, 6, 30, 1], ["hold", "Demora por letra (s)", .17, .06, .4, .01], ["chaos", "Desorden vertical", 1, 0, 2, .1]],
    tech: "El desorden no usa texto ni otra fuente: cada ranura muestra contornos del propio logo (logo-data.js) alineados a la línea base. Cuando traba, el glifo provisorio se retira y aparece la pieza original, intacta.",
    mobile: "Sin cambios.",
    mount(host, o) {
      const B = LST.base(host, o), D = LST.logoData.letters, L = B.letters, off = B.n - L.length;
      const slots = L.map((el, i) => {
        const s = el.cloneNode(true);
        s.classList.add("lst-scr"); s.style.opacity = 0;
        el.before(s);
        return { s, el, g: B.logo.geom[i + off], svg: s.firstChild, path: s.querySelector("path") };
      });
      const show = (slot) => {
        const g = D[Math.floor(Math.random() * D.length)];
        slot.svg.setAttribute("viewBox", `0 0 ${g.vw} ${g.vh}`); slot.path.setAttribute("d", g.d);
        // centrado en la ranura, apoyado en su propia línea base
        Object.assign(slot.s.style, { left: slot.g.x + slot.g.w / 2 - g.w / 2 + "em", top: g.y + "em", width: g.w + "em", height: g.h + "em" });
        gsap.set(slot.s, { y: (Math.random() - .5) * B.logo.px * .22 * o.chaos, rotation: (Math.random() - .5) * 14 * o.chaos });
      };
      let t = 0, acc = 0, on = false, locked = 0;
      const lock = (slot) => {
        slot.s.style.opacity = 0;
        gsap.set(slot.el, { opacity: 1 });
        gsap.fromTo(slot.el, { y: -B.logo.px * .07, scale: 1.14 }, { y: 0, scale: 1, duration: .55, ease: "back.out(2.2)", overwrite: true });
      };
      const frame = (_t, dms) => {
        const dt = Math.min(dms, 50) / 1000; t += dt; acc += dt;
        while (locked < slots.length && t > .7 + locked * o.hold) lock(slots[locked++]);
        if (acc > 1 / o.rate) { acc = 0; for (let i = locked; i < slots.length; i++) show(slots[i]); }
        if (locked >= slots.length) stop();
      };
      const stop = () => { if (on) { on = false; gsap.ticker.remove(frame); } };
      B.s.onKill(stop);
      return B.api({
        play() {
          stop(); t = acc = locked = 0;
          gsap.killTweensOf(B.parts);
          gsap.set(L, { opacity: 0 });
          slots.forEach((s) => { s.s.style.opacity = .8; show(s); });
          if (B.logo.symbol) gsap.fromTo(B.logo.symbol, { scale: .4, rotation: -90, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: .8, ease: "back.out(1.6)" });
          on = true; gsap.ticker.add(frame);
        },
        pause: stop,
        reset() { stop(); slots.forEach((s) => (s.s.style.opacity = 0)); B.logo.restore(); },
      });
    },
  });
})();
