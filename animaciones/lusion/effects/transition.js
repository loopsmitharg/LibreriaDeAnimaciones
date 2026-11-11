window.LoopSmithMotion ??= {};
window.LoopSmithMotion.transition = function mountTransition(root, {
  enabled = true, duration = .5, color = "#d9f678", ease = "power3.out"
} = {}) {
  const gsap = window.gsap;
  const curtain = root.querySelector("[data-ls-curtain]");
  const originalStyle = curtain.getAttribute("style");
  const originalHidden = curtain.hidden;
  const motion = matchMedia("(prefers-reduced-motion: no-preference)");
  const events = new AbortController();
  const listener = { signal: events.signal };
  const active = () => enabled && motion.matches && gsap;
  const key = "loop-smiths:curtain";
  let animation;
  let pending;

  curtain.style.setProperty("--ls-curtain-color", color);

  function hide() {
    curtain.hidden = true;
    animation?.revert();
    animation = undefined;
  }

  function arrive() {
    hide();
    if (!active() || pending) return;
    curtain.hidden = false;
    animation = gsap.context(() => gsap.fromTo(curtain, { yPercent: 0 }, { yPercent: -101, duration, ease, onComplete: hide }), root);
  }

  function navigate() {
    if (!pending) return;
    const url = pending;
    try { sessionStorage.setItem(key, JSON.stringify({ url, time: Date.now() })); } catch { /* La navegación puede continuar. */ }
    try { location.assign(url); } catch { pending = undefined; hide(); }
  }

  try {
    const handoff = JSON.parse(sessionStorage.getItem(key));
    if (handoff?.url === location.href) {
      sessionStorage.removeItem(key);
      if (Date.now() - handoff.time < 10000) arrive();
    }
  } catch { /* La entrada sigue visible si storage está restringido. */ }

  root.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !active()) return;
    const link = event.target.closest("a[data-ls-transition-link][href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.protocol !== location.protocol || !["https:", "http:", "file:"].includes(url.protocol)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    event.preventDefault();
    if (pending) return;
    pending = url.href;
    hide();
    curtain.hidden = false;
    animation = gsap.context(() => gsap.fromTo(curtain, { yPercent: 101 }, { yPercent: 0, duration, ease, onComplete: navigate }), root);
  }, listener);

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    pending = undefined;
    hide();
  }, listener);
  motion.addEventListener("change", () => {
    if (motion.matches) return;
    hide();
    navigate();
  }, listener);

  return { replay: arrive, destroy() {
    events.abort();
    pending = undefined;
    hide();
    curtain.hidden = originalHidden;
    if (originalStyle === null) curtain.removeAttribute("style");
    else curtain.setAttribute("style", originalStyle);
  } };
};
