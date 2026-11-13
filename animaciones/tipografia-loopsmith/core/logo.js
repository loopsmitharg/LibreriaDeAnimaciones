/**
 * Master Logo: renderiza el lockup de Loop Smith con cada letra como pieza
 * independiente (un <span> con su SVG). La geometría vive en logo-data.js y
 * nunca se modifica: las animaciones solo tocan transform / opacity / clip-path.
 *
 *   const logo = LoopSmithType.createLogo(contenedor, { variant: "lockup" });
 *   logo.parts    -> [símbolo, L, o, o, p, S, m, i, t, h]
 *   logo.letters  -> solo letras      logo.symbol -> el símbolo (o null)
 *   logo.restore() / logo.restore(.8) -> vuelve al logo oficial (al instante o animado)
 *   logo.destroy()
 *
 * variant: "lockup" | "wordmark" | "symbol"   ·   tone: "site" | "render"
 * Colores: --lsl-ink ("Loop") y --lsl-accent ("Smith") en cualquier ancestro.
 */
(() => {
  const LST = (window.LoopSmithType = window.LoopSmithType || {});
  let uid = 0;

  LST.createLogo = (container, { variant = "lockup", tone = "site" } = {}) => {
    const D = LST.logoData, gsap = window.gsap;
    const withSymbol = variant !== "wordmark", withName = variant !== "symbol";
    const dx = withSymbol ? 0 : -D.nameX;
    const width = withName ? +(D.width + dx).toFixed(4) : 1;

    const el = document.createElement("div");
    el.className = "lsl";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "Loop Smith");
    el.style.setProperty("--lsl-w", width);

    const geom = [];
    const add = (cls, g, vw, vh, inner, data) => {
      const part = document.createElement("span");
      part.className = "lsl__part " + cls;
      Object.assign(part.dataset, data);
      part.style.cssText = `left:${g.x}em;top:${g.y}em;width:${g.w}em;height:${g.h}em`;
      part.innerHTML = `<svg viewBox="0 0 ${vw} ${vh}" aria-hidden="true" focusable="false">${inner}</svg>`;
      el.append(part);
      geom.push(g);
      return part;
    };

    let symbol = null;
    if (withSymbol) {
      const S = D.symbol, id = "lsl-g" + ++uid; // id único: varios logos por página sin choques
      const stops = (S.tones[tone] || S.tones.site).map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("");
      const r = S.radius * 100, pts = S.L.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");
      symbol = add("lsl__symbol", { x: 0, y: 0, w: 1, h: 1 }, 100, 100,
        `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs>` +
        `<rect width="100" height="100" rx="${r}" fill="url(#${id})"/>` +
        (tone === "render" ? "" : `<rect x="1.6" y="1.6" width="96.8" height="96.8" rx="${r - 1.6}" fill="none" stroke="#0a5a43" stroke-opacity=".28" stroke-width="3.2"/>`) +
        `<polygon points="${pts}" fill="${S.ink}"/>`, { part: "symbol" });
    }
    const letters = withName ? D.letters.map((l, i) =>
      add("lsl__letter", { x: +(l.x + dx).toFixed(4), y: l.y, w: l.w, h: l.h }, l.vw, l.vh, `<path d="${l.d}"/>`,
        { part: "letter", char: l.char, word: l.word, index: i })) : [];
    const parts = symbol ? [symbol, ...letters] : letters;

    container.append(el);

    const HOME = { x: 0, y: 0, z: 0, rotation: 0, rotationX: 0, rotationY: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, opacity: 1 };
    return {
      el, parts, letters, symbol, geom, width, px: 0,
      /** Tamaño en px del lado del símbolo (1em). */
      setSize(px) { this.px = px; el.style.fontSize = px + "px"; },
      restore(duration = 0, vars = {}) {
        gsap.killTweensOf(parts);
        if (!duration) return gsap.set(parts, { clearProps: "transform,opacity,clipPath,filter,zIndex,visibility" });
        gsap.set(parts, { clearProps: "clipPath,filter,visibility" });
        return gsap.to(parts, { ...HOME, duration, ease: "power3.out", overwrite: true, ...vars });
      },
      destroy() { gsap.killTweensOf(parts); el.remove(); },
    };
  };
})();
