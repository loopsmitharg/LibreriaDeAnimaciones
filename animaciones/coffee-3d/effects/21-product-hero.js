/**
 * 21 · Coffee Product Hero — sección hero para una marca de café. Los granos flotan alrededor del área central y la cámara
 * responde al mouse. El contenido es HTML común: reemplazalo pasando `params.html` a mountScene o editando HERO_HTML.
 */
const HERO_HTML = `
  <small>Tu tostadería · Origen y tueste</small>
  <h2>El nombre de tu café, <em>grano a grano</em></h2>
  <p>Este bloque es HTML reemplazable: título, bajada y llamada a la acción de tu marca.</p>
  <a href="#">Ver la carta</a>`;
const CSS = `
  .c3-hero{position:absolute;z-index:3;inset:0;display:grid;place-content:center;justify-items:center;gap:1.1rem;padding:2rem;text-align:center;pointer-events:none;color:#f6ecdf}
  .c3-hero small{font:500 .72rem/1 "IBM Plex Mono",monospace;letter-spacing:.2em;text-transform:uppercase;color:#d9a066}
  .c3-hero h2{margin:0;max-width:13ch;font:700 clamp(2.4rem,6.4vw,5.6rem)/.96 "Playfair Display",Georgia,serif;letter-spacing:-.03em;text-wrap:balance}
  .c3-hero h2 em{font-style:italic;color:#d9a066}
  .c3-hero p{margin:0;max-width:30rem;color:rgba(246,236,223,.7);font:400 1.02rem/1.55 "Outfit",system-ui,sans-serif}
  .c3-hero a{pointer-events:auto;margin-top:.4rem;padding:.9rem 1.6rem;border-radius:999px;background:#f6ecdf;color:#1a0f08;font:600 .9rem/1 "Outfit",system-ui,sans-serif;text-decoration:none}`;

export default {
  rig: "soft", fov: 34, bg: "warm", shadows: true, roast: "dark", tech: "HTML sobre WebGL · parallax · sombras",
  hint: "Mové el mouse: la cámara acompaña",
  async mount({ stage, swarm, kit, o, host }) {
    const style = document.createElement("style"); style.textContent = CSS; const box = document.createElement("div"); box.className = "c3-hero"; box.innerHTML = o.html || HERO_HTML; host.append(style, box);
    const n = 30, sw = await swarm(n, { lod: "std", shadows: true }), r = kit.rng(59), home = new Float32Array(n * 3), base = kit.randomQuats(n, 15);
    const corona = new Float32Array(n * 3), escala = new Float32Array(n);
    for (let i = 0; i < n; i++) {                                              // corona elíptica: el centro queda libre para el contenido
      const a = (i / n) * 6.2832 + r() * .3, z = -2.5 + r() * 4.2, k = 1 - z * .06; corona.set([Math.cos(a) * (4.3 + r() * 1.5) * k, Math.sin(a) * (2.3 + r() * .9) * k, z], i * 3); escala[i] = .5 + r() * .55 + Math.max(0, z) * .12;
    }
    const floor = stage.addFloor(-3.1, .3); stage.camera.position.set(0, 0, 9.5);
    /* params.fit = "frame": en pantallas verticales la corona no entra en el cuadro y los granos quedan cortados por los
       bordes. Ahí se reparten en una banda arriba y otra abajo del texto, cada grano entero dentro del encuadre. */
    const T = Math.tan((stage.camera.fov * Math.PI) / 360), D = 9.5;
    const VERTICAL = [   // [x, y] en el encuadre (-1..1), z (profundidad), escala
      [-.66, .8, .7, .82], [-.08, .9, -1.6, .52], [.42, .76, 1.3, .66], [.8, .9, -.5, .7], [.12, .66, -2.8, .42],
      [-.74, -.66, 1.1, .78], [-.18, -.6, -1.8, .5], [.62, -.7, .5, .86], [.86, -.5, -2, .48],
    ];
    const acomodar = (w, h) => {
      const asp = w / h;
      if (o.fit !== "frame" || asp >= .95) { home.set(corona); sw.scale.set(escala); floor.material.opacity = .3; return; }
      const k = kit.clamp(asp / .62, .72, 1);                                   // pantallas muy angostas: granos algo más chicos
      sw.scale.fill(0);                                                         // los que no tienen lugar no se dibujan
      VERTICAL.forEach(([nx, ny, z, s], i) => {
        const sc = s * k, m = sc * .62 + .22, hh = T * (D - z), hw = hh * asp;  // m: medio grano + vaivén, para no tocar el borde
        const x = Math.sign(nx) * Math.min(Math.abs(nx) * hw, hw - m), y = Math.sign(ny) * Math.min(Math.abs(ny) * hh, hh - m);
        home.set([x, y, z], i * 3); sw.scale[i] = sc;
      });
      floor.material.opacity = .14;
    };
    acomodar(stage.width, stage.height); stage.onResize = acomodar;
    let cx = 0, cy = 0;
    return {
      update(dt, t) {
        for (let i = 0; i < n; i++) sw.set(i, home[i * 3] + Math.sin(t * .31 + i * 2.1) * .16, home[i * 3 + 1] + Math.sin(t * .43 + i * 1.3) * .2, home[i * 3 + 2] + Math.cos(t * .27 + i) * .2);
        kit.spinQuats(sw.quat, base, t * .22); sw.commit();
        cx = kit.damp(cx, stage.pointer.x * .9, 2.5, dt); cy = kit.damp(cy, stage.pointer.y * .5, 2.5, dt); stage.camera.position.set(cx, cy, 9.5); stage.camera.lookAt(0, 0, 0);
      },
      destroy() { style.remove(); box.remove(); },
    };
  },
};
