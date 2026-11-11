(() => {
  const timing = ["duration", "Duración (s)", .75, .15, 2, .05];
  const curve = ["ease", "Curva", "power3.out", { "power3.out": "Aterrizaje", "power2.inOut": "Suave", "expo.out": "Cinemática", "none": "Lineal" }];
  const enabled = ["enabled", "Animación activa", true];
  const demos = {
    hero: {
      n: "01", name: "Hero de órbitas", lead: "Órbitas suspendidas, entrada escalonada y un campo de profundidad que sigue al puntero.",
      fields: [timing, ["speed", "Ciclo (s)", 5, 2, 10, .5], ["distance", "Parallax (px)", 36, 0, 80, 2], ["perspective", "Perspectiva (px)", 780, 400, 1500, 20], ["count", "Órbitas", 5, 1, 5, 1], ["color", "Tono principal", "#d9f678"], curve, enabled],
      perf: "El bucle se pausa fuera de pantalla. La entrada, la flotación y el parallax actúan en capas separadas.",
      mobile: "La flotación se conserva. El seguimiento del puntero requiere mouse o trackpad."
    },
    cursor: {
      n: "02", name: "Campo magnético", lead: "Un halo con inercia y tres objetivos que atraen o repelen el puntero.",
      fields: [["distance", "Radio de captura (px)", 95, 40, 160, 5], ["strength", "Intensidad", .38, 0, .75, .01], ["duration", "Inercia (s)", .38, .1, 1.2, .02], ["rotation", "Giro máximo (°)", 15, 0, 35, 1], curve, enabled],
      perf: "Usa quickTo. Mide solo los objetivos fijos y actualiza su geometría al cambiar el tamaño, el scroll o el layout.",
      mobile: "Se puede seleccionar cada botón con tacto o teclado. El halo solo sigue al mouse."
    },
    type: {
      n: "03", name: "Tipografía en escena", lead: "Una misma composición con máscaras por línea, palabras o caracteres.",
      fields: [["mode", "Unidad", "lines", { lines: "Líneas", words: "Palabras", chars: "Caracteres" }], ["trigger", "Inicio", "load", { load: "Al cargar", viewport: "Al entrar en pantalla" }], timing, ["delay", "Demora (s)", 0, 0, 1, .05], ["stagger", "Escalonado (s)", .07, 0, .25, .01], ["distance", "Desplazamiento (%)", 105, -120, 120, 5], ["scale", "Escala inicial", .92, .65, 1.2, .01], curve, enabled],
      perf: "Segmenta texto plano una vez por montaje. Las máscaras solo se mueven durante la entrada.",
      mobile: "El texto se adapta al ancho y sigue disponible para lectores de pantalla."
    },
    story: {
      n: "04", name: "Umbral de profundidad", lead: "Desplazá la vista previa para atravesar un umbral, cambiar de luz y desandar el recorrido.",
      fields: [["distance", "Recorrido (px)", 1250, 500, 2200, 50], ["scrub", "Inercia de scroll (s)", .35, 0, 1.2, .05], ["zoom", "Zoom final", 2.8, 1.4, 4.5, .1], ["twist", "Giro (°)", 38, -80, 80, 2], ["pin", "Anclar en escritorio", true], enabled],
      perf: "ScrollTrigger sincroniza capas y textos con el scroll. El cambio de luz usa opacidad.",
      mobile: "Sin anclaje en pantallas de hasta 900 px. El recorrido sigue con una escena sticky; con movimiento reducido se muestran los tres textos en flujo.",
      scroll: true
    },
    gallery: {
      n: "05", name: "Galería cinética", lead: "Tarjetas con entrada en perspectiva, detalle al interactuar y un cambio de composición entre grilla y lista.",
      fields: [timing, ["tilt", "Inclinación (°)", 9, 0, 22, 1], ["zoom", "Zoom de imagen", 1.12, 1, 1.35, .01], ["hoverVideo", "Video al pasar o enfocar", true], ["scramble", "Cifrar etiquetas al entrar", true], curve, enabled],
      perf: "El video se carga bajo demanda y se pausa al salir de vista. El cambio de layout mide solo al cambiar entre lista y grilla.",
      mobile: "Las tarjetas se apilan. El video tiene control propio y la perspectiva no sigue el tacto.",
      assets: ["media/prisma.jpg", "media/prisma.mp4"]
    },
    menu: {
      n: "06", name: "Menú en cascada", lead: "Un menú de pantalla completa con entrada por paneles y enlaces que se levantan al enfocarlos.",
      fields: [timing, ["stagger", "Escalonado (s)", .09, 0, .25, .01], ["wide", "Pantalla completa", true], ["color", "Color de fondo", "#d9f678"], curve, enabled],
      perf: "Un timeline reversible gobierna el fondo y los enlaces del diálogo.",
      mobile: "Ocupa la pantalla en formato angosto. Escape, tabulación y foco de retorno se apoyan en el diálogo nativo.",
      root: "[data-ls-menu-root]"
    },
    ribbon: {
      n: "07", name: "Trazo en recorrido", lead: "Desplazá la vista previa y seguí una línea continua entre dos bloques de texto.",
      fields: [["scrub", "Inercia de scroll (s)", .25, 0, 1.2, .05], ["width", "Grosor (px)", 18, 2, 40, 1], ["color", "Color del trazo", "#a4bc54"], ["reverse", "Dibujar desde el final", false], enabled],
      perf: "Solo cambia stroke-dashoffset de un camino SVG. El SVG queda estático cuando se desactiva el movimiento.",
      mobile: "El trazo acompaña el desplazamiento táctil sin anclar la escena.",
      scroll: true
    },
    loader: {
      n: "08", name: "Precarga numérica", lead: "Un contador y una cortina de salida. La vista previa simula progreso para que se pueda repetir.",
      fields: [["duration", "Progreso simulado (s)", 1.5, .4, 4, .1], ["exit", "Salida (s)", .6, .15, 1.5, .05], ["color", "Color de la cortina", "#e4eea2"], curve, enabled],
      perf: "El contador solo actualiza al cambiar el entero visible. La cortina sale con transform.",
      mobile: "El contador y el signo ajustan el tamaño. Con movimiento reducido se omite la cortina.",
      root: "[data-ls-loader-root]"
    },
    transition: {
      n: "09", name: "Cortina entre páginas", lead: "Navegá entre Materia y Luz. Una cortina cubre la salida y se retira al entrar en la otra URL.",
      fields: [["duration", "Duración por tramo (s)", .5, .15, 1.4, .05], ["color", "Color de cortina", "#d9f678"], curve, enabled],
      perf: "Una capa cubre la escena con transform. El enlace mantiene la navegación y el historial del navegador.",
      mobile: "Funciona por toque o teclado. Con movimiento reducido el enlace navega directamente."
    },
    particles: {
      n: "10", name: "Retrato de partículas", lead: "Una silueta construida con puntos. Dispersalos y volvé a reunirlos con el botón de la escena.",
      fields: [["count", "Partículas", 560, 160, 800, 20], ["spread", "Dispersión (px SVG)", 125, 30, 220, 5],
        ["distance", "Parallax (px)", 25, 0, 50, 5], ["duration", "Duración (s)", .8, .15, 2, .05],
        ["color", "Color del retrato", "#a9d8e4"], enabled],
      perf: "Los puntos se generan al montar. El movimiento continuo afecta cuatro grupos. Los puntos se animan por separado al dispersarse.",
      mobile: "El botón funciona por toque y teclado. El parallax requiere puntero fino y el retrato queda quieto con movimiento reducido."
    },
    solids: {
      n: "11", name: "Piezas volumétricas", lead: "Cuerpos huecos construidos con caras HTML. Cambiá la perspectiva y acercá el puntero para ver cómo se cruzan los planos.",
      fields: [["count", "Objetos", 4, 1, 4, 1], ["speed", "Giro completo (s)", 14, 5, 25, 1],
        ["perspective", "Perspectiva (px)", 820, 450, 1500, 10], ["distance", "Parallax (px)", 36, 0, 80, 2],
        timing, ["color", "Color de la pieza principal", "#d4e999"], curve, enabled],
      perf: "Las caras son estáticas. GSAP transforma los cuerpos y pausa la rotación fuera de pantalla.",
      mobile: "La escena adapta el encuadre y conserva la rotación. El parallax se desactiva con tacto."
    }
  };

  const params = new URLSearchParams(location.search);
  const name = params.get("demo");
  if (!Object.hasOwn(demos, name)) return;

  const demo = demos[name];
  const rootSelector = demo.root || `[data-ls-${name}]`;
  const controls = document.querySelector("#controls");
  const preview = document.querySelector("#preview");
  const snippet = document.querySelector("#snippet");
  const status = document.querySelector("#status");
  const replay = document.querySelector("#replay");
  const vendor = "../../assets/vendor/";
  let controller;
  let mount;
  let scene;

  document.title = `${demo.name} · Loop Smiths`;
  document.querySelector("#demo-name").textContent = demo.name;
  document.querySelector("#demo-lead").textContent = demo.lead;
  document.querySelector("#demo-kicker").textContent = `Pieza ${demo.n} / ${Object.keys(demos).length}`;
  document.querySelector("#collection").hidden = true;
  document.querySelector("#detail").hidden = false;

  const dependencies = demo.scroll ? "GSAP 3.12.5 y ScrollTrigger, locales." : "GSAP 3.12.5 local.";
  const files = demo.assets ? ` Recursos de la demo: ${demo.assets.join(" y ")}.` : "";
  document.querySelector("#demo-notes").innerHTML = `
    <div><h3>Dependencias</h3><p>${dependencies}${files}</p></div>
    <div><h3>Rendimiento</h3><p>${demo.perf}</p></div>
    <div><h3>Móvil y accesibilidad</h3><p>${demo.mobile}</p></div>
    <div><h3>Archivos</h3><p><a href="effects/${name}.css" download>${name}.css ↓</a> · <a href="effects/${name}.js" download>${name}.js ↓</a></p></div>`;

  function createField([key, label, value, min, max, step]) {
    const row = document.createElement("div");
    row.className = "lab-field";
    const caption = document.createElement("label");
    caption.htmlFor = key;
    caption.textContent = label;
    row.append(caption);

    const select = min && typeof min === "object";
    const field = document.createElement(select ? "select" : "input");
    field.id = field.name = key;
    if (select) {
      for (const [id, text] of Object.entries(min)) field.add(new Option(text, id, id === value));
    } else if (typeof value === "boolean") {
      field.type = "checkbox";
      field.defaultChecked = value;
    } else if (typeof value === "number") {
      field.type = "range";
      Object.assign(field, { min, max, step, defaultValue: value });
      const output = document.createElement("output");
      output.htmlFor = key;
      output.setAttribute("aria-hidden", "true");
      row.append(output);
    } else {
      field.type = "color";
      field.defaultValue = value;
    }
    row.append(field);

    if (name === "transition" && params.has(key)) {
      const saved = params.get(key);
      if (field.type === "checkbox") field.checked = saved === "true";
      else if (field.type !== "select-one" || Object.hasOwn(min, saved)) field.value = saved;
    }
    return row;
  }

  document.querySelector("#fields").append(...demo.fields.map(createField));

  const template = document.getElementById(name);
  const getOptions = () => Object.fromEntries(demo.fields.map(([key]) => {
    const field = controls.elements.namedItem(key);
    if (field.type === "checkbox") return [key, field.checked];
    if (field.type === "range") return [key, field.valueAsNumber];
    return [key, field.value];
  }));

  function updateCode() {
    const options = getOptions();
    controls.querySelectorAll("output").forEach((output) => {
      output.value = options[output.htmlFor.value];
    });
    const markup = template.content.querySelector(rootSelector).cloneNode(true);
    let note = "";
    if (name === "transition") {
      const second = params.get("scene") === "2";
      markup.querySelector(`[data-lab-scene="${second ? 1 : 2}"]`).remove();
      const panel = markup.querySelector("[data-lab-scene]");
      panel.hidden = false;
      panel.removeAttribute("data-lab-scene");
      panel.querySelector("a").setAttribute("href", second ? "materia.html" : "luz.html");
      note = "<!-- Montá el módulo en ambas páginas. -->\n";
    }
    if (demo.assets) note = "<!-- Copiá media/prisma.jpg y media/prisma.mp4 o reemplazalos con tus recursos. -->\n";
    if (name === "menu") {
      const destinations = ["./index.html", "./servicios.html", "./proyectos.html", "#contacto", "./catalogo.html"];
      markup.querySelectorAll("a").forEach((link, index) => link.setAttribute("href", destinations[index]));
      note = "<!-- Adaptá los enlaces a tu sitio. El destino de una sección puede usar tabindex=\"-1\" para recibir el foco. -->\n";
    }
    if (name === "loader") note = "<!-- Para progreso real, usá setProgress(0–100) y finish(). -->\n";
    const vendorTags = [`<script src="${vendor}gsap.min.js"></script>`];
    if (demo.scroll) vendorTags.push(`<script src="${vendor}ScrollTrigger.min.js"></script>`);
    snippet.textContent = `<link rel="stylesheet" href="effects/${name}.css">\n\n${note}${markup.outerHTML}\n\n${vendorTags.join("\n")}\n<script src="effects/${name}.js"></script>\n<script>\n  const efecto = LoopSmithMotion.${name}(document.querySelector('${rootSelector}'), ${JSON.stringify(options, null, 2).replaceAll("\n", "\n  ")});\n${name === "loader" ? "  efecto.replay();\n" : ""}  // efecto.destroy() al desmontar el componente.\n</script>`;
  }

  function setupPreview(shouldReplay = false) {
    if (!mount) return;
    controller?.destroy();
    if (!scene) {
      preview.replaceChildren(template.content.cloneNode(true));
      scene = preview.querySelector(rootSelector);
    }
    const options = getOptions();
    if (demo.scroll) {
      options.scroller = preview.querySelector("[data-lab-scroll]");
      if (shouldReplay) options.scroller.scrollTop = 0;
    }
    if (name === "transition") {
      const current = params.get("scene") === "2" ? 2 : 1;
      scene.querySelectorAll("[data-lab-scene]").forEach((panel) => {
        panel.hidden = Number(panel.dataset.labScene) !== current;
        const link = panel.querySelector("a");
        const url = new URL(link.href);
        for (const [key, value] of Object.entries(options)) url.searchParams.set(key, value);
        link.href = url.href;
      });
    }
    controller = mount(scene, options);
    if (shouldReplay || name === "loader") controller.replay?.();
  }

  controls.addEventListener("input", updateCode);
  controls.addEventListener("change", () => setupPreview());
  controls.addEventListener("reset", () => requestAnimationFrame(() => {
    updateCode();
    setupPreview(true);
  }));
  replay.addEventListener("click", () => setupPreview(true));
  document.querySelector("#copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(snippet.textContent);
      status.textContent = "Código copiado.";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(snippet);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = "Código seleccionado. Copialo con Ctrl+C o Cmd+C.";
    }
  });

  function load(tag, url) {
    return new Promise((resolve, reject) => {
      const element = document.createElement(tag);
      element.onload = resolve;
      element.onerror = reject;
      if (tag === "script") element.src = url;
      else Object.assign(element, { rel: "stylesheet", href: url });
      document.head.append(element);
    });
  }

  async function start() {
    const css = load("link", `effects/${name}.css`);
    const scripts = (async () => {
      try {
        await load("script", `${vendor}gsap.min.js`);
        if (demo.scroll) await load("script", `${vendor}ScrollTrigger.min.js`);
      } catch {
        status.textContent = "GSAP no está disponible. La vista previa se muestra en su estado estático.";
      }
      await load("script", `effects/${name}.js`);
    })();
    await Promise.all([css, scripts]);
    mount = window.LoopSmithMotion[name];
    setupPreview();
  }

  updateCode();
  start().catch((error) => {
    console.error("No se pudo iniciar la demo", error);
    preview.innerHTML = '<p class="lab-error">La vista previa no pudo cargar. Revisá que los archivos de la demo estén disponibles.</p>';
  });
})();
