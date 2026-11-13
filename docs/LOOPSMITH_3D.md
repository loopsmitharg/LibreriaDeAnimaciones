# Loop Smith — 3D Motion Lab

El logo de Loop Smith como objetos 3D reales: **Blender → GLB → Three.js → GSAP**. Colección independiente en
`animaciones/loopsmith-3d/`; no modifica `animaciones/tipografia-loopsmith/` (las 30 animaciones SVG siguen intactas).

- Galería: `animaciones/loopsmith-3d/index.html` · una escena: `?demo=<id>` · scroll a página completa: `&full=1`
- Ejecutar: `python -m http.server 5510` en la raíz del repo y abrir `http://localhost:5510/animaciones/loopsmith-3d/`
- Forzar calidad (pruebas): `?quality=high` | `?quality=low`

## 1. Archivos

| Qué | Dónde |
| --- | --- |
| `.blend` editable (fuente principal, 24 materiales de 6 presets) | `animaciones/loopsmith-3d/blender/loopsmith-3d.blend` |
| GLB para la web (Draco, 109 KB) | `animaciones/loopsmith-3d/assets/models/loopsmith-logo.glb` |
| GLB sin comprimir (576 KB) | `animaciones/loopsmith-3d/assets/models/loopsmith-logo.raw.glb` |
| Piezas de apoyo (anillo, losa, guijarro) | `assets/models/loopsmith-props.glb` + `blender/loopsmith-props.blend` |
| Metadata por pieza (ejes glTF) | `assets/models/loopsmith-logo.meta.json` |
| Materiales de los presets | `assets/models/loopsmith-presets.json` |
| Textura del degradado del símbolo (512², 6.5 KB) | `assets/textures/symbol_gradient.png` |
| Vistas de verificación (Blender y Three.js) | `assets/previews/` |
| Three.js r170 · cannon-es 0.20 | `assets/vendor/three/` · `assets/vendor/cannon-es/` |

## 2. Pipeline de Blender

Blender 5.3.0 (`D:\SteamLibrary\steamapps\common\Blender\blender.exe`). Los scripts corren en modo background:

```bash
# 1) contornos 2D limpios (necesita: pip install shapely pillow)
python blender/prepare_logo_polys.py
# 2) modelado + materiales + .blend + GLB
blender --background --factory-startup --python blender/build_logo.py
# 3) piezas de apoyo
blender --background --factory-startup --python blender/build_props.py
# 4) vistas de verificación y comparación de silueta
blender --background blender/loopsmith-3d.blend --python blender/verify_render.py
python blender/compare_silhouette.py
```

- **Geometría**: los contornos salen de `animaciones/tipografia-loopsmith/core/logo-data.js` (Outfit 700 con el kerning del lockup del
  sitio). `prepare_logo_polys.py` los aplana, une los trazos superpuestos con regla no-cero (la fuente trae contornos solapados, p. ej. la «L»)
  y resta las contraformas. El símbolo es el cuadrado redondeado (radio 22 %) con la «L» en relieve, medido del PNG del sitio.
- **Modelado** (`build_logo.py`): relleno de curvas de Blender → malla plana en el plano XZ → *Solidify* (letras 0.11 u, cuerpo del símbolo
  0.16 u, «L» 0.034 u) → *Bevel* de 3 segmentos (0.0125 u en letras) → sombreado suave salvo aristas vivas → origen en el centro de la caja.
  Unidad: 1 = lado del símbolo. El script **verifica** cada malla: sin aristas no-manifold, sin vértices sueltos, volumen positivo
  (normales hacia afuera) y falla si alguna no cumple.
- **Jerarquía del GLB**: `LoopSmith3D › Symbol (Symbol_Body, Symbol_L) · Wordmark (Letter_00 … Letter_08) · Metadata`. Cada letra es un objeto
  con extras (`ls_id`, `ls_char`, `ls_index`, `ls_word`, `ls_center`, `ls_pivot`, `ls_dimensions`); `loopsmith-logo.meta.json` agrega
  posición original, caja envolvente, dimensiones, materiales y triángulos (en ejes glTF: Blender (x, y, z) → glTF (x, z, −y)).
