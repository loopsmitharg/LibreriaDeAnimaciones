/** Página de la colección: monta las dos experiencias. La segunda se carga recién cuando se acerca al viewport. */
import { mountExploded, mountRunning } from "./src/index.js";

const $ = (s) => document.querySelector(s);
const loading = (el) => ({ onLoad: (p) => { el.textContent = `Cargando modelo ${Math.round(p * 100)}%`; }, done: () => el.classList.add("done"), fail: (e) => { el.textContent = "No se pudo cargar el modelo"; console.error(e); } });

const title = $("#hero-title"), hint = $("#hint"), l1 = loading($("#load-exploded"));
mountExploded($("#exploded"), {
  onLoad: l1.onLoad,
  onProgress: (p) => { const k = Math.max(0, 1 - p / .07); title.style.opacity = k; hint.style.opacity = k; },   // el título acompaña solo al hero
}).then((exp) => { window.__exploded = exp; l1.done(); }).catch(l1.fail);
$("#exploded .sn-sticky").append(title, hint, $("#load-exploded"));            // el tramo sticky ya existe: los textos del hero viajan con él

const run = $("#running"), l2 = loading($("#load-running"));
// carga diferida: se monta cuando la sección está a menos de 1.5 pantallas (observer + scroll, por si el observer llega tarde)
let started = false;
const near = () => {
  if (started || run.getBoundingClientRect().top > innerHeight * 2.5) return;
  started = true; io.disconnect(); removeEventListener("scroll", near);
  mountRunning(run, { controls: true, onLoad: l2.onLoad }).then((r) => { window.__running = r; l2.done(); }).catch(l2.fail);
};
const io = new IntersectionObserver(near, { rootMargin: "150% 0px" }); io.observe(run);
addEventListener("scroll", near, { passive: true }); near();
