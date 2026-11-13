# Loop Smith — Typography Playground

Colección de 30 animaciones tipográficas construidas sobre las letras del logo de Loop Smith.
Solo HTML, CSS, JavaScript y GSAP. Sin frameworks, sin WebGL, sin video ni GIF.

- Galería: `animaciones/tipografia-loopsmith/index.html`
- Una animación: `index.html?demo=<id>` · escenas de scroll a página completa: `&full=1`

## 1. El logo: qué se reconstruyó y con qué evidencia

**Referencia usada.** No hay un archivo vectorial del logo en este repositorio ni en el del sitio.
La referencia más reciente y completa que existe en la máquina es el lockup del sitio
(`LoopSmith/css/styles.css` → `.site-brand`) y la portada del anuncio del 6/11/2026
(`LoopSmith/marketing/loopsmith-web-ads/out/loopsmith-web-cover.png`), que coinciden:

| Elemento | Definición |
| --- | --- |
| Inscripción | `Loop Smith` (dos palabras, L y S mayúsculas). `docs/INVESTIGACION.md` del anuncio lo fija: "Loop Smith (no Loop Smiths)" |
| Tipografía | Outfit 700, `letter-spacing: -0.045em`, `line-height: 1` |
| Proporciones | símbolo = 1em · separación = 0.2884em · cuerpo del nombre = 0.5023em · centrado vertical |
| Color | "Loop" en el color de texto, "Smith" en lima `#a3e635` (tema claro: `#43700c`) |
| Símbolo | cuadrado redondeado con degradado lima → esmeralda y una "L" oscura (`assets/images/logo-loopsmith.png`, 512 px) |

**Wordmark: fidelidad exacta.** `tools/build-logo-data.py` instancia la Outfit variable del repo en
peso 700, la pasa por HarfBuzz (kerning incluido) y exporta cada glifo como contorno SVG con su
posición. Verificado en el navegador contra el texto vivo con el CSS del sitio: mismo ancho total
(732.656 px a 200 px de símbolo), mismas posiciones por letra y misma línea base; superpuestos, solo
queda el borde del antialiasing.

**Símbolo: vectorización de un raster (limitación).** El símbolo solo existe como PNG. Se vectorizó
midiendo la imagen: radio 22 %, "L" en `x 35.0–67.0 %`, `y 25.3–75.0 %`, asta de 9.4 %, pie de 8.2 %,
tinta `#152627` y cinco paradas de degradado muestreadas sobre la diagonal. Es fiel en geometría;
el degradado es una aproximación lineal de un render con textura suave.

**Referencia confirmada (13/11/2026).** El lockup del sitio es el logo vigente: es `tone: "site"`,
el valor por defecto. Existe además un `Logo-LoopSmith-Renderizado.png` (29/10/2026, 2048 px) con
la misma "L", un degradado más saturado (`#e6ff00 → #00a781`) y sin aro; quedó como variante
opcional `tone: "render"`. Si algún día aparece un archivo vectorial del símbolo (SVG/AI), alcanza
con reemplazar `core/logo-data.js`: ninguna animación guarda geometría propia.

## 2. Arquitectura

```
animaciones/tipografia-loopsmith/
  index.html · style.css · playground.js   Galería (prefijo .tp-, no viaja con las animaciones)
  core/
    logo-data.js   Geometría generada: letras (contornos + posición en em) y símbolo
    logo.js        Master Logo: LoopSmithType.createLogo()
    logo.css       Estilos del logo (.lsl)
    kit.js         Registro, ciclo de vida, física, puntero, arrastre, poses, escenas de scroll
    kit.css        Escenario (.lst) y piezas auxiliares de cada animación (.lst-*)
  effects/NN-id.js Una animación por archivo
  tools/build-logo-data.py   Regenera logo-data.js desde la fuente
```

Único global: `window.LoopSmithType`. Cada logo usa ids SVG únicos, así que puede haber varios por página.

### Master Logo

```js
const logo = LoopSmithType.createLogo(contenedor, { variant: "lockup", tone: "site" });
logo.parts     // [símbolo, L, o, o, p, S, m, i, t, h]: un <span> con su SVG por pieza
logo.letters   // solo letras          logo.symbol // el símbolo (o null)
logo.setSize(96)        // px del lado del símbolo; escala sin pérdida
logo.restore()          // vuelve al logo oficial al instante
logo.restore(.8)        // lo mismo, animado
logo.destroy()
```

- `variant`: `"lockup"` (símbolo + nombre), `"wordmark"`, `"symbol"`.
- Colores: `--lsl-ink` ("Loop") y `--lsl-accent` ("Smith") en cualquier ancestro.
- Cada pieza admite x/y, rotación, escala, opacidad, `transform-origin`, 3D y eventos de puntero.
  Las animaciones solo tocan `transform`, `opacity`, `clip-path`, `mask` o `filter`: la geometría no cambia nunca.