- **Materiales**: 6 presets × 4 ranuras (Loop, Smith, símbolo, «L») creados en Blender y exportados a `loopsmith-presets.json`: Original 3D,
  Studio Black, Satin Lime, Chrome, Glass, Porcelain. El degradado del símbolo es una **textura** (compatible con glTF); no se confía en nodos
  que el exportador ignora. El GLB trae los materiales del preset Original; Three.js construye los demás desde el JSON con los mismos valores.
- **Optimización**: 25 932 triángulos en total, 11 mallas, 4 materiales y 1 textura en el GLB. Draco con cuantización de posición a 16 bits
  (el ancho del logo, 3.66 u, queda a 0.00006 u por paso: no se pierde la silueta).

| Pieza | Triángulos | | Pieza | Triángulos |
| --- | --- | --- | --- | --- |
| Symbol_Body | 1 852 | | Letter_04 (S) | 4 732 |
| Symbol_L | 300 | | Letter_05 (m) | 3 404 |
| Letter_00 (L) | 300 | | Letter_06 (i) | 1 464 |
| Letter_01 (o) | 3 840 | | Letter_07 (t) | 652 |
| Letter_02 (o) | 3 840 | | Letter_08 (h) | 1 868 |
| Letter_03 (p) | 3 680 | | **Total** | **25 932** |

## 3. Arquitectura web

```
animaciones/loopsmith-3d/
  index.html · style.css · gallery.js    Galería (prefijo .lab-; no viaja con los experimentos)
  harness.html                           Herramienta de desarrollo: un experimento a pantalla completa (?id=…&preset=…)
  core/  assets.js  logo.js  engine.js  kit.js  physics.js  experience.js  gsap.js  scene.css
  effects/  01-grab-throw.js … 24-ultimate-brand-experience.js  index.js
  blender/  scripts, .blend, logo_polys.json
```

- **`core/assets.js`**: carga el GLB (GLTFLoader + DRACOLoader local) **una sola vez** por página y lo comparte: las geometrías y la textura
  pertenecen al asset; los materiales, a cada instancia.
- **`core/logo.js` (`Logo`)**: clona la escena, expone `pieces / letters / symbol`, guarda `userData.home` (posición, rotación, escala originales),
  `pick(raycaster)` (raycast contra la malla real → pieza lógica), `setPreset(nombre, { duration, stagger })`, `restore(s)`, `snapHome()`,
  `homeError()` y `destroy()`.
- **`core/engine.js` (`Stage`)**: renderer, escena, cámara, luces (key + rim + fill + entorno de estudio procedural con softboxes, PMREM),
  puntero NDC con velocidad, raycaster, `ResizeObserver`, `IntersectionObserver` (no renderiza fuera de pantalla), bucle sobre `gsap.ticker`,
  sombras opcionales (`ShadowMaterial`: el fondo es CSS) y `destroy()`. Calidad adaptable: pixel ratio, sombras y antialias según dispositivo.
- **`core/kit.js`**: `Track` (poses por scroll: lerp de posición, slerp de cuaterniones, escala, retardo escalonado), `CamPath` (Catmull-Rom con
  keyframes de posición y objetivo), `enableDrag` (arrastre por raycast en un plano perpendicular a la cámara, sin saltos, con inercia y
  profundidad con la rueda), `Body` (resortes lineal y angular, semi-implícito), utilidades.
- **`core/physics.js`**: cannon-es con paso fijo 1/120 s; colisionadores aproximados por carácter (cajas compuestas, cilindros para las «o»).
- **`core/experience.js`**: `mountExperience(def, contenedor, { preview, scroller, params, preset })` → `{ play, pause, reset, setProgress,
  logo, stage, destroy }`. Arma el tramo alto + escenario `position: sticky` (sin `pin`) y un ScrollTrigger con `scrub` para las escenas de scroll.
- **WebGL en la galería**: **un** renderer compartido para todas las tarjetas (se renderiza en un viewport y se copia a un canvas 2D por
  tarjeta; solo las tarjetas visibles, a 30 fps) y un renderer propio para la escena activa, que se destruye al desmontar.

### Usarlo en otra página

