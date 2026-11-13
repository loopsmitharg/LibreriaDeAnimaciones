/* 15 · Section Transition Wordmark — el logo lleva de una sección a la siguiente. */
(() => {
  const LST = window.LoopSmithType, { gsap, h, seg, track, applyPose, rand } = LST.kit;
  LST.register({
    id: "section-transition", n: "15", group: "B", scroll: true, name: "Section Transition Wordmark", hint: ["scroll"],
    lead: "Al dejar la primera sección, el logo se descompone, sus letras cruzan el viewport junto con el cambio de fondo y aterrizan convertidas en la marca del encabezado de la sección siguiente.",
    fields: [["length", "Largo del recorrido (pantallas)", 3.5, 2.5, 6, .25], ["scale", "Tamaño final en el encabezado", .3, .18, .5, .01], ["scrub", "Inercia del scroll (s)", .5, 0, 1.5, .05]],
    tech: "La sección 02 sube como una cortina mientras las letras viajan entre dos poses: logo centrado y logo de encabezado (misma geometría, escalada). La tinta de cada letra cambia de clara a oscura en el momento exacto en que la cortina pasa por detrás de ella.",
    mobile: "El encabezado usa el mismo margen proporcional; el título de la sección 02 se achica.",
    mount(host, o) {
      const B = LST.base(host, o, { scroll: { length: o.length, phases: [[0, "Sección 01"], [.12, "Descomposición"], [.5, "Cruce"], [.86, "Sección 02"]] } });
      const first = h("div", "lst-sec lst-sec--a", `<p class="lst-kicker">Sección 01</p><h3>Una marca<br>que no se queda quieta.</h3>`);
      const next = h("div", "lst-sec lst-sec--b", `<span class="lst-sec__rule"></span><div><p class="lst-kicker">Sección 02</p><h3>Y ahora firma<br>el encabezado.</h3></div>`);
      B.stage.prepend(first, next);
      const k = o.scale, ink = gsap.utils.interpolate("#f8fafc", "#0b1120"), acc = gsap.utils.interpolate("#a3e635", "#43700c");
      const header = (i) => {
        const c = B.c(i), pad = Math.max(16, B.W * .045), f = B.logo.px;
        const X0 = -B.W / 2 + pad + (k * B.logo.width * f) / 2, Y0 = -B.H / 2 + pad + (k * f) / 2;
        return { x: X0 + k * c.x - c.x, y: Y0 + k * c.y - c.y, s: k };
      };
      const tr = track([
        { at: 0, pose: null }, { at: .12, pose: null },
        { at: .5, ease: "power2.inOut", stagger: .3, pose: (i) => { const r = rand(i * 5 + 9); return { ...B.to(i, (i / (B.n - 1) - .5) * B.W * .8, -B.H * .1 - r() * B.H * .32), r: (r() - .5) * 150, s: .7 + r() * 1.1 }; } },
        { at: .86, ease: "power3.inOut", stagger: .25, pose: header },
        { at: 1, pose: header },
      ], B.n);
      const measure = () => tr.measure(); measure(); B.onResize(measure);
      const sc = B.scrollScene((p) => {
        const pose = tr.at(p), up = seg(p, .2, .78), edge = B.H * (1 - up) - B.H / 2;   // borde superior de la cortina
        applyPose(B.parts, pose);
        B.letters.forEach((el) => {
          const i = B.parts.indexOf(el), c = B.c(i), t = seg(c.y + pose[i].y, edge - c.h * pose[i].s * .5, edge + c.h * pose[i].s * .5);
          el.style.color = (el.dataset.word === "1" ? acc : ink)(t);
        });
        next.style.transform = `translateY(${(1 - up) * 100}%)`;
        first.style.opacity = 1 - seg(p, .1, .4);
        first.style.transform = `translateY(${-seg(p, .1, .6) * 18}%)`;
        next.lastChild.style.opacity = seg(p, .8, .94);
        next.lastChild.style.transform = `translateY(${(1 - seg(p, .8, .94)) * 24}px)`;
        next.firstChild.style.transform = `scaleX(${seg(p, .82, .98)})`;
      }, { scrub: o.scrub });
      return B.api({ play: sc.play, pause: sc.pause, reset: sc.reset });
    },
  });
})();
