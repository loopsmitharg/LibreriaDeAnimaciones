# Librería de Animaciones

Repositorio interno con la **base** de las animaciones dinámicas y piezas reutilizables que usamos en nuestros proyectos (Loop Smith, CosmeCV, María Paula Confitería y GameOver), aisladas en demos que funcionan solas.

Abrí `index.html`: cada botón lleva a una demo y cada demo termina con una ficha técnica (cómo funciona, de dónde sale y qué tocar para reutilizarla).

## Estructura

```
index.html                       Índice con filtros por tipo
assets/
  css/fonts.css                  @font-face locales (Outfit, Space Grotesk, IBM Plex Mono, Material Icons Round completo)
  css/shell.css                  Chrome de la librería (.lib-back, .lib-notes). Nada más se comparte.
  fonts/                         Fuentes .woff2
  vendor/                        GSAP 3.12.5 + ScrollTrigger (locales, sin CDN)
animaciones/<nombre>/
  index.html                     Demo + ficha técnica
  style.css                      Estilos de la animación (con sus propios tokens en :root)
  script.js                      Lógica (comentada, en castellano)
```

Cada carpeta de `animaciones/` es autocontenida: para usar una animación en otro proyecto se copian su `style.css`, su `script.js` y el markup de la demo, más GSAP si lo usa.

## Catálogo

| Demo | Tipo | Origen |
| --- | --- | --- |
| `scroll-logo-al-navbar` | Scroll de intro: el logo viaja al navbar, impacta y rebota | Loop Smith · Inicio (primer scroll) |
| `scroll-manual-rueda` | Rueda de 3 pasos con riel arrastrable | Loop Smith · Inicio (scroll manual) |
| `acordeon-horizontal` | Tarjetas en acordeón horizontal con FLIP | Loop Smith · Inicio (tarjetas de servicios) |
| `scroll-por-etapas-flujo` | Tablero de flujo que avanza por etapas | Loop Smith · Inicio (animación flujo) |
| `carrusel-nombres` | Rieles de nombres en contrafase que se sincronizan | Loop Smith · Nuestro equipo |
| `titulos-sticky` | Títulos sticky en grilla de dos columnas (CSS puro) | Loop Smith · Servicios |
| `chat-autoescrito` | Chat que se escribe solo, con pestañas | Loop Smith · Servicios (chatbots) |
| `tablero-barras` | Tablero con barras que crecen al cambiar de pestaña | Loop Smith · Servicios (tableros de datos) |
| `scroll-experiencia` | Lista con foco por scroll + medidor + detalle por hover | CosmeCV · Experiencia |
| `cursor-invertido` | Cursor con `mix-blend-mode` que invierte colores | CosmeCV · Global |
| `lente-cuadrado-cursor` | Lente cuadrado que sigue al cursor: color + distorsión + RGB adentro, grises con onda y ruido afuera (WebGL puro) | Inspirado en Codrops · Square Lens Effect (reconstrucción propia) |
| `atelier-webgl-dom` | Dos páginas: portada con texto/imágenes WebGL sincronizados al scroll (flowmap, liquid/pixel/lens, letras que ruedan, footer parallax) y galería esférica arrastrable; transición de píxeles entre ambas | Inspirado en Codrops · Atelier UI: Mixing WebGL and the DOM (reconstrucción propia, sin React ni Three.js) |
| `portfolio-liquido` | Portfolio completo con diez animaciones: loader, intercambio de letras, carita SVG líquida, cursores, menú, tarjetas, insignia magnética, tema por scroll, ondas en canvas y puerta con rayos | Inspirado en eszterbial.com (reconstrucción propia, sin su código ni su arte) |
| `galeria-mundo` | Galería infinita arrastrable: intro con esfera de alambre, fotos a distintas profundidades con niebla, cámara con inercia e inclinación, detalle con FLIP | Inspirado en unseen.co/world (reconstrucción propia en CSS 3D; el original es Three.js) |
| `scroll-horizontal` | Sección anclada con scroll lateral de paneles | CosmeCV · Proyectos |
| `scroll-mascara-svg` | Escenas ancladas que se revelan con máscaras SVG (persianas H/V, grilla aleatoria, grilla por columnas) | Inspirado en Codrops · On-Scroll SVG Mask Transitions (reconstrucción propia) |
| `grilla-sticky-scroll` | Escena sticky: grilla de 12 imágenes que entra por columnas, hace zoom y se abre para revelar el contenido | Inspirado en Codrops · Sticky Grid Scroll (reconstrucción propia) |
| `aida-relieve-scroll` | Escena sticky en canvas: el logo en líneas de relieve se une, fila por fila, con el relieve de Argentina, Malvinas y la Antártida | AIDA · aida-argentina.html |
| `scroll-agencia` | Scroll de home de agencia: palabras con máscara, portada con clip-path + parallax, párrafo por líneas, acordeón de servicios por scroll y proyectos desfasados | Inspirado en cuberto.com (reconstrucción propia, sin su código ni su arte) |
| `menu-carta-pedidos` | Carta con filtros de dos niveles, modal de opciones y panel de pedido | María Paula Confitería · Menú |
| `carrusel-hero-fundido` | Carrusel hero con crossfade y puntos | GameOver · Inicio |
| `navegador-productos-3d` | Menú de productos a pantalla completa: títulos gigantes + tarjetas en CSS 3D, un producto por gesto | Inspirado en zentry.com (reconstrucción propia, sin su código ni su arte) |
| `conector-apps-script` | Lectura de cupos (GET + polling) e inscripción (POST) contra Google Apps Script, con servidor simulado y plantilla `Code.gs` | GameOver · Torneos |
| [`lusion`](animaciones/lusion/index.html) | Once demos con controles, reinicio y código para copiar. Incluye partículas SVG y objetos con caras CSS 3D | Estudio de movimiento · Inspirado en Lusion |

