/**
 * Scroll de intro: el logo a pantalla completa viaja al navbar.
 * Base: Loop Smith, js/main.js → initializeBrandMorph() + initializeIntroAutoScroll().
 *
 * Piezas:
 *  - .brand-stage (alto > 100svh) con un pin sticky.
 *  - .brand-lockup: copia escalada del logo del navbar (.site-brand).
 *  - Timeline con scrub de largo exacto 1 → posición = progreso del scroll.
 *  - Al cruzar BRAND_LAND se marca .brand-landed y se reproduce el impacto.
 */
const MOTION = {
  reduced: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  pinned: "(min-width: 901px)",
  flow: "(max-width: 900px)",
};

/** Progreso del stage en que el logo ya está entregado al navbar. */
const BRAND_LAND = 0.455;
/** Donde descansa la intro: un pelo después, así el redondeo a px nunca queda corto. */
const BRAND_SETTLE = BRAND_LAND + 0.01;

document.addEventListener("DOMContentLoaded", () => {
  initializeBrandMorph();
  initializeIntroAutoScroll();
});

function initializeBrandMorph() {
  const stage = document.querySelector(".brand-stage");
  const lockup = document.querySelector(".brand-lockup");
  const symbol = lockup?.querySelector(".brand-lockup__symbol");
  const handoff = document.querySelector(".brand-stage__handoff");
  const grid = document.querySelector(".brand-stage__grid");
  const nav = document.querySelector(".site-nav");
  const target = document.querySelector(".site-brand");
  const targetSymbol = target?.querySelector(".site-brand__symbol");
  const targetName = target?.querySelector(".site-brand__name");
  if (!stage || !lockup || !symbol || !nav || !target || !targetSymbol || !targetName) return;

  // Sin GSAP o con reduced-motion: el navbar queda aterrizado y no hay viaje.
  if (MOTION.reduced() || !window.gsap || !window.ScrollTrigger) {
    document.body.classList.add("brand-landed");
    lockup.style.opacity = "0";
    if (handoff) handoff.style.opacity = "1";
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  const landing = { x: 0, y: 0, scale: 0.18 };

  /**
   * Mide contra el navbar usando el centro del símbolo como transformOrigin:
   * al escalar ese centro queda fijo, y x/y lo llevan justo sobre el chico.
   */
  const measure = () => {
    gsap.set(lockup, { clearProps: "transform" });
    const box = lockup.getBoundingClientRect();
    const from = symbol.getBoundingClientRect();
    const to = targetSymbol.getBoundingClientRect();
    if (from.width > 0 && to.width > 0) {
      gsap.set(lockup, {
        transformOrigin: `${from.left + from.width / 2 - box.left}px ${from.top + from.height / 2 - box.top}px`,
      });
      landing.scale = to.width / from.width;
      landing.x = to.left + to.width / 2 - (from.left + from.width / 2);
      landing.y = to.top + to.height / 2 - (from.top + from.height / 2);
    }
  };

  let impact;
  const playImpact = () => {
    impact?.kill();
    impact = gsap
      .timeline({ defaults: { overwrite: "auto" } })
      // 1. El símbolo entra a su lugar sobredimensionado y se asienta.
      .fromTo(targetSymbol, { x: 0, scale: 1.62, rotation: -14 }, { x: 0, scale: 1, rotation: 0, duration: 0.3, ease: "power4.out" }, 0)
      // 2. Contacto: el nombre sale despedido a la derecha (quad out → quad in: giro balístico).
      .fromTo(targetName, { x: 0 }, { x: 54, duration: 0.16, ease: "power1.out" }, 0.08)
      // 3. Vuelve y choca contra el símbolo.
      .to(targetName, { x: -24, duration: 0.19, ease: "power1.in" }, 0.24)
      // El símbolo se aplasta con el golpe y rebota elástico.
      .to(targetSymbol, { scaleX: 0.72, scaleY: 1.26, duration: 0.07, ease: "power2.out" }, 0.43)
      .to(targetSymbol, { scaleX: 1, scaleY: 1, duration: 0.9, ease: "elastic.out(1.1, 0.32)" }, 0.5)
      // 4. Cuatro rebotes, cada uno más débil. Encadenados con ">" (fin del anterior):
      // un .to() sin posición iría al final de TODA la timeline, detrás del elástico.
      .to(targetName, { x: 27, duration: 0.17, ease: "power2.out" }, 0.45)
      .to(targetName, { x: -13, duration: 0.15, ease: "power1.inOut" }, ">")
      .to(targetName, { x: 6, duration: 0.13, ease: "power1.inOut" }, ">")
      .to(targetName, { x: -2.4, duration: 0.11, ease: "power1.inOut" }, ">")
      .to(targetName, { x: 0, duration: 0.14, ease: "power2.out" }, ">");
  };

  const root = document.documentElement;
  let landed = false;
  const setLanded = (next, animate = true) => {
    if (next === landed) return;
    landed = next;
    document.body.classList.toggle("brand-landed", landed);
    if (landed) {
      if (animate) playImpact();
    } else {
      impact?.kill();
      gsap.set([targetName, targetSymbol], { clearProps: "transform" });
    }
  };

  // El snap hace scrollTo y `scroll-behavior: smooth` lo convierte en animación
  // nativa que ScrollTrigger lee como interrupción: se apaga durante el snap.
  const restoreScrollBehavior = () => { root.style.scrollBehavior = ""; };

  gsap.set(handoff, { opacity: 0, y: 30 });
  gsap.set(target, { opacity: 0 });
  measure();

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: stage,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.4,
      snap: {
        // Entre el inicio y el aterrizaje nunca queda a medias.
        snapTo: (value, self) => {
          const dir = self ? self.direction : 1;
          if (value > 0.02 && value < BRAND_LAND) return dir >= 0 ? BRAND_SETTLE : 0;
          return value;
        },
        inertia: false,
        duration: { min: 0.2, max: 0.45 },
        delay: 0.15,
        ease: "power2.out",
        onStart: () => { root.style.scrollBehavior = "auto"; },
        onInterrupt: restoreScrollBehavior,
        onComplete: restoreScrollBehavior,
      },
      invalidateOnRefresh: true,
      onRefreshInit: measure,
    },
  });

  timeline
    // 1. Viaje: llega con velocidad ("in"), el impacto no espera en el lugar.
    .to(lockup, { x: () => landing.x, y: () => landing.y, scale: () => landing.scale, duration: BRAND_LAND - 0.012 - 0.05, ease: "power2.in" }, 0.05)
    .to(grid, { scale: 1.14, opacity: 0.3, duration: 0.42, ease: "none" }, 0.05)
    // 2. La frase aparece rápido.
    .to(handoff, { opacity: 1, y: 0, duration: 0.12, ease: "power2.out" }, 0.06)
    // 3. Cruce al logo del navbar: termina exacto en BRAND_LAND.
    .to(lockup, { opacity: 0, duration: 0.012, ease: "none" }, BRAND_LAND - 0.012)
    .to(target, { opacity: 1, duration: 0.012, ease: "none" }, BRAND_LAND - 0.012)
    // Rellena hasta exactamente 1: así cada posición de arriba ES progreso de scroll.
    .set({}, {}, 1);

  // El aterrizaje sigue al playhead (con scrub), no al scroll crudo.
  timeline.eventCallback("onUpdate", () => {
    if (!ScrollTrigger.isRefreshing) setLanded(timeline.progress() >= BRAND_LAND);
  });
  ScrollTrigger.addEventListener("refresh", () => setLanded(timeline.progress() >= BRAND_LAND, false));

  // Mobile: tras aterrizar, la frase sube al centro y crece hasta el ancho.
  const phrase = handoff?.querySelector("p");
  if (phrase) {
    gsap.matchMedia().add(MOTION.flow, () => {
      const pin = stage.querySelector(".brand-stage__pin");
      gsap
        .timeline({ scrollTrigger: { trigger: stage, start: "top top", end: "bottom bottom", scrub: 0.68, invalidateOnRefresh: true } })
        .to(phrase, {
          y: () => pin.offsetHeight / 2 - (handoff.offsetTop + phrase.offsetTop + phrase.offsetHeight / 2),
          scale: () => Math.min(handoff.offsetWidth / Math.max(phrase.offsetWidth, 1), 1.6),
          duration: 0.43,
          ease: "power1.inOut",
        }, BRAND_LAND + 0.02)
        .set({}, {}, 1);
    });
  }

  ScrollTrigger.refresh();
}