### Animaciones

```js
const anim = LoopSmithType.mount("magnetic-letters", contenedor, { radius: 2 });
anim.play();  anim.pause();  anim.reset();  anim.destroy();
```

- El contenedor define el tamaño (la animación ocupa su 100 %).
- `destroy()` quita listeners, tickers, tweens, ScrollTriggers y el DOM que creó.
- Escenas de scroll: `scroller` es la ventana por defecto; con `{ scroller: elemento }` quedan
  encapsuladas en ese contenedor (así las muestra la galería). No usan `pin`: el anclaje es
  `position: sticky` y un solo ScrollTrigger con `scrub` entrega el progreso.
- `prefers-reduced-motion` o ausencia de GSAP: se muestra el logo completo y quieto.

## 3. Integración (HTML + CSS + JS)

```html
<link rel="stylesheet" href="core/logo.css">
<link rel="stylesheet" href="core/kit.css">

<section id="marca" style="height: 70vh; --lst-accent: #a3e635"></section>

<script src="gsap.min.js"></script>
<script src="core/logo-data.js"></script>
<script src="core/logo.js"></script>
<script src="core/kit.js"></script>
<script src="effects/02-magnetic-letters.js"></script>
<script>
  const anim = LoopSmithType.mount("magnetic-letters", document.querySelector("#marca"));
</script>
```

Escena de scroll en una página real (scroller = ventana; el contenedor crece solo):

```html
<div id="intro"></div>
<script src="gsap.min.js"></script>
<script src="ScrollTrigger.min.js"></script>
<!-- core/* como arriba -->
<script src="effects/16-pinned-cinematic.js"></script>
<script>
  LoopSmithType.mount("pinned-cinematic", document.querySelector("#intro"), { length: 6, scrub: .7 });
</script>
```

Cada detalle de la galería muestra este bloque ya armado con los parámetros elegidos.

**Dependencias:** GSAP 3.12.5 y ScrollTrigger (ya en `assets/vendor/`). Nada más. No se usa
Draggable: el arrastre es propio (Pointer Events) porque comparte estado con la física.
Para regenerar el logo: `pip install fonttools brotli uharfbuzz`.

**Ejecutar:** `python -m http.server 5510` en la raíz y abrir
`http://localhost:5510/animaciones/tipografia-loopsmith/`.

## 4. Las 30 animaciones

| # | id | Qué hace | Interacción |
| --- | --- | --- | --- |
| 01 | `letter-playground` | Arrastre con peso, inercia, inclinación por velocidad y vuelta sola | drag |
| 02 | `magnetic-letters` | Atracción o repulsión con contagio entre vecinas | hover |
| 03 | `elastic-typography` | Cadena de resortes: tirar de una mueve a las demás | drag |
| 04 | `gravity-drop` | Caída con rebote, giro y fricción; después se rearma | clic |
| 05 | `cursor-ripple` | Onda que se propaga por la palabra desde el cursor | hover, clic |
| 06 | `letter-swap` | Reordenar letras arrastrando (FLIP); Reset recompone | drag |
| 07 | `hover-personality` | Un gesto distinto por carácter, una sola dirección de arte | hover |
| 08 | `mouse-constellation` | Las letras flotan unidas por un trazo; el cursor las empuja | hover |
| 09 | `scroll-assembly` | El scroll arma el logo desde la dispersión | scroll |
| 10 | `scroll-explosion` | El logo se abre en profundidad y deja pasar contenido | scroll |
| 11 | `scroll-tunnel` | Travesía en CSS 3D a través de las letras | scroll |
| 12 | `sticky-transformation` | Expansión, grilla editorial, letra protagonista, reensamble | scroll |
| 13 | `horizontal-journey` | Cada carácter se presenta y viaja a la palabra | scroll |
| 14 | `scroll-wave` | Onda continua atada al scroll | scroll |
| 15 | `section-transition` | El logo cruza de una sección al encabezado de la siguiente | scroll |
| 16 | `pinned-cinematic` | Secuencia de seis fases fijada en pantalla | scroll |
| 17 | `precision-reveal` | Guías tipográficas y máscaras por letra | replay |
| 18 | `letter-cascade` | Caída coreografiada con peso por letra | replay |
| 19 | `deconstructed-identity` | Fragmentos de las propias letras que encajan | replay |
| 20 | `masked-typography` | Persianas, apertura diagonal, franjas y ventana móvil | replay |
| 21 | `liquid-letters` | Las letras se funden en una gota y se separan | replay |
| 22 | `echo-typography` | Entrada en arco con ecos que se apagan | replay |
| 23 | `physics-lab` | Cuerpos con gravedad configurable, choques y empuje | drag, clic |
| 24 | `infinite-loop` | Ciclo perfecto: cada letra hace un lazo y vuelve | loop |
| 25 | `kinetic-grid` | Grilla que reacciona, se baraja y vuelve a ser logo | hover, clic |
| 26 | `velocity-distortion` | Estiramiento según la velocidad del puntero o la rueda | hover, rueda |
| 27 | `perspective-cards` | Tarjetas 3D con tilt y paralaje por letra | hover, clic |
| 28 | `scramble-identity` | Glifos reales del logo que se traban en el nombre | replay |
| 29 | `letter-sequencer` | Caja de ritmos: 4 movimientos × 8 pasos | clic |
| 30 | `ultimate-experience` | Narrativa de scroll con física del cursor superpuesta | scroll, hover, clic |

