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
    for (let i = 0; i < n; i++) {                                              // corona elíptica: el centro queda libre para el contenido
      const a = (i / n) * 6.2832 + r() * .3, z = -2.5 + r() * 4.2, k = 1 - z * .06; home.set([Math.cos(a) * (4.3 + r() * 1.5) * k, Math.sin(a) * (2.3 + r() * .9) * k, z], i * 3); sw.scale[i] = .5 + r() * .55 + Math.max(0, z) * .12;
    }
    stage.addFloor(-3.1, .3); stage.camera.position.set(0, 0, 9.5);
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
