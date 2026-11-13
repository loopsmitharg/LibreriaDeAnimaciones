/* 10 · Scroll Explosion — el logo se abre y deja pasar contenido entre sus letras. */
(() => {
  const LST = window.LoopSmithType, { h, seg, track, applyPose, rand } = LST.kit;
  const NOTES = [["01", "Automatizaciones"], ["02", "Tableros de datos"], ["03", "Desarrollo web"]];
  LST.register({
    id: "scroll-explosion", n: "10", group: "B", scroll: true, name: "Scroll Explosion", hint: ["scroll"],
    lead: "Arranca con el logo completo. Al avanzar, las letras se separan en todas direcciones, cambian de profundidad y dejan aparecer bloques de contenido entre ellas, hasta salir del cuadro.",
    fields: [["length", "Largo del recorrido (pantallas)", 4, 2.5, 7, .25], ["depth", "Contraste de profundidad", 1, .3, 2, .05], ["scrub", "Inercia del scroll (s)", .5, 0, 1.5, .05]],
    tech: "Cada letra tiene un vector de salida y una escala propia (profundidad aparente). Los bloques de texto ocupan ventanas del progreso entre las letras cercanas y las lejanas.",
    mobile: "Los bloques se apilan en el centro; las letras salen por los cuatro bordes.",
    mount(host, o) {
      const B = LST.base(host, o, {
        scroll: {
          length: o.length, phases: [[0, "Logo"], [.12, "Separación"], [.3, "Contenido"], [.84, "Salida"]],
          after: `<p class="lst-kicker">Siguiente sección</p><h3>Entra limpia: no queda<br>ninguna letra en cuadro.</h3>`,
        },
      });
      const notes = NOTES.map(([n, t]) => { const e = h("div", "lst-note", `<small>${n}</small><strong>${t}</strong>`); B.stage.append(e); return e; });
      const out = (k) => (i) => {
        const r = rand(i * 13 + 5), a = (i / B.n) * 6.283 + r() * .9, far = r();
        const s = 1 + (far > .5 ? (far - .5) * 9 : -(.5 - far) * 1.3) * o.depth * k;   // cerca = enorme, lejos = chica
        const d = Math.hypot(B.W, B.H) * (.34 + far * .5) * k;
        return { x: Math.cos(a) * d, y: Math.sin(a) * d * .8, r: (r() - .5) * 120 * k, s: Math.max(.3, B.parts[i] === B.logo.symbol ? 1 + (s - 1) * .3 : s), o: k > 1 ? 0 : 1 };
      };
      const tr = track([
        { at: 0, pose: null }, { at: .12, pose: null },
        { at: .78, ease: "power1.inOut", stagger: .15, pose: out(1) },
        { at: .96, ease: "power2.in", pose: out(1.9) },
        { at: 1, pose: out(1.9) },
      ], B.n);
      const measure = () => tr.measure(); measure(); B.onResize(measure);
      const sc = B.scrollScene((p) => {
        applyPose(B.parts, tr.at(p));
        notes.forEach((e, k) => {
          const a = .26 + k * .18, t = seg(p, a, a + .08) * (1 - seg(p, a + .2, a + .28));
          e.style.opacity = t; e.style.transform = `translate(-50%, calc(-50% + ${(1 - seg(p, a, a + .28)) * 60 - 30}px)) scale(${.94 + t * .06})`;
        });
      }, { scrub: o.scrub });
      return B.api({ play: sc.play, pause: sc.pause, reset: sc.reset });
    },
  });
})();
