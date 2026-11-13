/* 27 · Perspective Letter Cards — cada letra es un objeto con profundidad (CSS 3D). */
(() => {
  const LST = window.LoopSmithType, { gsap, h, clamp, lerp, pointer } = LST.kit;
  LST.register({
    id: "perspective-cards", n: "27", group: "D", name: "Perspective Letter Cards", hint: ["hover", "click"],
    lead: "Cada carácter flota sobre su propia tarjeta. Las tarjetas se inclinan hacia el cursor, la letra se despega del fondo por paralaje y un clic las pliega de vuelta en el logo.",
    fields: [["tilt", "Inclinación máxima (°)", 22, 0, 40, 1], ["depth", "Despegue de la letra (px)", 46, 0, 120, 2], ["perspective", "Perspectiva (px)", 900, 400, 1800, 20]],
    tech: "perspective en el escenario y preserve-3d en el logo. La tarjeta rota en X/Y; la letra comparte el giro, avanza en Z y se corre en sentido contrario al giro para que el paralaje sea legible.",
    mobile: "Las tarjetas pasan a una grilla de 5×2. Deslizar el dedo inclina; tocar pliega y despliega.",
    mount(host, o) {
      const B = LST.base(host, o, { className: "lst--3d" }), p = pointer(B), n = B.n;
      B.stage.style.perspective = o.perspective + "px";
      const cards = B.parts.map(() => { const c = h("i", "lst-card"); B.logo.el.prepend(c); return c; });
      const st = B.parts.map(() => ({ rx: 0, ry: 0, z: 0 }));
      const mix = { m: 0 };
      let open = false, on = false, mixTween;
      const frame = (_t, dms) => {
        const a = 1 - Math.exp(-(Math.min(dms, 50) / 1000) * 9);
        const cols = B.W > B.H * 1.1 && B.W > 620 ? n : 5, rows = Math.ceil(n / cols);
        const T = Math.min((B.W * .9) / cols, (B.H * .72) / rows), gap = T * .1, size = T - gap;
        const big = Math.max(...B.letters.map((_, i) => B.c(i + (n - B.letters.length)).h), 1);
        let moving = mix.m > 0 && mix.m < 1;
        B.parts.forEach((el, i) => {
          const c = B.c(i), X = ((i % cols) - (cols - 1) / 2) * T, Y = (Math.floor(i / cols) - (rows - 1) / 2) * T, s = st[i];
          const dx = (p.x - X) / T, dy = (p.y - Y) / T, live = p.inside && open;
          const f = live ? Math.max(0, 1 - Math.hypot(dx, dy) / 2.6) : 0;
          const ry = live ? clamp(dx * o.tilt * .55, -o.tilt, o.tilt) * (.35 + f * .65) : 0, rx = live ? clamp(-dy * o.tilt * .55, -o.tilt, o.tilt) * (.35 + f * .65) : 0;
          s.rx += (rx - s.rx) * a; s.ry += (ry - s.ry) * a; s.z += (f * 40 - s.z) * a;
          if (Math.abs(rx - s.rx) + Math.abs(ry - s.ry) > .05) moving = true;
          const m = mix.m, k = el === B.logo.symbol ? (size * .5) / c.w : (size * .42) / big;
          // La letra flota por delante: Z propio + corrimiento contrario al giro (paralaje).
          gsap.set(el, { x: (X - c.x + s.ry * o.depth * .02) * m, y: (Y - c.y - s.rx * o.depth * .02) * m, z: (o.depth + s.z) * m, rotationX: s.rx * m, rotationY: s.ry * m, scale: lerp(1, k, m) });
          gsap.set(cards[i], { xPercent: -50, yPercent: -50, x: X, y: Y, z: s.z * m, rotationX: s.rx, rotationY: s.ry, width: size, height: size, opacity: m, scale: lerp(.6, 1, m) });
        });
        if (!moving && !p.inside) stop();
      };
      const start = () => { if (!on) { on = true; gsap.ticker.add(frame); } };
      const stop = () => { if (on) { on = false; gsap.ticker.remove(frame); } };
      const toggle = (to = !open) => {
        open = to; start(); mixTween && mixTween.kill();
        mixTween = gsap.to(mix, { m: open ? 1 : 0, duration: 1, ease: open ? "expo.out" : "power3.inOut", onUpdate: start });
      };
      B.s.on(B.stage, "click", () => toggle());
      B.s.on(B.stage, "touchmove", (e) => e.preventDefault(), { passive: false });
      p.onMove = start; p.onLeave = start;
      B.onResize(start);
      B.s.onKill(() => { stop(); mixTween && mixTween.kill(); });
      frame(0, 16);
      return B.api({ play: () => toggle(), reset: () => toggle(false) });
    },
  });
})();