```html
<script src="gsap.min.js"></script><script src="ScrollTrigger.min.js"></script>
<script type="importmap">{ "imports": { "three": "vendor/three/build/three.module.js", "three/addons/": "vendor/three/jsm/", "cannon-es": "vendor/cannon-es/cannon-es.js" } }</script>
<link rel="stylesheet" href="core/scene.css">
<div id="marca" style="height: 70vh"></div>
<script type="module">
  import { mountExperience } from "./core/experience.js";
  import def from "./effects/03-magnetic-3d.js";
  const exp = await mountExperience(def, document.querySelector("#marca"), { preset: "chrome" });
  exp.play();   // pause() · reset() · destroy() · exp.logo.setPreset("lime", { duration: .8 })
</script>
```

Las escenas de scroll aceptan `{ scroller: window }` o un elemento con `overflow`. Con `prefers-reduced-motion` se muestra el logo 3D quieto.
La galería genera este bloque con los parámetros elegidos en cada experimento.

## 4. Los 24 experimentos

| # | id | Qué hace |
| --- | --- | --- |
| 01 | `grab-throw` | Raycast + arrastre en 3 ejes (rueda = profundidad), peso, inclinación por velocidad, lanzamiento con inercia, vuelta con resortes |
| 02 | `zero-gravity` | Deriva sin peso en X/Y/Z; el cursor empuja (distancia al rayo en 3D); clic reúne o suelta |
| 03 | `magnetic-3d` | Imán 3D delante del logo: atracción, avance hacia la cámara e inclinación hacia el cursor |
| 04 | `physical-collapse` | cannon-es: caída, rebotes, choques, rodado de las «o», acumulación, sombras; después se reconstruye |
| 05 | `elastic-connections` | Cadena de resortes en 3D entre vecinas; arrastrar una mueve a las demás con retardo |
| 06 | `object-inspection` | Elegir una letra: viaja a la cámara, rota despacio, se gira con el mouse; cerrar la devuelve |
| 07 | `scroll-assembly` | Dispersión 3D → logo exacto; reversible; cámara con curva |
| 08 | `camera-fly-through` | Las letras forman un pasillo en Z y la cámara lo atraviesa, mira hacia atrás y vuelve |
| 09 | `exploded-logo` | Explosión en 3D con órbita de cámara |
| 10 | `floating-letter-journey` | Constelación de esculturas y un keyframe de cámara por pieza |
| 11 | `cinematic-reassembly` | Símbolo → órbita → letras a distintas profundidades → encastre → lockup |
| 12 | `scroll-orbit` | Órbitas inclinadas con radios distintos que terminan en el logo |
| 13 | `spatial-section-transition` | Las letras cruzan la cámara y reaparecen como el encabezado de la sección siguiente (tinta clara → oscura) |
| 14 | `cinematic-journey` | **Central**: 6 capítulos, anillos, taller de letras, cámara por curva, cromo → identidad |
| 15 | `letter-dominoes` | Fichas de canto sobre el piso, empujes escalonados, caídas y choques reales |
| 16 | `mechanical-assembly` | Cada pieza llega por un eje distinto con rotación a saltos de 90° y encastre con golpe |
| 17 | `suspended-sculpture` | Movimiento orgánico por pieza (senoides de media cero) y respuesta sutil al cursor |
| 18 | `letter-carousel` | Carrusel en un eje vertical con arrastre e inercia; al frenar se reorganiza como logo |
| 19 | `kinetic-machine` | Siete compases de volteos, deslizamientos y encastres; ciclo continuo que cierra en el logo |
| 20 | `spiral-formation` | Espiral 3D que gira con la cámara y luego converge al logo |
| 21 | `chrome-studio` | Cromo con entorno de estudio que rota con la cámara; arrastre para orbitar |
| 22 | `material-transformation` | Los 6 materiales, pieza por pieza, con giro de 360° |
| 23 | `light-shadow-playground` | SpotLight arrastrable con sombras reales sobre piso y pared |
| 24 | `ultimate-brand-experience` | Scroll de 8 etapas + física del cursor + cromo → identidad |

**Best of** (por utilidad comercial, no por complejidad): 14 Cinematic Journey (hero de home), 07 Scroll Assembly (intro), 13 Spatial Section
Transition (transición entre secciones), 03 Magnetic 3D (ambiente en hero/footer), 22 Material Transformation (mostrar las versiones de marca).

## 5. Pruebas realizadas (Chromium con Playwright, 13/11/2026)

