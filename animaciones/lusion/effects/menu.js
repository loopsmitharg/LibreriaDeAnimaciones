window.LoopSmithMotion ??= {};
window.LoopSmithMotion.menu = function mountMenu(root, {
  enabled = true, duration = .75, stagger = .09, wide = true, color = "#d9f678", ease = "power3.out"
} = {}) {
  const gsap = window.gsap;
  const dialog = root.querySelector("dialog");
  const surface = dialog.querySelector("[data-ls-menu-surface]");
  const wash = dialog.querySelector("[data-ls-menu-wash]");
  const items = [...dialog.querySelectorAll("[data-ls-menu-item]")];
  const openers = [...root.querySelectorAll("[data-ls-menu-open]")];
  const previousStyle = dialog.getAttribute("style");
  const previousWide = dialog.classList.contains("ls-menu--wide");
  const previousOpeners = openers.map((button) => ({ hidden: button.hidden, expanded: button.getAttribute("aria-expanded") }));
  const motion = matchMedia("(prefers-reduced-motion: no-preference)");
  const events = new AbortController();
  const listener = { signal: events.signal };
  let opener;
  let animation;
  let timeline;
  let closing = false;
  let destination;

  dialog.style.setProperty("--ls-menu-bg", color);
  dialog.classList.toggle("ls-menu--wide", wide);
  openers.forEach((button) => { button.hidden = false; });

  function hide() {
    if (dialog.open) dialog.close();
    animation?.revert();
    animation = undefined;
    timeline = undefined;
    openers.forEach((button) => button.setAttribute("aria-expanded", "false"));
    if (destination) {
      location.hash = destination.hash;
      destination.target.scrollIntoView();
      destination.target.focus({ preventScroll: true });
      destination = undefined;
    } else if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = undefined;
    closing = false;
  }

  function open(button) {
    if (dialog.open) return;
    opener = button;
    dialog.showModal();
    openers.forEach((item) => item.setAttribute("aria-expanded", "true"));
    if (enabled && motion.matches && gsap) {
      animation = gsap.context(() => {
        timeline = gsap.timeline({ defaults: { ease }, onReverseComplete: hide });
        if (wash) timeline.from(wash, { opacity: 0, duration: duration * .65 });
        timeline.from(surface, { y: 42, rotation: -2, opacity: .002, duration }, 0);
        if (items.length) timeline.from(items, { y: 16, opacity: .002, duration: duration * .65, stagger }, duration * .16);
      }, root);
    }
  }

  function close() {
    if (!dialog.open || closing) return;
    closing = true;
    if (timeline?.progress() > 0 && motion.matches) timeline.reverse();
    else hide();
  }

  openers.forEach((button) => button.addEventListener("click", () => open(button), listener));
  dialog.querySelector("[data-ls-menu-close]").addEventListener("click", close, listener);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); }, listener);
  dialog.addEventListener("click", (event) => {
    if (event.target === wash || event.target === dialog) { close(); return; }
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const url = new URL(link.href);
    if (!url.hash || url.href.split("#")[0] !== location.href.split("#")[0]) return;
    let id = url.hash.slice(1);
    try { id = decodeURIComponent(id); } catch { /* Conservá el fragmento literal. */ }
    const target = document.getElementById(id);
    if (!target || dialog.contains(target)) return;
    event.preventDefault();
    destination = { hash: url.hash, target };
    close();
  }, listener);
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = [...dialog.querySelectorAll("a[href], button, input, select, textarea, [tabindex]")]
      .filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && !element.closest("[inert]") && element.getClientRects().length);
    const edge = event.shiftKey ? focusable[0] : focusable.at(-1);
    if (document.activeElement !== edge) return;
    event.preventDefault();
    (event.shiftKey ? focusable.at(-1) : focusable[0]).focus();
  }, listener);
  dialog.addEventListener("close", () => {
    if (!dialog.open && opener) hide();
  }, listener);
  motion.addEventListener("change", () => {
    if (motion.matches) return;
    animation?.revert();
    animation = undefined;
    timeline = undefined;
    if (closing) hide();
  }, listener);

  return {
    replay: () => open(openers[0]),
    destroy() {
      events.abort();
      destination = undefined;
      if (dialog.open || opener) hide();
      dialog.classList.toggle("ls-menu--wide", previousWide);
      openers.forEach((button, index) => {
        const { hidden, expanded } = previousOpeners[index];
        button.hidden = hidden;
        if (expanded === null) button.removeAttribute("aria-expanded");
        else button.setAttribute("aria-expanded", expanded);
      });
      if (previousStyle === null) dialog.removeAttribute("style");
      else dialog.setAttribute("style", previousStyle);
    }
  };
};
