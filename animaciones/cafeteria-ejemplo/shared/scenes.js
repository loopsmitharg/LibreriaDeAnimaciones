/**
 * Cafetería de ejemplo · monta las escenas de Coffee 3D Motion Lab en la página.
 *
 *   <div data-c3="hero" data-roast="dark"><template data-c3-html>…HTML de la marca…</template></div>
 *
 * Escenas disponibles (ver ESCENAS): hero, wave, flow, assembly, journey.
 * - Las escenas comunes se montan cuando están cerca de la pantalla (y el bucle se pausa solo fuera de ella).
 * - Las de scroll se montan enseguida porque crean su propio tramo alto; al terminar avisan con "cf:layout".
 * - Textos de las escenas de scroll: data-captions="<id de un <script type=application/json>>" reemplaza los del efecto.
 * Si WebGL o los módulos fallan, queda el contenido HTML de respaldo (.cf-hero__fallback, etc.).
 */
import { mountScene } from "../../coffee-3d/core/mount.js";

const ESCENAS = {
  hero: () => import("../../coffee-3d/effects/21-product-hero.js"),
  wave: () => import("../../coffee-3d/effects/17-coffee-wave.js"),
  flow: () => import("../../coffee-3d/effects/18-infinite-flow.js"),
  assembly: () => import("../../coffee-3d/effects/10-scroll-assembly.js"),
  journey: () => import("../../coffee-3d/effects/11-macro-journey.js"),
};

/** Devuelve una copia del efecto con textos propios: los de la página reemplazan a los técnicos del laboratorio. */
function conTextos(def, lista) {
  if (!lista) return def;
  return {
    ...def,
    async mount(ctx) {
      let usados = false;
      const captions = (orig) => { usados = true; return ctx.captions(lista.length ? lista : orig); };
      const inst = (await def.mount({ ...ctx, captions })) || {};
      if (usados) return inst;
      // El efecto no tenía textos: se agregan y se alimentan con el mismo progreso.
      const pintar = ctx.captions(lista);
      return { ...inst, progress(p) { inst.progress?.(p); pintar(p); } };
    },
  };
}

async function montar(host) {
  const id = host.dataset.c3;
  if (!ESCENAS[id] || host.dataset.c3State) return;
  host.dataset.c3State = "loading";
  try {
    const def = (await ESCENAS[id]()).default;
    const tpl = host.querySelector("template[data-c3-html]");
    const listaId = host.dataset.captions;
    const lista = listaId ? JSON.parse(document.getElementById(listaId).textContent) : null;
    const params = tpl ? { html: tpl.innerHTML } : {};
    const scene = await mountScene(conTextos(def, lista), host, { roast: host.dataset.roast || def.roast, rig: host.dataset.rig || def.rig, params });
    host.dataset.c3State = "ready";
    const caja = host.closest(".cf-hero, .cf-frame, .cf-story");
    caja?.classList.add("is-ready");
    caja?.querySelector(".cf-hero__fallback")?.setAttribute("aria-hidden", "true");   // el mismo texto ya vive sobre la escena
    if (def.scroll) dispatchEvent(new Event("cf:layout"));
    return scene;
  } catch (err) {
    host.dataset.c3State = "error";
    console.warn(`[cafeteria] no se pudo montar la escena "${id}":`, err);
  }
}

const hosts = [...document.querySelectorAll("[data-c3]")];
const scroll = hosts.filter((h) => h.dataset.c3Scroll !== undefined);
const comunes = hosts.filter((h) => h.dataset.c3Scroll === undefined);

// Primero lo que está en pantalla (el hero); después las de scroll, que definen la altura de la página.
const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); montar(e.target); } }), { rootMargin: "300px 0px" });
comunes.forEach((h) => io.observe(h));
for (const h of scroll) await montar(h);
