/* ==========================================================================
   AIDA · Logo + relieve de Argentina (scroll)
   Traído del HTML de AIDA (aida-argentina.html). Canvas 2D, sin librerías.

   - El relieve se arma con "filas" horizontales (líneas de crestas): cada fila
     corta los polígonos de Argentina, Malvinas y el sector antártico, y la
     altura sale de una elevación estilizada (Andes, Puna, sierras, mesetas)
     hecha con ruido fbm/ridged.
   - El logo se convierte en filas sobre la MISMA grilla: se lee el canal alfa
     de la imagen, se suaviza (bisel) y cada fila es una línea con relieve.
   - Scroll → p (0..1, suavizado): las filas viajan con stagger desde su
     posición inicial (terreno a la izquierda, logo a la derecha) hasta quedar
     el logo posado sobre el terreno. Durante el viaje ondulan (wob).
   - Cada línea tapa lo que tiene detrás rellenando con el color de fondo:
     así las filas de adelante ocultan a las de atrás (efecto "joy division").
   ========================================================================== */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ARG = window.AIDA_ARG;
  const LOGO_SRC = 'media/aida-logo.webp';
  if (!ARG) return;
  const cvs = document.getElementById('c');
  const ctx = cvs.getContext('2d');
  const stage = document.getElementById('stage');
  const $ = id => document.getElementById(id);
  const hint = $('hint'), cap = $('cap'), coords = $('coords'), phaseEl = $('phase');
  const mFill = $('mFill'), mDot = $('mDot');

  const BG = '#05080f';
  const D2R = Math.PI / 180;
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* ---------- noise ---------- */
  function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
  }
  function fbm(x, y) { let s = 0, a = .5, f = 1; for (let i = 0; i < 4; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= .5; } return s / .9375; }
  function ridged(x, y) { let s = 0, a = .5, f = 1; for (let i = 0; i < 4; i++) { s += a * (1 - Math.abs(vnoise(x * f, y * f) * 2 - 1)); f *= 2.1; a *= .5; } return s / .9375; }
  const gauss = (lon, lat, cx, cy, sx, sy) => Math.exp(-(((lon - cx) / sx) ** 2) - (((lat - cy) / sy) ** 2));

  /* ---------- geography ---------- */
  // Islas Malvinas (Gran Malvina y Soledad), contorno simplificado
  const MAL = [
    [[-61.35, -51.25], [-60.6, -51.15], [-60.0, -51.3], [-59.7, -51.55], [-59.85, -51.95], [-60.4, -52.25], [-61.1, -52.05], [-61.4, -51.7], [-61.35, -51.25]],
    [[-59.35, -51.35], [-58.8, -51.3], [-58.2, -51.4], [-57.75, -51.6], [-57.9, -51.85], [-58.35, -52.05], [-58.7, -52.35], [-59.25, -52.25], [-59.5, -51.85], [-59.35, -51.35]]
  ];
  // Antártida Argentina: sector 25° O – 74° O, al sur de 60° S (costa simplificada)
  const ANT = [
    [[-74, -73.2], [-74, -90], [-25, -90], [-25, -75.6], [-28, -76.0], [-32, -77.0], [-36, -77.8], [-40, -78.0], [-44, -78.3], [-47, -77.8], [-50, -77.0],
     [-54, -76.0], [-58, -75.3], [-61, -74.6], [-62, -73.0], [-61.2, -71.0], [-61.5, -69.0], [-62, -67.5], [-61, -66.2], [-60, -65.3], [-58.6, -64.4],
     [-57.4, -63.7], [-56.9, -63.25], [-57.8, -63.4], [-59.2, -63.9], [-60.8, -64.3], [-62.2, -64.8], [-63.6, -65.4], [-64.6, -66.2], [-65.8, -66.9],
     [-66.9, -67.6], [-67.2, -68.4], [-66.8, -69.2], [-67.5, -70.4], [-68.6, -71.3], [-70.2, -72.4], [-72.5, -72.9], [-74, -73.2]],
    // Shetland del Sur
    [[-62.2, -62.95], [-60.6, -62.55], [-58.7, -62.05], [-57.7, -61.95], [-58.2, -62.35], [-60.0, -62.85], [-61.4, -63.15], [-62.2, -62.95]],
    // Orcadas del Sur
    [[-46.8, -60.4], [-45.4, -60.25], [-44.2, -60.45], [-45.0, -61.0], [-46.4, -60.9], [-46.8, -60.4]]
  ];

  let LAT_TOP = -90;
  for (const poly of ARG) for (const [, y] of poly) LAT_TOP = Math.max(LAT_TOP, y);
  const LONC = -63.6, COS = Math.cos(38 * D2R);
  const gm = (lon, lat) => [(lon - LONC) * COS, LAT_TOP - lat];
  const im = (mx, my) => [mx / COS + LONC, LAT_TOP - my];

  // Antártida como sector polar (recuadro al este de la Patagonia)
  const K = .42, TH0 = -49.5, HALF = 24.5 * D2R;
  const AX = gm(-56.4, 0)[0] + K * 30 * Math.sin(HALF);
  const AY = gm(0, -45.2)[1];
  const pa = (lon, lat) => { const r = 90 + lat, t = (lon - TH0) * D2R; return [AX + K * r * Math.sin(t), AY + K * (30 - r * Math.cos(t))]; };
  const ia = (mx, my) => { const X = (mx - AX) / K, Y = 30 - (my - AY) / K; return [Math.atan2(X, Y) / D2R + TH0, Math.hypot(X, Y) - 90]; };

  /* ---------- elevation (stylised) ---------- */
  const PEAK = [[22, .95], [24.5, 1.05], [27, 1.0], [30, .9], [32.7, 1.15], [35, .8], [38, .55], [42, .45], [46, .42], [49.2, .62], [51, .4], [53, .3], [55.5, .25]];
  function peakAt(slat) {
    if (slat <= PEAK[0][0]) return PEAK[0][1];
    for (let i = 1; i < PEAK.length; i++) if (slat <= PEAK[i][0]) {
      const [a, va] = PEAK[i - 1], [b, vb] = PEAK[i]; return lerp(va, vb, (slat - a) / (b - a));
    }
    return PEAK[PEAK.length - 1][1];
  }
  function elevMain(lon, lat, west) {
    const d = Math.max(0, lon - west);
    const pk = peakAt(-lat);
    const andes = pk * (1 - Math.exp(-d / .22)) * Math.exp(-d / 1.15) / .62;
    let h = andes * (.62 + .7 * fbm(lon * 1.6 + 10, lat * 1.6));
    h += .32 * pk * Math.exp(-d / 1.6) * (ridged(lon * 3.2, lat * 3.2) - .35) * (1 - Math.exp(-d / .2));
    h += .34 * gauss(lon, lat, -66.6, -24.4, 1.5, 2.2) * (.8 + .4 * fbm(lon * 3, lat * 3));   // Puna
    h += .42 * gauss(lon, lat, -66.0, -27.2, .32, 1.0);                                      // Aconquija
    h += .40 * gauss(lon, lat, -67.6, -29.0, .3, 1.1);                                       // Famatina
    h += .26 * gauss(lon, lat, -66.9, -30.4, .35, .9);
    h += .22 * gauss(lon, lat, -64.7, -31.5, .32, 1.25);                                     // Córdoba
    h += .15 * gauss(lon, lat, -66.1, -32.8, .4, .7);                                        // San Luis
    h += .13 * gauss(lon, lat, -61.9, -38.1, .55, .22);                                      // Ventania
    h += .05 * gauss(lon, lat, -59.2, -37.4, 1.2, .25);                                      // Tandilia
    const pat = clamp((-39 - lat) / 2);
    h += pat * .16 * Math.max(0, 1 - d / 7.5) * (.55 + .9 * fbm(lon * 2.4, lat * 2.4));    // mesetas
    h += .13 * gauss(lon, lat, -59.5, -51.75, 1.1, .35) * (.6 + .8 * fbm(lon * 4, lat * 4)); // Malvinas
    h += .03 * fbm(lon * 7, lat * 7);
    return Math.max(0, h);
  }
  function elevAnt(lon, lat) {
    const plateau = .14 + .62 * sstep(-73, -88, lat);
    // espinazo de la Península Antártica
    const ax = -57.5, ay = -63.6, bx = -66.5, by = -72.0;
    const t = clamp(((lon - ax) * (bx - ax) + (lat - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2));
    const dx = (lon - (ax + t * (bx - ax))) * .45, dy = lat - (ay + t * (by - ay));
    const spine = Math.exp(-(dx * dx + dy * dy) / .5);
    let h = plateau * (.8 + .4 * fbm(lon * .5, lat * 1.5));
    h += .55 * spine * (.6 + .7 * ridged(lon * 2, lat * 2));
    h += .03 * fbm(lon * 3, lat * 5);
    return Math.max(0, h);
  }

  /* ---------- terrain rows (map space) ---------- */
  const D = .24, STEP = .065;
  const groups = [
    { kind: 0, polys: [...ARG, ...MAL].map(p => p.map(([a, b]) => gm(a, b))), inv: im, el: elevMain },
    { kind: 1, polys: ANT.map(p => p.map(([a, b]) => pa(a, b))), inv: ia, el: (lon, lat) => elevAnt(lon, lat) }
  ];
  let maxMy = 0, minMx = 1e9, maxMx = -1e9;
  for (const g of groups) for (const p of g.polys) for (const [x, y] of p) { maxMy = Math.max(maxMy, y); minMx = Math.min(minMx, x); maxMx = Math.max(maxMx, x); }
  const NR = Math.ceil(maxMy / D);
  const MXC = (minMx + maxMx) / 2, MYC = maxMy / 2 - .7;
  const MAIN_EAST = gm(-53.6, 0)[0];

  const rows = [];
  for (let r = 0; r < NR; r++) {
    const my = (r + .5) * D;
    const segs = [];
    for (const g of groups) {
      const xs = [];
      for (const poly of g.polys) for (let i = 0; i < poly.length - 1; i++) {
        const [x1, y1] = poly[i], [x2, y2] = poly[i + 1];
        if ((y1 > my) !== (y2 > my)) xs.push(x1 + (my - y1) / (y2 - y1) * (x2 - x1));
      }
      if (!xs.length) continue;
      xs.sort((a, b) => a - b);
      const westLon = g.inv(xs[0], my)[0];
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const a = xs[i], b = xs[i + 1];
        if (b - a < .04) continue;
        const n = Math.max(2, Math.ceil((b - a) / STEP));
        const v = new Float32Array((n + 1) * 2);
        for (let k = 0; k <= n; k++) {
          const mx = a + (b - a) * k / n;
          const [lon, lat] = g.inv(mx, my);
          const edge = Math.min(mx - a, b - mx);
          v[k * 2] = mx;
          v[k * 2 + 1] = g.el(lon, lat, westLon) * sstep(0, .1, edge);
        }
        segs.push({ kind: g.kind, v });
      }
    }
    rows.push({ my, segs });
  }

  /* ---------- logo as ridgelines on the same row grid ---------- */
  const img = new Image();
  img.src = LOGO_SRC;
  let IW = 1, IH = 1, LW = 1, LH = 1, LX = 0, LY = 0;
  const logoRows = [];
  function buildLogo() {
    IW = img.naturalWidth; IH = img.naturalHeight;
    const oc = document.createElement('canvas'); oc.width = IW; oc.height = IH;
    const o = oc.getContext('2d'); o.drawImage(img, 0, 0);
    const px = o.getImageData(0, 0, IW, IH).data;
    let A = new Float32Array(IW * IH);
    for (let i = 0; i < A.length; i++) A[i] = px[i * 4 + 3] > 140 ? 1 : 0;
    // soft bevel: two box-blur passes
    const B = new Float32Array(A.length), R = 2;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
        let s = 0, c = 0; for (let k = -R; k <= R; k++) { const xx = x + k; if (xx >= 0 && xx < IW) { s += A[y * IW + xx]; c++; } } B[y * IW + x] = s / c;
      }
      for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
        let s = 0, c = 0; for (let k = -R; k <= R; k++) { const yy = y + k; if (yy >= 0 && yy < IH) { s += B[yy * IW + x]; c++; } } A[y * IW + x] = s / c;
      }
    }
    LW = (maxMx - minMx) * .9; LH = LW * IH / IW;
    LX = MXC - LW / 2; LY = maxMy * .42 - LH / 2;
    const nC = Math.ceil(LW / .05);
    logoRows.length = 0;
    for (let r = 0; r < rows.length; r++) {
      const v = (rows[r].my - LY) / LH;
      if (v < 0 || v > 1) continue;
      const iy = Math.min(IH - 1, Math.round(v * (IH - 1)));
      const segs = []; let cur = null;
      for (let c = 0; c <= nC; c++) {
        const u = c / nC, a = A[iy * IW + Math.min(IW - 1, Math.round(u * (IW - 1)))];
        if (a > .04) { (cur || (cur = [])).push(u, a); }
        else if (cur) { if (cur.length >= 4) segs.push(Float32Array.from(cur)); cur = null; }
      }
      if (cur && cur.length >= 4) segs.push(Float32Array.from(cur));
      logoRows.push({ r, v, segs });
    }
  }

  /* ---------- canvas ---------- */
  let W = 0, H = 0, DPR = 1, ready = false;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cvs.clientWidth || innerWidth; H = cvs.clientHeight || innerHeight;
    cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
  }

  let pTarget = 0, p = 0, time = 0, last = performance.now();
  function readScroll() {
    const r = stage.getBoundingClientRect();
    pTarget = clamp(-r.top / (r.height - window.innerHeight));
  }

  const HS = 1.6;           // altura del relieve (unidades de mapa por unidad de elevación)
  const LOGO_RELIEF = .034; // altura del relieve del logo (fracción de su alto)

  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    time += reduce ? 0 : dt;
    p += (pTarget - p) * (reduce ? 1 : 1 - Math.pow(.0009, dt));
    if (Math.abs(pTarget - p) < 1e-4) p = pTarget;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    if (!ready) { requestAnimationFrame(frame); return; }

    const mob = W < 700;
    const MW = maxMx - minMx, MH = maxMy + 1.6;
    // vista inicial: terreno a la izquierda / vista final: centrado
    const S0 = Math.min(H * (mob ? .5 : .8) / MH, W * (mob ? .46 : .42) / MW);
    const CX0 = W * (mob ? .26 : .28), CY0 = H * .52;
    const S1 = Math.min(H * (mob ? .72 : .86) / MH, W * (mob ? .94 : .9) / MW);
    const CX1 = W / 2, CY1 = H * (mob ? .57 : .53);
    // logo: a la derecha → encima del terreno, alineado con sus filas
    const riw = mob ? W * .44 : Math.min(W * .4, 640);
    const Ri = { x: W * (mob ? .75 : .72) - riw / 2, w: riw, h: riw * IH / IW }; Ri.y = H * .52 - Ri.h / 2;
    const Rf = { x: CX1 + (LX - MXC) * S1, y: CY1 + (LY - MYC) * S1, w: LW * S1, h: LH * S1 };

    const m = clamp((p - .05) / .78);
    const STAG = .3, SPAN = 1 - STAG;

    /* terreno */
    const terrA = 1;
    ctx.lineWidth = 1; ctx.lineJoin = 'round';
    let vMid = null;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const e = easeIO(clamp((m - STAG * (r / rows.length)) / SPAN));
      const S = lerp(S0, S1, e), CX = lerp(CX0, CX1, e), CY = lerp(CY0, CY1, e);
      const wob = reduce ? 0 : Math.sin(Math.PI * e) * H * .012;
      const base = CY + (row.my - MYC) * S;
      if (!vMid && row.my > AY + K * 15) vMid = { S, CX, CY };
      let grad = null;
      for (const s of row.segs) {
        const v = s.v, n = v.length / 2;
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const mx = v[k * 2];
          const X = CX + (mx - MXC) * S;
          const Y = base - v[k * 2 + 1] * HS * S + wob * Math.sin(mx * 1.1 + time * 2 + r * .37);
          k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        const Xe = CX + (v[(n - 1) * 2] - MXC) * S, Xs = CX + (v[0] - MXC) * S;
        ctx.save();
        ctx.lineTo(Xe, base + 1.5); ctx.lineTo(Xs, base + 1.5); ctx.closePath();
        ctx.fillStyle = BG; ctx.fill();
        ctx.restore();
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const mx = v[k * 2];
          const X = CX + (mx - MXC) * S;
          const Y = base - v[k * 2 + 1] * HS * S + wob * Math.sin(mx * 1.1 + time * 2 + r * .37);
          k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        if (s.kind === 0) {
          if (!grad) {
            grad = ctx.createLinearGradient(CX + (minMx - MXC) * S, 0, CX + (MAIN_EAST - MXC) * S, 0);
            grad.addColorStop(0, '#ffffff'); grad.addColorStop(.3, '#cfe4f6'); grad.addColorStop(.6, '#74acdf'); grad.addColorStop(1, '#3a6aa8');
          }
          ctx.strokeStyle = grad;
        } else ctx.strokeStyle = '#bcd8f1';
        ctx.globalAlpha = terrA; ctx.stroke(); ctx.globalAlpha = 1;
      }
    }

    /* contorno del sector antártico */
    if (vMid) {
      const P = (lon, lat) => { const [mx, my] = pa(lon, lat); return [vMid.CX + (mx - MXC) * vMid.S, vMid.CY + (my - MYC) * vMid.S]; };
      ctx.beginPath();
      let q = P(-74, -60); ctx.moveTo(q[0], q[1]);
      for (let lon = -74; lon <= -25; lon += 1) { q = P(lon, -60); ctx.lineTo(q[0], q[1]); }
      q = P(-25, -90); ctx.lineTo(q[0], q[1]);
      q = P(-74, -60); ctx.lineTo(q[0], q[1]);
      ctx.setLineDash([2, 4]); ctx.strokeStyle = 'rgba(116,172,223,.4)'; ctx.stroke(); ctx.setLineDash([]);
    }

    /* logo */
    const crisp = 1 - sstep(.015, .08, p);
    const linesA = sstep(.005, .07, p);
    if (linesA > .002) {
      const nL = logoRows.length;
      for (let j = 0; j < nL; j++) {
        const lr = logoRows[j];
        const e = easeIO(clamp((m - STAG * (lr.r / rows.length)) / SPAN));
        const x0 = lerp(Ri.x, Rf.x, e), y0 = lerp(Ri.y, Rf.y, e), w = lerp(Ri.w, Rf.w, e), h = lerp(Ri.h, Rf.h, e);
        const base = y0 + lr.v * h, hs = h * LOGO_RELIEF;
        const wob = reduce ? 0 : Math.sin(Math.PI * e) * H * .03;
        for (const s of lr.segs) {
          const n = s.length / 2;
          ctx.beginPath();
          for (let k = 0; k < n; k++) {
            const u = s[k * 2];
            const X = x0 + u * w, Y = base - s[k * 2 + 1] * hs + wob * Math.sin(u * 12 + time * 2.4 + j * .5);
            k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
          }
          const pathEndX = x0 + s[(n - 1) * 2] * w, pathStartX = x0 + s[0] * w;
          ctx.save();
          ctx.lineTo(pathEndX, base + 1.5); ctx.lineTo(pathStartX, base + 1.5); ctx.closePath();
          ctx.globalAlpha = .92 * linesA; ctx.fillStyle = BG; ctx.fill();
          ctx.restore();
          ctx.beginPath();
          for (let k = 0; k < n; k++) {
            const u = s[k * 2];
            const X = x0 + u * w, Y = base - s[k * 2 + 1] * hs + wob * Math.sin(u * 12 + time * 2.4 + j * .5);
            k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
          }
          ctx.globalAlpha = linesA; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.25; ctx.stroke(); ctx.lineWidth = 1;
        }
      }
      ctx.globalAlpha = 1;
    }
    if (crisp > .002) { ctx.globalAlpha = crisp; ctx.drawImage(img, Ri.x, Ri.y, Ri.w, Ri.h); ctx.globalAlpha = 1; }

    /* etiquetas finales */
    const la = sstep(.86, .98, p);
    if (la > .002) {
      ctx.globalAlpha = la; ctx.fillStyle = '#6f7d96';
      ctx.font = `400 ${mob ? 8 : 9}px "IBM Plex Mono", ui-monospace, monospace`; ctx.textAlign = 'center';
      const L = (mx, my) => [CX1 + (mx - MXC) * S1, CY1 + (my - MYC) * S1];
      let q = L(...gm(-59.5, -53.4)); ctx.fillText('ISLAS MALVINAS', q[0], q[1]);
      q = L(AX, AY + K * 30 + 1.1); ctx.fillText('ANTÁRTIDA ARGENTINA', q[0], q[1]);
      ctx.globalAlpha = 1;
    }

    /* UI */
    hint.style.opacity = String(1 - sstep(.01, .06, p));
    const cA = sstep(.88, .98, p);
    cap.style.opacity = coords.style.opacity = String(cA);
    cap.style.transform = `translateY(${(1 - cA) * 16}px)`;
    mFill.style.height = (p * 100) + '%';
    mDot.style.top = (p * 100) + '%';
    phaseEl.textContent = p < .05 ? 'Logo + Terreno' : p < .86 ? `Uniendo ${Math.round(clamp((p - .05) / .81) * 100)}%` : 'Fusión';

    requestAnimationFrame(frame);
  }

  addEventListener('scroll', readScroll, { passive: true });
  let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { resize(); readScroll(); }, 100); });

  const start = () => { buildLogo(); resize(); readScroll(); p = pTarget; ready = true; };
  resize(); requestAnimationFrame(frame);
  if (img.complete && img.naturalWidth) start(); else img.onload = start;
})();
