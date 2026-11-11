window.LoopSmithMotion ??= {};
window.LoopSmithMotion.type = function mountType(root, {
  enabled = true, mode = "lines", trigger = "load", duration = .75, delay = 0,
  stagger = .07, distance = 105, scale = .92, ease = "power3.out", repeat = false
} = {}) {
  const gsap = window.gsap;
  const media = gsap?.matchMedia();
  let timeline;

  if (enabled) media?.add("(prefers-reduced-motion: no-preference)", () => {
    const lines = [...root.querySelectorAll("[data-ls-line]")];
    if (!lines.length) return;
    const originals = lines.map((line) => [...line.childNodes]);
    const pieces = [];
    const splitter = Intl.Segmenter && new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const span = (className, text = "") => {
      const element = document.createElement("span");
      element.className = className;
      element.textContent = text;
      return element;
    };
    const mask = (value) => {
      const clip = span("ls-type__mask");
      const piece = span("ls-type__piece", value);
      pieces.push(piece);
      clip.append(piece);
      return clip;
    };

    lines.forEach((line) => {
      const value = line.textContent;
      const spoken = span("ls-type__spoken", value);
      const visual = span("ls-type__visual");
      visual.setAttribute("aria-hidden", "true");
      if (mode === "lines") visual.append(mask(value));
      else value.split(/(\s+)/).forEach((word) => {
        if (!word || /^\s+$/.test(word)) visual.append(word);
        else if (mode === "words") visual.append(mask(word));
        else {
          const group = span("ls-type__word");
          const chars = splitter ? [...splitter.segment(word)].map(({ segment }) => segment) : Array.from(word);
          group.append(...chars.map(mask));
          visual.append(group);
        }
      });
      line.replaceChildren(spoken, visual);
    });

    timeline = gsap.timeline({ paused: true, delay });
    timeline.fromTo(pieces, { yPercent: distance, scale, opacity: .002 }, {
      yPercent: 0, scale: 1, opacity: 1, duration, stagger, ease
    });
    let observer;
    if (trigger === "viewport") {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          timeline.restart(true);
          if (!repeat) observer.disconnect();
        } else if (repeat) timeline.pause(0);
      }, { threshold: .1 });
      observer.observe(root);
    } else timeline.restart(true);

    return () => {
      observer?.disconnect();
      lines.forEach((line, index) => line.replaceChildren(...originals[index]));
      timeline = undefined;
    };
  }, root);

  return { replay: () => timeline?.restart(true), destroy: () => media?.revert() };
};
