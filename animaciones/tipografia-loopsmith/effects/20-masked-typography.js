/* 20 · Masked Typography — el logo aparece y desaparece por máscaras geométricas. */
(() => {
  const LST = window.LoopSmithType, { gsap, lerp, clamp } = LST.kit;
  // Cada máscara recibe t (0 oculto .. 1 visible) y devuelve { clip } o { mask }. Bordes duros siempre.
  const MASKS = {
    vertical: (t) => ({ mask: `repeating-linear-gradient(90deg, #000 0 ${t * 8}%, transparent 0 8%)` }),
    diagonal: (t) => { const w = t * 86; return { clip: `polygon(${60 - w}% -10%, ${60 + w}% -10%, ${40 + w}% 110%, ${40 - w}% 110%)` }; },
    bands: (t) => ({ mask: `repeating-linear-gradient(0deg, #000 0 ${clamp(t * 1.5) * 25}%, transparent 0 25%), repeating-linear-gradient(90deg, #000 0 ${clamp(t * 1.5 - .5) * 12.5}%, transparent 0 12.5%)` }),
    window: (t) => {
      const go = clamp(t / .6), open = clamp((t - .6) / .4), x = go * 78;
      return { clip: `inset(${lerp(18, -20, open)}% ${lerp(78 - x, -5, open)}% ${lerp(18, -20, open)}% ${lerp(x, -5, open)}%)` };
    },
  };
  LST.register({
    id: "masked-typography", n: "20", group: "C", name: "Masked Typography", hint: ["play"],
    lead: "Cuatro formas de revelar y ocultar la marca: persianas verticales, apertura diagonal, franjas superpuestas y una ventana que recorre el logo antes de abrirse.",
    fields: [["mode", "Máscara", "all", { all: "Secuencia completa", vertical: "Persianas verticales", diagonal: "Apertura diagonal", bands: "Franjas superpuestas", window: "Ventana móvil" }], ["duration", "Duración (s)", 1.2, .5, 2.5, .05], ["loop", "Repetir", true]],
    tech: "clip-path (polígono, inset) y mask-image con gradientes de corte duro. La máscara se aplica al contenedor del logo; las letras no se tocan.",
    mobile: "Las máscaras usan porcentajes del logo: escalan con él.",
    mount(host, o) {
      const B = LST.base(host, o), el = B.logo.el, st = { t: 1 };
      const clear = () => { el.style.clipPath = el.style.maskImage = el.style.webkitMaskImage = ""; };
      const paint = (name) => () => {
        if (st.t > .999) return clear();   // abierta del todo: sin máscara, sin líneas de redondeo
        const m = MASKS[name](st.t);
        el.style.clipPath = m.clip || "none";
        el.style.webkitMaskImage = el.style.maskImage = m.mask || "none";
      };
      const names = o.mode === "all" ? Object.keys(MASKS) : [o.mode];
      const tl = gsap.timeline({ paused: true, repeat: o.loop ? -1 : 0, onComplete: clear });
      names.forEach((name) => {
        tl.fromTo(st, { t: 0 }, { t: 1, duration: o.duration, ease: "expo.inOut", onUpdate: paint(name), immediateRender: false })
          .to(st, { t: 0, duration: o.duration * .75, ease: "expo.inOut", onUpdate: paint(name) }, "+=.8");
      });
      // Cierre: la última vuelta termina visible para que el logo quede en pantalla.
      tl.fromTo(st, { t: 0 }, { t: 1, duration: o.duration, ease: "expo.inOut", onUpdate: paint(names[0]), immediateRender: false }).to({}, { duration: 1 });
      B.s.keep(tl);
      return B.api({ play: () => tl.restart(), pause: () => tl.pause(), reset: () => { tl.pause(0); clear(); } });
    },
  });
})();