| Prueba | Resultado |
| --- | --- |
| Pipeline de prueba (`pipeline-test.html`): «L» extruida en Blender → GLB → Three.js | Caja envolvente 0.62 × 1 × 0.18; al rotar 90° sobre X, Y y Z las dimensiones se permutan: volumen real |
| Mallas del `.blend` | 11/11 cerradas, sin aristas no-manifold ni vértices sueltos, volumen positivo |
| Silueta frontal Blender (ortográfica) vs contornos de origen | IoU = **0.9915** (diferencia de área 0.42 %; el bisel redondea las esquinas vivas) |
| Vistas | Frontal, lateral, tres cuartos y posterior en Blender (`blender-*.png`) y en Three.js (`three-*.png`); la posterior muestra las letras espejadas: son sólidos |
| GLB en Three.js | 10 piezas con nombre, índice y transformación original; se seleccionan por raycast y se mueven por separado |
| Presets | Los 6 renderizados en Blender (EEVEE) y en Three.js; el cambio de material se anima sin cambiar de geometría |
| 24 experimentos: montar → `play()` → `pause()` + `reset()` | 24/24 sin errores de consola. Los de física/interacción vuelven a `homeError() = 0` tras el reset (el símbolo, más pesado, tarda ~3.5 s) |
| Escenas de scroll (9) | Ida y vuelta 0 → 60 % → 75 % → 60 %: diferencia de posición **0** en piezas y cámara en las 9; el material de 14 y 24 también es reversible |
| Arrastre | Mouse real sobre la «S»: sigue al puntero en X, Y y Z (rueda) y vuelve exacta tras soltarla |
| Touch | **Simulado** con PointerEvents `pointerType: "touch"` (la pieza se mueve igual); `touch-action: none` en los experimentos de arrastre |
| Limpieza | 48 montajes y destrucciones seguidos (2 × 24): 0 canvas, 0 ScrollTriggers, mismos listeners del ticker y mismos nodos DOM |
| Galería | 6 previews vivos con un solo renderer compartido (más el del hero); cambiar un parámetro remonta sin dejar canvas de más |
| Scroll en el cuadro y página completa | La rueda desplaza el cuadro, no la página; `&full=1` corre con `scroller: window` y libera el scroll |
| Responsive | 1920, 768, 390 y 360 px sin desborde horizontal |
| `prefers-reduced-motion` | Logo 3D estático, sin errores |
| Carga | Con caché desactivada: GLB 109 KB, JSON 13 KB, decodificador Draco 192 KB (wasm) |
| Sombras | Verificadas con `?quality=high` (en este entorno la detección automática elige calidad baja y las apaga) |

## 6. Limitaciones y pendientes

- **Blender MCP**: estaba conectado al empezar (Blender 5.3, protocolo 16), pero una llamada mía (`read_factory_settings`) descargó el addon de la
  sesión viva y el servidor MCP dejó de responder; reemplazó además la escena sin guardar que tenía abierta (la de fábrica). Todo el modelado se
  hizo con Blender en modo background. Para reconectar: Preferences › Add-ons › desactivar/activar «Interface: Blender MCP» y *Start MCP Server*.
- **No se probó en dispositivos reales ni en Safari/Firefox**; solo Chromium con WebGL por software (SwiftShader), así que no hay mediciones de fps.
  Hay calidad adaptable (pixel ratio, sombras, antialias, niebla) pero solo se verificó forzándola por URL.
- **Colisionadores aproximados** (cajas compuestas y cilindros), no la silueta exacta. En 15 las fichas reciben empujes escalonados: probado en
  cannon-es, una ficha apoyada contra otra no la vuelca sola por su forma achatada, así que la cadena no se propaga por contacto.
- **Entorno procedural** (softboxes) en lugar de un HDRI; sin postprocesado. El vidrio usa transmisión de Three.js (más costosa en GPU).
- **Símbolo**: «L» en relieve sobre una placa con la textura del degradado medido del PNG del sitio; sin el aro oscuro del borde del PNG.
- No se abrió igloo.inc en esta sesión: la dirección visual de 14 y 24 es propia (capítulos, anillos, taller, cromo → identidad).
- No hay un GLB por pieza: el GLB principal ya expone cada letra como objeto independiente.
- Los experimentos 01, 03, 07, 08, 11 y 14 recibieron más iteración visual; el resto está verificado funcionalmente y por capturas, con menos pulido.
