/* ==========================================================================
   Granel · ilustraciones (sprite SVG de la página)
   Se inserta al principio del <body> con un <script> normal (no defer), así
   los <use>, los patrones y el recorte del frasco pintan también abriendo el
   HTML directo (file://). Las formas al azar usan una semilla: salen iguales.
   Patrones (texturas a granel, 48×48, para rellenar frascos):
     #p-avena #p-almendra #p-pasa #p-chia #p-coco #p-girasol #p-nuez
     #p-garbanzo #p-lenteja #p-harina #p-pimenton #p-quinoa
   Frasco (viewBox 0 0 300 420):
     #c-frasco      clipPath del interior del frasco
     #frasco        vidrio, brillo y rosca (va encima del contenido)
     #tapa          tapa de lata con etiqueta kraft
   Sueltos (viewBox 0 0 100 100, centrados, para la pila con física):
     #s-almendra #s-nuez #s-avellana #s-caju #s-mani #s-pasa
   Marca: #logo (hoja dentro de un frasco)
   ========================================================================== */
(() => {
  const azar = (semilla) => () => {
    semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const f = (n) => Math.round(n * 10) / 10;

  // Un patrón: fondo + n piezas repartidas al azar (con copias en los bordes para que empalme).
  const patron = (id, fondo, n, semilla, pieza) => {
    const r = azar(semilla); let d = '';
    for (let i = 0; i < n; i++) {
      const x = r() * 48, y = r() * 48, a = r() * 180, k = .8 + r() * .4;
      [[0, 0], [-48, 0], [0, -48], [-48, -48]].forEach(([dx, dy]) => {
        const px = x + dx, py = y + dy;
        if (px > -16 && py > -16 && px < 64 && py < 64) d += pieza(f(px), f(py), f(a), k, r);
      });
    }
    return `<pattern id="${id}" width="48" height="48" patternUnits="userSpaceOnUse"><rect width="48" height="48" fill="${fondo}"/>${d}</pattern>`;
  };
  const elipse = (rx, ry, colores) => (x, y, a, k, r) =>
    `<ellipse cx="${x}" cy="${y}" rx="${f(rx * k)}" ry="${f(ry * k)}" fill="${colores[Math.floor(r() * colores.length)]}" transform="rotate(${a} ${x} ${y})"/>`;

  const patrones = [
    patron('p-avena', '#d9c49a', 22, 1, elipse(6, 4, ['#efdfb8', '#e4cf9f', '#f6ead0'])),
    patron('p-almendra', '#7a4a2a', 10, 2, (x, y, a, k, r) => `<ellipse cx="${x}" cy="${y}" rx="${f(10 * k)}" ry="${f(6 * k)}" fill="${r() > .5 ? '#a8693e' : '#94572f'}" transform="rotate(${a} ${x} ${y})"/><path d="M${x - 6} ${y} Q${x} ${y - 2} ${x + 6} ${y}" stroke="#6b3c1f" stroke-width="1" fill="none" transform="rotate(${a} ${x} ${y})"/>`),
    patron('p-pasa', '#3a1f24', 16, 3, elipse(5.5, 4, ['#5a2c36', '#4a2430', '#6b3640'])),
    patron('p-chia', '#3b3936', 70, 4, elipse(1.6, 1.1, ['#8b8580', '#d8d2c8', '#5e5953', '#1f1d1b'])),
    patron('p-coco', '#f2ede2', 14, 5, (x, y, a, k) => `<rect x="${x - 7 * k}" y="${y - 3}" width="${f(14 * k)}" height="5" rx="2" fill="#ffffff" stroke="#e2d9c6" stroke-width=".8" transform="rotate(${a} ${x} ${y})"/>`),
    patron('p-girasol', '#cfc3a6', 20, 6, (x, y, a, k) => `<ellipse cx="${x}" cy="${y}" rx="${f(6 * k)}" ry="${f(2.8 * k)}" fill="#8c8270" transform="rotate(${a} ${x} ${y})"/><ellipse cx="${x}" cy="${y}" rx="${f(4 * k)}" ry="1" fill="#efe7d4" transform="rotate(${a} ${x} ${y})"/>`),
    patron('p-nuez', '#8a6238', 9, 7, (x, y, a, k) => `<path d="M${x - 9 * k} ${y} q3 -8 9 -6 q6 -2 9 6 q-3 8 -9 6 q-6 2 -9 -6z" fill="#c09060" stroke="#7a522c" stroke-width="1.2" transform="rotate(${a} ${x} ${y})"/>`),
    patron('p-garbanzo', '#c9a86a', 14, 8, (x, y, a, k) => `<circle cx="${x}" cy="${y}" r="${f(5.5 * k)}" fill="#e6c98c"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="${f(2 * k)}" fill="#f4dfb0"/>`),
    patron('p-lenteja', '#8a5a2e', 32, 9, elipse(3.6, 2.6, ['#b87a3c', '#a86b32', '#c98c4c'])),
    patron('p-harina', '#f6f1e6', 30, 10, elipse(1, 1, ['#e8dfcb', '#efe7d6'])),
    patron('p-pimenton', '#b6321e', 40, 11, elipse(1.6, 1.4, ['#d9482c', '#8f2414', '#e46a3a'])),
    patron('p-quinoa', '#e8dcc0', 46, 12, (x, y, a, k) => `<circle cx="${x}" cy="${y}" r="${f(2.4 * k)}" fill="#f7efdc" stroke="#cbb88f" stroke-width=".6"/>`),
  ].join('');

  document.body.insertAdjacentHTML('afterbegin', `
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    ${patrones}
    <clipPath id="c-frasco" clipPathUnits="userSpaceOnUse"><rect x="46" y="96" width="208" height="298" rx="26"/></clipPath>
    <linearGradient id="g-vidrio" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".18" stop-color="#fff" stop-opacity=".08"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".3"/></linearGradient>
  </defs>

  <symbol id="logo" viewBox="0 0 100 100">
    <rect x="22" y="26" width="56" height="64" rx="14" fill="none" stroke="currentColor" stroke-width="6"/>
    <rect x="30" y="12" width="40" height="12" rx="3" fill="currentColor"/>
    <path d="M50 80 C34 70 36 50 50 40 C64 50 66 70 50 80Z M50 78 V48" style="fill:var(--logo-hoja, #a8b97e)" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
  </symbol>

  <symbol id="frasco" viewBox="0 0 300 420">
    <rect x="40" y="90" width="220" height="310" rx="32" fill="url(#g-vidrio)" stroke="#2b2a1f" stroke-width="5"/>
    <path d="M70 92 V66 H230 V92" fill="rgba(255,255,255,.25)" stroke="#2b2a1f" stroke-width="5" stroke-linejoin="round"/>
    <path d="M74 74 H226 M74 82 H226" stroke="#2b2a1f" stroke-width="2.5" opacity=".45"/>
    <path d="M64 130 V360" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".55"/>
    <path d="M64 376 V384" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".55"/>
  </symbol>

  <symbol id="tapa" viewBox="0 0 300 420">
    <rect x="60" y="30" width="180" height="40" rx="8" fill="#c8643b" stroke="#2b2a1f" stroke-width="5"/>
    <path d="M76 42 V60 M96 42 V60 M116 42 V60 M136 42 V60 M156 42 V60 M176 42 V60 M196 42 V60 M216 42 V60" stroke="#2b2a1f" stroke-width="2.5" opacity=".35"/>
  </symbol>

  <symbol id="s-almendra" viewBox="0 0 100 100">
    <path d="M50 8 C76 26 82 70 50 92 C18 70 24 26 50 8Z" fill="#a8693e" stroke="#5e3218" stroke-width="4"/>
    <path d="M50 20 C40 40 40 64 50 84 M40 34 C36 48 38 62 44 74 M60 34 C64 48 62 62 56 74" stroke="#7a4524" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </symbol>
  <symbol id="s-nuez" viewBox="0 0 100 100">
    <path d="M50 10 C78 10 92 30 90 52 C88 78 70 92 50 90 C30 92 12 78 10 52 C8 30 22 10 50 10Z" fill="#c9995f" stroke="#6b4826" stroke-width="4"/>
    <path d="M50 14 V88 M30 24 C40 34 26 46 36 56 C46 66 30 76 38 84 M70 24 C60 34 74 46 64 56 C54 66 70 76 62 84" stroke="#7a522c" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  </symbol>
  <symbol id="s-avellana" viewBox="0 0 100 100">
    <circle cx="50" cy="56" r="36" fill="#9c6436" stroke="#4e2c14" stroke-width="4"/>
    <path d="M18 40 C24 16 76 16 82 40 C70 32 30 32 18 40Z" fill="#d8b27a" stroke="#4e2c14" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="38" cy="62" rx="9" ry="14" fill="#b67c46" transform="rotate(20 38 62)"/>
  </symbol>
  <symbol id="s-caju" viewBox="0 0 100 100">
    <path d="M22 20 C40 6 74 12 84 38 C94 64 76 92 52 90 C40 89 44 76 54 70 C66 62 64 40 50 34 C38 30 30 40 26 48 C18 62 8 40 22 20Z" fill="#f0d9a6" stroke="#9a7a42" stroke-width="4" stroke-linejoin="round"/>
  </symbol>
  <symbol id="s-mani" viewBox="0 0 100 100">
    <path d="M30 14 C48 6 62 22 56 38 C52 48 70 52 72 66 C76 86 52 98 36 86 C24 76 34 62 30 54 C26 46 12 42 14 30 C15 22 22 17 30 14Z" fill="#d9b071" stroke="#8a6630" stroke-width="4" stroke-linejoin="round"/>
    <path d="M24 26 L44 24 M28 36 L48 34 M40 66 L62 64 M38 76 L60 76" stroke="#b08a4c" stroke-width="2.5" stroke-linecap="round"/>
  </symbol>
  <symbol id="s-pasa" viewBox="0 0 100 100">
    <path d="M30 18 C52 6 82 20 84 46 C86 74 64 92 42 86 C20 80 12 58 16 40 C18 30 22 22 30 18Z" fill="#5a2c36" stroke="#2a1218" stroke-width="4"/>
    <path d="M32 34 C44 40 56 30 68 38 M28 54 C42 60 58 50 72 58 M36 72 C46 76 56 70 64 74" stroke="#7d4450" stroke-width="3" fill="none" stroke-linecap="round"/>
  </symbol>
</svg>`);
})();
