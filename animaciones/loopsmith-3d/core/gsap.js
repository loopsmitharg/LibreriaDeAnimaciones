/* GSAP y ScrollTrigger vienen de assets/vendor como scripts clásicos (window.gsap). Este módulo los expone como ES module. */
const g = window.gsap;
if (!g) throw new Error("Falta cargar assets/vendor/gsap.min.js antes de los módulos");
if (window.ScrollTrigger) g.registerPlugin(window.ScrollTrigger);
export const gsap = g;
export const ScrollTrigger = window.ScrollTrigger;
