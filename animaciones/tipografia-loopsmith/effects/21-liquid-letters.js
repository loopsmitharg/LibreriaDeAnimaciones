/* 21 · Liquid-Like Letters — las letras se funden en una gota y vuelven a separarse. */
(() => {
  const LST = window.LoopSmithType, { gsap, h } = LST.kit;
  let uid = 0;
  LST.register({
    id: "liquid-letters", n: "21", group: "C", name: "Liquid-Like Letters", hint: ["play"],
    lead: "El wordmark se derrite hacia el centro, sus letras se funden en una sola masa y vuelven a escurrirse hasta su lugar con rebote viscoso.",
    fields: [["viscosity", "Viscosidad", 1, .4, 2, .05], ["duration", "Duración de la salida (s)", 1.5, .7, 3, .05]],
    tech: "No hay morphing de trazos: los contornos de Outfit no comparten topología y deformarlos rompería la marca. El efecto líquido es un filtro SVG (desenfoque + umbral de alfa) que fusiona las siluetas mientras están cerca; al terminar el filtro se quita y el logo queda intacto.",
    mobile: "El filtro solo existe durante la animación; el radio de desenfoque es proporcional al tamaño del logo.",
    mount(host, o) {
      const B = LST.base(host, o), id = "lst-goo" + ++uid;
      const defs = h("div", "lst-defs", `<svg width="0" height="0" aria-hidden="true"><filter id="${id}" x="-20%" y="-60%" width="140%" height="220%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="0" result="b"/><feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter></svg>`);
      B.root.append(defs);
      const blur = defs.querySelector("feGaussianBlur"), el = B.logo.el, n = B.n;
      const std = () => B.logo.px * .13 * o.viscosity;
      const tl = gsap.timeline({ paused: true, onStart: () => (el.style.filter = `url(#${id})`), onComplete: () => { el.style.filter = ""; gsap.set(B.parts, { clearProps: "transform" }); } });
      tl.to(blur, { attr: { stdDeviation: std() }, duration: .5, ease: "power2.in" }, 0)
        // derretirse: todo cae hacia el centro, más ancho que alto
        .to(B.parts, { x: (i) => -B.c(i).x * .86, y: (i) => Math.sin(i * 2.1) * B.logo.px * .06, scaleX: 1.25, scaleY: .8, rotation: (i) => (i % 2 ? 14 : -14), duration: .75, ease: "power2.in", stagger: { each: .025, from: "edges" } }, 0)
        .to(B.parts, { scaleX: .92, scaleY: 1.12, duration: .35, ease: "sine.inOut" }, ">-.05")
        // escurrirse: del centro hacia afuera, con rebote viscoso
        .to(B.parts, { x: 0, y: 0, rotation: 0, duration: o.duration, ease: "elastic.out(1, .55)", stagger: { each: .05, from: "center" } }, ">")
        .to(B.parts, { scaleX: 1, scaleY: 1, duration: o.duration * .8, ease: "elastic.out(1, .4)", stagger: { each: .05, from: "center" } }, "<")
        .to(blur, { attr: { stdDeviation: 0 }, duration: o.duration * .7, ease: "power2.out" }, "<+=" + o.duration * .25);
      B.s.keep(tl);
      return B.api({ play: () => tl.restart(), pause: () => tl.pause(), reset: () => { tl.progress(1).pause(); el.style.filter = ""; } });
    },
  });
})();