/**
 * El primer gesto hacia abajo desde arriba desliza hasta el aterrizaje.
 * En desktop, el siguiente gesto NUEVO salta la cola vacía del pin hasta .next-section.
 */
function initializeIntroAutoScroll() {
  const stage = document.querySelector(".brand-stage");
  if (!stage || MOTION.reduced() || !window.gsap) return;
  const gsap = window.gsap;
  const next = document.querySelector(".next-section");
  let tween = null;
  let mode = null;
  let touchStartY = 0;
  let hasTriggered = false;
  let lastWheel = 0;

  const getLandingScroll = () => Math.ceil(Math.max(stage.offsetHeight - window.innerHeight, 1) * BRAND_SETTLE);
  const beforeLanding = () => window.scrollY < getLandingScroll() - 6;
  const getNextScroll = () => Math.round(next.getBoundingClientRect().top + window.scrollY);
  const inHandoff = () => !!next && window.matchMedia(MOTION.pinned).matches && !beforeLanding() && window.scrollY < getNextScroll() - 8;

  const abort = () => {
    if (!tween) return;
    tween.kill();
    tween = null;
    mode = null;
  };

  const glide = (top, duration, ease, nextMode) => {
    abort();
    mode = nextMode;
    const proxy = { y: window.scrollY };
    tween = gsap.to(proxy, {
      y: top,
      duration,
      ease,
      // "instant" pisa el scroll-behavior: smooth global en cada paso.
      onUpdate: () => window.scrollTo({ top: proxy.y, behavior: "instant" }),
      onComplete: () => { tween = null; mode = null; },
    });
  };

  const scrollToLanding = () => {
    if (!beforeLanding()) return;
    hasTriggered = true;
    glide(getLandingScroll(), 0.55, "power2.out", "intro");
  };
  const scrollToNext = () => { if (inHandoff()) glide(getNextScroll(), 0.9, "power2.inOut", "handoff"); };

  window.addEventListener("scroll", () => { if (window.scrollY <= 4) hasTriggered = false; }, { passive: true });

  window.addEventListener("wheel", (e) => {
    // Un trackpad manda ruedas (e inercia) todo el gesto: solo es "nuevo" tras una pausa.
    const now = performance.now();
    const fresh = now - lastWheel > 200;
    lastWheel = now;
    if (e.deltaY > 0) {
      if (beforeLanding() && !hasTriggered) scrollToLanding();
      else if (mode === "intro") abort(); // sigue bajando: se le devuelve el scroll nativo
      else if (!tween && fresh) scrollToNext();
    } else if (e.deltaY < 0 && tween) abort();
  }, { passive: true });

  window.addEventListener("touchstart", (e) => {
    if (e.touches.length) touchStartY = e.touches[0].clientY;
    if (tween) abort();
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (!e.touches.length) return;
    const delta = touchStartY - e.touches[0].clientY;
    if (delta > 5 && beforeLanding() && !hasTriggered) scrollToLanding();
    else if (delta > 5 && !tween) scrollToNext();
    else if (delta < -5 && tween) abort();
  }, { passive: true });

  window.addEventListener("keydown", (e) => {
    if (["ArrowDown", "PageDown", " "].includes(e.key)) {
      if (beforeLanding() && !hasTriggered) scrollToLanding();
      else if (!tween) scrollToNext();
    } else if (["ArrowUp", "PageUp", "Home", "Escape"].includes(e.key) && tween) abort();
  });
}