Los parámetros de cada una (con sus rangos) están en el campo `fields` de su archivo y en el panel de la galería.

## 5. Best of

Elegidas por lo que aportan a una web comercial, no por complejidad:

1. **16 · Pinned Cinematic Sequence**: el hero de una home; presenta la marca y suelta el scroll.
2. **15 · Section Transition Wordmark**: el logo pasa a ser la transición y termina como firma del encabezado.
3. **09 · Scroll Assembly**: la intro más directa; el visitante arma el logo con su scroll.
4. **02 · Magnetic Letters**: vida ambiente para un hero o un footer, sin riesgo para la marca.
5. **17 · Precision Reveal**: entrada sobria para un loader o una apertura.

## 6. Pruebas realizadas (13/11/2026)

Con Playwright (Chromium, ~57 fps) sobre el servidor local:

| Prueba | Resultado |
| --- | --- |
| Wordmark contra el texto vivo con el CSS del sitio | Ancho total idéntico (732.656 px), posiciones y línea base coinciden |
| Las 30: montar → `play()` → `pause()` + `reset()` | 30/30 sin excepciones; todas vuelven al logo con transform identidad y opacidad 1 (09 y 13 vuelven a su estado inicial, que es disperso por diseño) |
| `destroy()` | 30/30 sin nodos residuales; `ScrollTrigger.getAll()` pasa de 9 a 0 |
| Scroll reversible (9 escenas): 0 → 50 % → 100 % → 50 % → 0 | Diferencia de posición 0 px entre la ida y la vuelta en las 9 |
| Estado final de las escenas | 11, 12, 14, 16 y 30 terminan en el logo exacto; 09 y 13 terminan en el logo; 10 y 15 terminan fuera o en el encabezado, por diseño |
| Arrastre real con mouse (01) | La letra sigue al puntero (167, −146 px de 168, −144) y vuelve a < 1 px a los 3.5 s |
| Intercambio real con mouse (06) | `LoopSmith` → `oopLSmith` → Reset → `LoopSmith` |
| Cambio de parámetro en el detalle | Remonta dejando un solo escenario; el código copiable refleja el valor |
| Página completa (`&full=1`, scroller = ventana) | La secuencia 16 corre y libera el scroll hacia la sección siguiente |
| `prefers-reduced-motion: reduce` | Logo estático completo, sin tramo de scroll |
| Galería en 1920, 1440, 768, 390 y 360 px | Sin desborde horizontal; sin errores de consola |
| Revisión visual | Hojas de contacto de las 30 (dos instantes para las de tiempo, cinco puntos del recorrido para las de scroll) |

## 7. Limitaciones y pendientes

- **Símbolo**: es una vectorización de un PNG (ver sección 1); el degradado es una aproximación
  lineal. Con un original vectorial se reemplaza `core/logo-data.js`.
- **Táctil**: el arrastre y los toques usan Pointer Events con `touch-action: none`, el mismo camino
  de código que el mouse. No se probó en un teléfono físico.
- **Solo Chromium**: no se probó en Safari ni Firefox. Puntos a mirar: `mask-image` (20), el filtro SVG
  (21) y `transform-style: preserve-3d` (11, 27).
- **21 · Liquid-Like Letters** no hace morphing de trazos: los contornos no comparten topología.
  Usa un filtro de fusión que se quita al terminar.
- **Previews de la galería**: se montan solo las tarjetas visibles; en pantallas muy grandes pueden
  coincidir unas nueve animaciones a la vez.
- **Rendimiento**: sin medición formal de fps por animación; las físicas se duermen en reposo y las
  escenas de scroll solo calculan cuando cambia el progreso.
- La variante del footer del sitio (`LoopSmith` sin espacio) no está incluida.
