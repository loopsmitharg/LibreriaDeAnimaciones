/* 13 · Horizontal Letter Journey — el scroll vertical cuenta una secuencia horizontal. */
(() => {
  const LST = window.LoopSmithType, { gsap, h, seg, lerp } = LST.kit;
  LST.register({
    id: "horizontal-journey", n: "13", group: "B", scroll: true, name: "Horizontal Letter Journey", hint: ["scroll"],
    lead: "Cada carácter entra solo desde la derecha, se presenta en grande y viaja a ocupar su lugar en la palabra que se va formando abajo. Al final, el nombre completo sube al centro.",
    fields: [["length", "Largo del recorrido (pantallas)", 6, 4, 10, .5], ["scrub", "Inercia del scroll (s)", .5, 0, 1.5, .05]],
    tech: "Cada pieza tiene su ventana del progreso con tres tiempos: entrada, presentación y viaje al wordmark. La regla inferior se desplaza en horizontal con el progreso total para sostener la lectura de recorrido.",
    mobile: "La letra protagonista se limita al ancho disponible y el wordmark en formación se achica.",
    mount(host, o) {
      const B = LST.base(host, o, {
        scroll: {
          length: o.length, phases: [[0, "Inicio"], [.04, "Presentación"], [.9, "Palabra completa"]],
          after: `<p class="lst-kicker">Siguiente sección</p><h3>Diez piezas, un nombre.</h3>`,
        },
      });
      const cap = h("div", "lst-caption", "<b></b><span></span>"), rail = h("div", "lst-rail");
      rail.innerHTML = B.parts.map((_, i) => `<i>${String(i + 1).padStart(2, "0")}</i>`).join("");
      B.stage.append(rail, cap);
      const names = B.parts.map((el) => el.dataset.char || "Símbolo");
      const enter = gsap.parseEase("power3.out"), travel = gsap.parseEase("power3.inOut"), rise = gsap.parseEase("power3.inOut");
      const sc = B.scrollScene((p) => {
        const end = rise(seg(p, .9, 1)), k = lerp(.55, 1, end), Yc = lerp(B.H * .3, 0, end); // el wordmark espera abajo, más chico
        gsap.set(B.logo.el, { y: Yc, scale: k });
        const win = .86 / B.n;
        let current = -1;
        B.parts.forEach((el, i) => {
          const u = seg(p, .04 + i * win, .04 + (i + 1) * win), c = B.c(i);
          if (u > 0 && u < 1) current = i;
          const S = Math.min((B.H * .42) / c.h, (B.W * .46) / c.w) / k;                     // tamaño de presentación
          const hx = -c.x, hy = (-B.H * .1 - Yc) / k - c.y;                                 // centro del escenario, en coordenadas del logo
          const a = enter(seg(u, 0, .42)), b = travel(seg(u, .58, 1));
          gsap.set(el, {
            x: lerp(lerp(hx + (B.W * .8) / k, hx, a), 0, b), y: lerp(hy, 0, b),
            scale: lerp(S, 1, b), rotation: lerp(10, 0, a), opacity: u > 0 ? Math.min(1, a * 3) : 0,
          });
        });
        const on = current >= 0 ? seg(seg(p, .04 + current * win, .04 + (current + 1) * win), .12, .3) * (1 - seg(seg(p, .04 + current * win, .04 + (current + 1) * win), .55, .7)) : 0;
        cap.style.opacity = on;
        if (current >= 0) { cap.children[0].textContent = String(current + 1).padStart(2, "0") + " / " + String(B.n).padStart(2, "0"); cap.children[1].textContent = names[current]; }
        rail.style.transform = `translateX(${-seg(p, .04, .9) * (rail.scrollWidth - B.W * .5)}px)`;
        rail.style.opacity = 1 - end;
      }, { scrub: o.scrub });
      return B.api({ play: sc.play, pause: sc.pause, reset: sc.reset });
    },
  });
})();