| [`tipografia-loopsmith`](animaciones/tipografia-loopsmith/index.html) | Typography Playground: 30 animaciones sobre las letras reales del logo (interacción con física, scroll storytelling, reveals y experimentos), con galería, controles y código para copiar | Loop Smith · Logo |

| [`loopsmith-3d`](animaciones/loopsmith-3d/index.html) | 3D Motion Lab: 24 experimentos con el logo como objetos 3D reales (Blender → GLB → Three.js + GSAP), con galería, materiales, controles y código | Loop Smith · Logo 3D |

La colección `lusion` comparte un showcase. Cada efecto de `animaciones/lusion/effects/` tiene su propio CSS, JavaScript y ejemplo copiable. El [registro de investigación y uso](docs/LUSION_ANIMATION_RESEARCH.md) detalla los módulos y cómo integrarlos.

La colección `tipografia-loopsmith` tiene su propio núcleo (`core/`: logo por piezas + kit de física y scroll) y una animación por archivo en `effects/`. La [guía de uso](docs/TYPOGRAPHY_PLAYGROUND.md) explica la reconstrucción del logo, la API, los ejemplos de integración, las pruebas hechas y los pendientes.

`loopsmith-3d` tiene su propio pipeline (`blender/`: scripts, `.blend` y GLB), motor Three.js (`core/`) y un experimento por archivo (`effects/`). Three.js y cannon-es viven en `assets/vendor/`. La [guía](docs/LOOPSMITH_3D.md) documenta el modelado, la exportación, la API, las pruebas y los pendientes.

> `conector-apps-script` arranca en **modo simulado** (`API_URL` vacío en su `script.js`): no envía datos a ninguna planilla. Para conectarlo a una real, pegá la URL `/exec` de tu implementación.

## Ver las demos

Las demos funcionan abriendo los HTML directo, pero conviene un servidor local (las fuentes y algunos navegadores se portan mejor):

```bash
python -m http.server 5510
```

y abrir `http://localhost:5510/`.

## Agregar una animación nueva

1. Crear `animaciones/<nombre-descriptivo>/` con `index.html`, `style.css` y `script.js`.
2. En el `<head>`: `../../assets/css/fonts.css`, `../../assets/css/shell.css`, su `style.css` y, si hace falta, `../../assets/vendor/gsap.min.js` / `ScrollTrigger.min.js` con `defer`.
3. Terminar la página con una `<section class="lib-notes">` (ficha técnica) y el `<a class="lib-back">` para volver.
4. Sumar el botón en el grupo que corresponda de `index.html` y actualizar el contador.

## Reglas que traen las animaciones

- Animar solo `transform` y `opacity` (las barras y trazos SVG son la excepción documentada).
- Escenas ancladas con `gsap.matchMedia()`: rama `(min-width: 901px)` anclada y `(max-width: 900px)` en flujo, cada una con su limpieza.
- `prefers-reduced-motion` y "sin GSAP" siempre dejan el contenido completo y legible.
- Opacidad mínima `0.002` en vez de `0` para elementos que van a aparecer (Chrome descarta la capa con 0).
- `overflow: hidden` en un ancestro mata `position: sticky`; para recortar en horizontal, `overflow-x: clip`.
