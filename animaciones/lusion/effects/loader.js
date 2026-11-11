window.LoopSmithMotion ??= {};
window.LoopSmithMotion.loader = function mountLoader(root, {
  enabled = true, duration = 1.5, exit = .6, color = "#e4eea2", ease = "power3.out"
} = {}) {
  const gsap = window.gsap;
  const curtain = root.querySelector("[data-ls-loader]");
  const label = root.querySelector("[data-ls-count]");
  const mark = root.querySelector("[data-ls-loader-mark]");
  const initial = { hidden: curtain.hidden, style: curtain.getAttribute("style"), text: label.textContent };
  const motion = matchMedia("(prefers-reduced-motion: no-preference)");
  const events = new AbortController();
  const active = () => enabled && motion.matches && gsap;
  let intro;
  let leaving;

  curtain.style.setProperty("--ls-loader-color", color);

  function write(value) {
    const next = String(Math.round(Math.min(100, Math.max(0, value)))).padStart(3, "0");
    if (label.textContent !== next) label.textContent = next;
  }

  function hide() {
    curtain.hidden = true;
    intro?.revert();
    leaving?.revert();
    intro = leaving = undefined;
  }

  function setProgress(value) {
    if (!active() || !Number.isFinite(value) || leaving) return;
    curtain.hidden = false;
    write(value);
  }

  function finish() {
    if (curtain.hidden || leaving) return;
    if (!active()) { hide(); return; }
    intro?.revert();
    intro = undefined;
    write(100);
    leaving = gsap.context(() => gsap.to(curtain, { yPercent: -101, duration: exit, ease, onComplete: hide }), root);
  }

  function replay() {
    hide();
    if (!active()) return;
    const progress = { value: 0 };
    setProgress(0);
    intro = gsap.context(() => {
      const timeline = gsap.timeline({ onComplete: finish });
      timeline.to(progress, { value: 100, duration, ease: "power1.inOut", onUpdate: () => write(progress.value) });
      if (mark) timeline.from(mark, { rotation: -65, scale: .45, opacity: .2, duration: duration * .75, ease }, 0);
    }, root);
  }

  motion.addEventListener("change", () => { if (!motion.matches) hide(); }, { signal: events.signal });

  return { replay, setProgress, finish, destroy() {
    events.abort();
    hide();
    curtain.hidden = initial.hidden;
    label.textContent = initial.text;
    if (initial.style === null) curtain.removeAttribute("style");
    else curtain.setAttribute("style", initial.style);
  } };
};
