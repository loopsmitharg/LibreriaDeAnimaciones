/* ==========================================================================
   Brasa · ilustraciones (sprite SVG compartido por las tres páginas)
   Se inserta al principio del <body> con un <script> normal (no defer), así
   los <use href="#…"> pintan también abriendo el HTML directo (file://).
   Las formas irregulares (bordes de la carne, ondas de la lechuga, gotas del
   queso, semillas) se generan acá con un azar con semilla: siempre salen iguales.
   Símbolos (vista lateral, 400 de ancho; el alto va en cada viewBox):
     #logo        llama dentro de un círculo (marca)
     #pan-base    pan de abajo                      400×80
     #lechuga     hoja de lechuga ondulada          400×50
     #carne       medallón smash con bordes crocantes 400×64
     #queso       feta de cheddar que chorrea       400×56
     #panceta     dos tiras de panceta              400×40
     #tomate      dos rodajas de tomate             400×34
     #cebolla     aros de cebolla morada            400×30
     #pepinos     pepinos en rodajas                400×30
     #salsa       salsa de la casa que gotea        400×30
     #pan-top     pan de arriba con sésamo          400×150
     #palillo     palillo con banderita             120×220
   ========================================================================== */
(() => {
  // Azar con semilla (mulberry32): mismas formas en cada carga.
  const azar = (semilla) => () => {
    semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const f = (n) => Math.round(n * 10) / 10;

  // Borde ondulado de x0 a x1 alrededor de y (curvas cúbicas alternadas).
  const onda = (x0, x1, y, amp, n, r, dir = 1) => {
    const paso = (x1 - x0) / n; let d = '';
    for (let i = 0; i < n; i++) {
      const a = x0 + paso * i, b = a + paso, s = (i % 2 ? 1 : -1) * dir;
      const k = amp * (.6 + r() * .8);
      d += ` C${f(a + paso * .35)} ${f(y + s * k)} ${f(b - paso * .35)} ${f(y + s * k)} ${f(b)} ${f(y + (r() - .5) * 2)}`;
    }
    return d;
  };
  const ondaVuelta = (x1, x0, y, amp, n, r) => {
    const paso = (x1 - x0) / n; let d = '';
    for (let i = 0; i < n; i++) {
      const a = x1 - paso * i, b = a - paso, s = i % 2 ? 1 : -1;
      const k = amp * (.6 + r() * .8);
      d += ` C${f(a - paso * .35)} ${f(y + s * k)} ${f(b + paso * .35)} ${f(y + s * k)} ${f(b)} ${f(y)}`;
    }
    return d;
  };

  /* ---- Lechuga ---- */
  const rL = azar(7);
  const lechuga = `M8 22${onda(8, 392, 18, 12, 14, rL)} L394 30${ondaVuelta(394, 8, 34, 8, 12, rL)} Z`;
  const lechugaVena = `M20 26${onda(20, 380, 26, 4, 10, rL)}`;

  /* ---- Carne smash: contorno con bultos crocantes ---- */
  const rC = azar(21);
  let bordes = '';
  for (let i = 0; i < 26; i++) {
    const x = 16 + i * 14.5 + rC() * 6, arriba = rC() > .5;
    bordes += `<ellipse cx="${f(x)}" cy="${arriba ? f(8 + rC() * 4) : f(54 + rC() * 4)}" rx="${f(8 + rC() * 8)}" ry="${f(4 + rC() * 4)}"/>`;
  }
  let textura = '';
  for (let i = 0; i < 46; i++) textura += `<ellipse cx="${f(30 + rC() * 340)}" cy="${f(16 + rC() * 32)}" rx="${f(2 + rC() * 5)}" ry="${f(1 + rC() * 2.2)}"/>`;

  /* ---- Queso: gotas que chorrean ---- */
  const rQ = azar(5);
  let queso = 'M16 4 Q14 0 24 0 H376 Q386 0 384 4 L388 16';
  [352, 300, 236, 168, 104, 52].forEach((x) => {
    const largo = 18 + rQ() * 26, ancho = 12 + rQ() * 10;
    queso += ` L${x + ancho} 16 Q${x + ancho} ${16 + largo} ${x + ancho / 2} ${16 + largo + 4} Q${x} ${16 + largo} ${x} 16`;
  });
  queso += ' L12 16 Z';

  /* ---- Sésamo ---- */
  const rS = azar(42);
  let sesamo = '';
  for (let i = 0; i < 30; i++) {
    const a = Math.PI * (.12 + rS() * .76), rad = .3 + rS() * .62;
    const x = 200 - Math.cos(a) * 170 * rad, y = 118 - Math.sin(a) * 104 * rad;
    sesamo += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="5.5" ry="2.6" transform="rotate(${f(rS() * 180)} ${f(x)} ${f(y)})"/>`;
  }

  /* ---- Pepinos ---- */
  let pepinos = '';
  [58, 150, 250, 342].forEach((x, i) => {
    pepinos += `<ellipse cx="${x}" cy="${15 + (i % 2) * 2}" rx="46" ry="12" fill="#4e7a24"/><ellipse cx="${x}" cy="${14 + (i % 2) * 2}" rx="38" ry="8" fill="#a9c95a"/>`
      + `<circle cx="${x - 14}" cy="${14 + (i % 2) * 2}" r="2" fill="#e7f0bf"/><circle cx="${x + 12}" cy="${13 + (i % 2) * 2}" r="2" fill="#e7f0bf"/><circle cx="${x}" cy="${17 + (i % 2) * 2}" r="2" fill="#e7f0bf"/>`;
  });

  /* ---- Salsa ---- */
  const rSa = azar(9);
  let salsa = 'M30 6 Q200 -4 370 6 Q380 12 368 14';
  [330, 262, 190, 120, 66].forEach((x) => {
    const largo = 6 + rSa() * 12;
    salsa += ` L${x + 10} 14 Q${x + 10} ${14 + largo} ${x + 5} ${16 + largo} Q${x} ${14 + largo} ${x} 14`;
  });
  salsa += ' L32 14 Q20 12 30 6 Z';

  document.body.insertAdjacentHTML('afterbegin', `
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="g-pan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0a24a"/><stop offset=".55" stop-color="#d9782a"/><stop offset="1" stop-color="#a9551b"/></linearGradient>
    <linearGradient id="g-carne" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b3620"/><stop offset="1" stop-color="#3a1a0e"/></linearGradient>
  </defs>

  <symbol id="logo" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="47" fill="currentColor"/>
    <path d="M50 18 C58 32 72 40 70 60 C69 74 60 82 50 82 C40 82 31 74 30 62 C29 52 36 46 40 38 C42 46 46 50 50 50 C48 40 46 28 50 18Z" style="fill:var(--logo-llama, #ffb81c)"/>
    <path d="M50 56 C54 62 58 66 57 72 C56 77 53 79 50 79 C47 79 44 77 43 72 C43 67 47 63 50 56Z" style="fill:var(--logo-centro, #fff4e2)"/>
  </symbol>

  <symbol id="pan-base" viewBox="0 0 400 80">
    <path d="M20 24 Q20 14 32 14 H368 Q380 14 380 24 L374 50 Q366 76 328 77 H72 Q34 76 26 50 Z" fill="url(#g-pan)"/>
    <path d="M20 24 Q20 14 32 14 H368 Q380 14 380 24 L379 30 Q200 36 21 30 Z" fill="#f7d79a"/>
    <path d="M40 58 Q200 70 360 58" stroke="#8f4614" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>
  </symbol>

  <symbol id="lechuga" viewBox="0 0 400 50">
    <path d="${lechuga}" fill="#5fb03c"/>
    <path d="${lechuga}" fill="none" stroke="#3d8526" stroke-width="3" stroke-linejoin="round"/>
    <path d="${lechugaVena}" fill="none" stroke="#a6dc78" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
  </symbol>

  <symbol id="carne" viewBox="0 0 400 64">
    <g fill="#4a2414">${bordes}</g>
    <rect x="14" y="8" width="372" height="48" rx="24" fill="url(#g-carne)"/>
    <g fill="#8a4a2a" opacity=".55">${textura}</g>
    <path d="M36 14 Q200 4 364 14" stroke="#9c5a32" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>
  </symbol>

  <symbol id="queso" viewBox="0 0 400 56">
    <path d="${queso}" fill="#ffb81c"/>
    <path d="M22 4 H378" stroke="#ffe07a" stroke-width="3" stroke-linecap="round"/>
  </symbol>

  <symbol id="panceta" viewBox="0 0 400 40">
    <path d="M14 10${onda(14, 386, 10, 6, 8, azar(3))} L386 24${ondaVuelta(386, 14, 24, 6, 8, azar(4))} Z" fill="#b5402a"/>
    <path d="M20 17${onda(20, 380, 17, 6, 8, azar(3))}" fill="none" stroke="#f4b9a0" stroke-width="4" stroke-linecap="round"/>
    <path d="M30 22${onda(30, 370, 30, 5, 7, azar(8))} L370 36${ondaVuelta(370, 30, 36, 4, 7, azar(6))} Z" fill="#9a3020"/>
  </symbol>

  <symbol id="tomate" viewBox="0 0 400 34">
    <ellipse cx="112" cy="17" rx="102" ry="15" fill="#c92a1f"/><ellipse cx="112" cy="15" rx="92" ry="10" fill="#ef4d3b"/>
    <ellipse cx="290" cy="18" rx="100" ry="14" fill="#c92a1f"/><ellipse cx="290" cy="16" rx="90" ry="9" fill="#ef4d3b"/>
    <g fill="#ffd9a8"><ellipse cx="80" cy="15" rx="5" ry="2"/><ellipse cx="112" cy="13" rx="5" ry="2"/><ellipse cx="146" cy="16" rx="5" ry="2"/><ellipse cx="258" cy="16" rx="5" ry="2"/><ellipse cx="292" cy="14" rx="5" ry="2"/><ellipse cx="324" cy="17" rx="5" ry="2"/></g>
  </symbol>

  <symbol id="cebolla" viewBox="0 0 400 30">
    <g fill="none" stroke-linecap="round">
      <ellipse cx="92" cy="15" rx="78" ry="10" stroke="#8e3c8f" stroke-width="7"/><ellipse cx="92" cy="15" rx="78" ry="10" stroke="#e7c6ea" stroke-width="3"/>
      <ellipse cx="204" cy="14" rx="74" ry="9" stroke="#8e3c8f" stroke-width="7"/><ellipse cx="204" cy="14" rx="74" ry="9" stroke="#e7c6ea" stroke-width="3"/>
      <ellipse cx="312" cy="16" rx="76" ry="10" stroke="#8e3c8f" stroke-width="7"/><ellipse cx="312" cy="16" rx="76" ry="10" stroke="#e7c6ea" stroke-width="3"/>
    </g>
  </symbol>

  <symbol id="pepinos" viewBox="0 0 400 30">${pepinos}</symbol>

  <symbol id="salsa" viewBox="0 0 400 30">
    <path d="${salsa}" fill="#e8571d"/>
    <path d="M60 7 Q200 1 340 7" stroke="#ff9a5c" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </symbol>

  <symbol id="pan-top" viewBox="0 0 400 150">
    <path d="M14 128 Q10 100 34 76 Q96 8 200 6 Q304 8 366 76 Q390 100 386 128 Q384 146 366 146 H34 Q16 146 14 128 Z" fill="url(#g-pan)"/>
    <path d="M14 128 Q16 146 34 146 H366 Q384 146 386 128 Q200 138 14 128 Z" fill="#f7d79a"/>
    <ellipse cx="128" cy="48" rx="70" ry="20" fill="#fff" opacity=".18" transform="rotate(-14 128 48)"/>
    <g fill="#fff1d2">${sesamo}</g>
  </symbol>

  <symbol id="palillo" viewBox="0 0 120 220">
    <path d="M60 30 V216" stroke="#d6b483" stroke-width="5" stroke-linecap="round"/>
    <path d="M62 30 H112 Q104 44 112 58 H62 Z" fill="#e0301e"/>
    <circle cx="60" cy="28" r="7" fill="#ffb81c"/>
  </symbol>
</svg>`);
})();
