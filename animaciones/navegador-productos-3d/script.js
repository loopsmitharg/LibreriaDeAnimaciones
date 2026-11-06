/**
 * Navegador de productos 3D a pantalla completa.
 * Reconstrucción propia del menú "Products" de zentry.com (observado en el sitio,
 * sin su código ni su arte): overlay con scroll propio + snap, lista de títulos
 * gigantes y anillo de tarjetas en CSS 3D, todo dibujado desde un índice continuo t.
 */
(function () {
  "use strict";

  // Por cada paso de distancia al activo (en anchos de tarjeta y grados):
  const NEXT = { x: 1.08, z: 0.45, rot: 26 };  // las que vienen (derecha)
  const PREV = { x: 0.8, z: 0.3, rot: 78 };    // las que se van (izquierda, casi de canto)
  const LIST_LINE = { desktop: 0.6, mobile: 0.74 }; // altura (en vh) donde se centra el título activo

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 900px)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  document.addEventListener("DOMContentLoaded", () => {
    const gsap = window.gsap;
    const overlay = document.getElementById("pnav");
    if (!overlay || !gsap) return;
    const scroller = overlay.querySelector(".pnav__scroller");
    const listInner = overlay.querySelector(".pnav__listInner");
    const items = [...overlay.querySelectorAll(".pnav__item")];
    const cards = [...overlay.querySelectorAll(".pcard")];
    const snaps = [...overlay.querySelectorAll(".pnav__snaps i")];
    const stage = overlay.querySelector(".pnav__stage");
    const info = overlay.querySelector(".pnav__info");
    const infoName = overlay.querySelector("[data-info-name]");
    const infoLayer = overlay.querySelector("[data-info-layer]");
    const infoDesc = overlay.querySelector("[data-info-desc]");
    const progress = overlay.querySelector(".pnav__progress b");
    const hint = overlay.querySelector(".pnav__hint");
    const openers = [...document.querySelectorAll("[data-pnav-open]")];
    const count = items.length;

    // Colores leídos de las custom properties, no hardcodeados.
    const css = getComputedStyle(document.documentElement);
    const ACCENT = css.getPropertyValue("--accent").trim() || "#5542ff";
    const TEXT = css.getPropertyValue("--text").trim() || "#f5f3ff";
    const colorAt = gsap.utils.interpolate(ACCENT, TEXT);

    /* ---- Medidas (solo al abrir y al cambiar de tamaño) ---------------- */
    let step = 1;        // px de scroll por producto
    let centers = [];    // centro vertical de cada título dentro de la lista
    let cardW = 300;
    const measure = () => {
      step = snaps[0]?.offsetHeight || window.innerHeight * 0.55;
      centers = items.map((it) => {
        const title = it.querySelector(".pnav__title");
        return it.offsetTop + title.offsetTop + title.offsetHeight / 2;
      });
      cardW = cards[0]?.offsetWidth || 300;
    };

    /* ---- Render: todo sale de t (índice continuo) ---------------------- */
    const state = { t: 0 };
    let activeIndex = -1;

    const render = (t) => {
      // Tarjetas: recorrido asimétrico. Las que vienen esperan a la derecha,
      // giradas y hacia atrás; la que se va sale por la izquierda de canto.
      cards.forEach((card, i) => {
        const d = i - t;
        const far = Math.abs(d);
        const side = d >= 0 ? NEXT : PREV;
        gsap.set(card, {
          xPercent: -50,
          yPercent: -50,
          x: d * side.x * cardW,
          z: -far * side.z * cardW,
          rotationY: d * side.rot,
          opacity: clamp(d < 0 ? 1.9 - far * 1.2 : 2.7 - far),
          zIndex: 100 - Math.round(far * 10),
        });
      });
      if (hint) hint.style.opacity = String(clamp(1 - t * 2.5));

      // Lista: centra el título activo interpolando entre posiciones medidas.
      const i0 = clamp(Math.floor(t), 0, count - 1);
      const i1 = clamp(i0 + 1, 0, count - 1);
      const f = t - i0;
      const center = centers[i0] + (centers[i1] - centers[i0]) * f;
      const line = window.innerHeight * (isMobile() ? LIST_LINE.mobile : LIST_LINE.desktop);
      gsap.set(listInner, { y: line - center });
      const mobile = isMobile();
      items.forEach((it, i) => {
        const k = clamp(1 - Math.abs(i - t));
        it.style.color = colorAt(k);
        // En teléfono la lista queda debajo de las tarjetas: los títulos ya pasados se apagan.
        it.style.opacity = mobile ? String(clamp(1 - (t - i - 0.3) * 1.6)) : "";
      });

      // Texto de la derecha: cambia cuando cambia el producto más cercano.
      const next = clamp(Math.round(t), 0, count - 1);
      if (next !== activeIndex) setActive(next);
    };

    const setActive = (i) => {
      const first = activeIndex === -1;
      activeIndex = i;
      items.forEach((it, j) => it.setAttribute("aria-current", j === i ? "true" : "false"));
      if (progress) progress.textContent = String(i + 1).padStart(2, "0");
      const swap = () => {
        infoName.textContent = items[i].dataset.name;
        infoLayer.textContent = items[i].dataset.layer;
        infoDesc.textContent = items[i].dataset.desc;
      };
      if (first || reduced()) return swap();
      gsap.timeline({ overwrite: true })
        .to(info, { y: -10, opacity: 0.002, duration: 0.18, ease: "power2.in" })
        .add(swap)
        .fromTo(info, { y: 14 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
    };

    // El scroll da el destino; quickTo lo suaviza (misma curva para todo).
    const followT = gsap.quickTo(state, "t", { duration: reduced() ? 0.01 : 0.9, ease: "power3.out", onUpdate: () => render(state.t) });
    scroller.addEventListener("scroll", () => followT(scroller.scrollTop / step), { passive: true });

    const goTo = (i) => {
      const target = clamp(i, 0, count - 1);
      scroller.scrollTo({ top: target * step, behavior: reduced() ? "auto" : "smooth" });
    };

    // Rueda: un gesto = un producto. Un trackpad manda decenas de eventos (más la
    // inercia) por gesto; solo cuenta el primero tras 160ms de silencio.
    let lastWheel = 0;
    scroller.addEventListener("wheel", (e) => {
      if (e.ctrlKey || !e.deltaY) return;
      e.preventDefault();
      const now = performance.now();
      const fresh = now - lastWheel > 160;
      lastWheel = now;
      if (fresh) goTo(activeIndex + Math.sign(e.deltaY));
    }, { passive: false });

    /* ---- Abrir / cerrar ------------------------------------------------- */
    let opener = null;
    let isOpen = false;

    const open = (trigger) => {
      if (isOpen) return;
      isOpen = true;
      opener = trigger || null;
      overlay.hidden = false;
      document.body.classList.add("pnav-open");
      openers.forEach((b) => b.setAttribute("aria-expanded", "true"));
      measure();
      state.t = scroller.scrollTop / step; // vuelve donde quedó
      render(state.t);
      scroller.focus({ preventScroll: true });

      if (reduced()) return gsap.set(overlay, { opacity: 1 });
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.45 })
        .fromTo(items, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.06 }, 0.1)
        .fromTo(stage, { yPercent: 45, rotation: 8, opacity: 0 }, { yPercent: 0, rotation: 0, opacity: 1, duration: 1.15, ease: "power4.out" }, 0.05)
        .fromTo([info, ".pnav__progress"], { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05 }, 0.45)
        .fromTo(".pnav__close", { rotation: -90, scale: 0.6, opacity: 0 }, { rotation: 0, scale: 1, opacity: 1, duration: 0.6 }, 0.3)
        // Devuelve el transform al CSS (el hover del botón cerrar gira con :hover).
        .set(".pnav__close", { clearProps: "transform" });
    };

    const close = () => {
      if (!isOpen) return;
      isOpen = false;
      const done = () => {
        overlay.hidden = true;
        document.body.classList.remove("pnav-open");
        openers.forEach((b) => b.setAttribute("aria-expanded", "false"));
        gsap.set([items, stage, info], { clearProps: "opacity,transform" });
        opener?.focus({ preventScroll: true });
      };
      if (reduced()) return done();
      gsap.timeline({ onComplete: done })
        .to(stage, { yPercent: 30, opacity: 0, duration: 0.45, ease: "power3.in" }, 0)
        .to(items, { yPercent: -40, opacity: 0, duration: 0.35, stagger: 0.03, ease: "power2.in" }, 0)
        .to(overlay, { opacity: 0, duration: 0.35, ease: "power2.in" }, 0.2);
    };

    /* ---- Eventos (delegados) ------------------------------------------- */
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-pnav-open]");
      if (trigger) return isOpen ? close() : open(trigger);
      if (e.target.closest("[data-pnav-close]")) return close();
      const item = e.target.closest(".pnav__item");
      if (item) return goTo(Number(item.dataset.index));
    });

    document.addEventListener("keydown", (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") return close();
      const dir = { ArrowDown: 1, PageDown: 1, ArrowRight: 1, ArrowUp: -1, PageUp: -1, ArrowLeft: -1 }[e.key];
      if (dir) {
        e.preventDefault();
        goTo(activeIndex + dir);
        return;
      }
      if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        goTo(e.key === "Home" ? 0 : count - 1);
        return;
      }
      // Foco atrapado dentro del diálogo.
      if (e.key === "Tab") {
        const focusables = [...overlay.querySelectorAll("button, a[href]")];
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    window.addEventListener("resize", () => {
      if (!isOpen) return;
      measure();
      scroller.scrollTop = activeIndex * step;
      state.t = activeIndex;
      render(state.t);
    });

    // Las fuentes cambian el alto de los títulos: re-medir cuando cargan.
    document.fonts?.ready.then(() => { if (isOpen) { measure(); render(state.t); } });
  });
})();
