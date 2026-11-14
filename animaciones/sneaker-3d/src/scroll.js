/**
 * Scroll: arma un tramo alto con el escenario `sticky` adentro y ata un timeline de GSAP al scroll con scrub real.
 * El estado depende SOLO del progreso del timeline: avanzar, retroceder o saltar da siempre la misma pose.
 * Requiere gsap + ScrollTrigger cargados (window.gsap / window.ScrollTrigger).
 */
export function stickyTrack(host, screens = 7) {
  const track = document.createElement("div"); track.className = "sn-track"; track.style.height = `${screens * 100}vh`;
  const sticky = document.createElement("div"); sticky.className = "sn-sticky"; track.append(sticky); host.append(track);
  return { track, sticky, remove: () => track.remove() };
}
export function bindScroll(track, timeline, { scrub = .6, onUpdate } = {}) {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) throw new Error("sneaker-3d: faltan gsap y ScrollTrigger");
  gsap.registerPlugin(ScrollTrigger);
  return ScrollTrigger.create({ trigger: track, start: "top top", end: "bottom bottom", scrub, animation: timeline, onUpdate: (s) => onUpdate?.(s.progress) });
}
