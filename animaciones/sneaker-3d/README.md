# Sneaker 3D — Product Motion Experience

Una zapatilla de running original (LS·01 Runner) modelada pieza por pieza en Blender y llevada a la web en **exactamente dos experiencias**:

1. **Exploded Sneaker** — el scroll desarma la zapatilla en sus 28 piezas y la vuelve a armar. Reversible y determinista.
2. **Running Pair** — izquierda + derecha en un ciclo de carrera continuo, con flexión del antepié y compresión de la espuma.

Stack: Blender 5.3 (`bpy` + numpy) → glTF/GLB (Draco + WebP) → Three.js r170 + GSAP + ScrollTrigger. Sin framework, sin build.

## Ejecutar

```bash
python -m http.server 5511 --directory D:/Git/LibreriaDeAnimaciones
```

Abrir `http://localhost:5511/animaciones/sneaker-3d/index.html`. `?quality=low|high` fuerza el nivel (por defecto: `low` en táctil, pantallas chicas o ≤ 4 núcleos).
`embed.html?exp=exploded|running` muestra cada experiencia sola en un contenedor.

## Estructura

```
blender/sneaker-master.blend     maestro editable: Sneaker_R y Sneaker_L (modificadores vivos), colecciones por grupo, estudio
blender/scripts/shoe.py          generador paramétrico de la zapatilla (SIDE = R | L, QL = resolución)
blender/scripts/materials.py     texturas PBR tileables + materiales glTF
blender/scripts/export.py        aplica modificadores, hornea AO, arma el rig y exporta los 4 GLB; regenera el maestro
blender/scripts/render.py        estudio EEVEE + 8 vistas + 6 macros con luz rasante
models/                          sneaker-exploded(.glb | -lite.glb), sneaker-running-pair(.glb | -lite.glb)
textures/source  textures/mobile mapas PBR originales en PNG (1024/512 y 512/256); en los GLB van embebidos en WebP
src/                             stage · lighting · loader · materials · scroll · exploded · running · index
styles/sneaker.css               lo único que necesitan las experiencias (prefijo sn-); page.css es solo de esta página
previews/blender  previews/verify  renders de Blender y capturas de Playwright
tests/smoke.js                   prueba de humo (Playwright)
```

## El modelo

Toda la capellada vive sobre **una superficie paramétrica** `S(u, v)` (la horma): `u` recorre el contorno de talón a punta, `v` va del borde lateral al lomo y baja al medial. Cada panel es un parche entre dos curvas de diseño, desplazado por la normal y con espesor real (Solidify + Bevel + Weighted Normal). Por eso refuerzos, ojales, cordones y costuras siguen exactamente la misma forma y apilan sin huecos: base 0–1,2 mm · mesh 1,2–2,5 · refuerzos 2,5–3,7 · contrafuerte 2,6–4,4.

28 piezas de primer nivel (41 objetos con las costuras, que son hijas de su panel y se mueven con él):

| Grupo | Piezas |
| --- | --- |
| Suela | `Outsole_Forefoot`, `Outsole_Heel` (placa + tacos con surcos reales), `Shank`, `Foam_Cushioning_Layer` (cuña de perlas), `Midsole` (EVA con borde que abraza la capellada) |
| Interior | `Insole` (anatómica, con copa de talón y arco), `Strobel`, `Lining`, `Heel_Padding` |
| Capellada | `Upper_Base`, `Mesh_Panel_Lat`, `Mesh_Panel_Med`, `Toe_Box`, `Toe_Reinforcement`, `Eyestay`, `Side_Overlay_Lat` (dos tiras), `Side_Overlay_Med` (panel de arco) |
| Talón | `Heel_Panel`, `Heel_Counter`, `Collar`, `Heel_Pull_Tab`, `Branding_Panel` |
| Lengüeta | `Tongue`, `Tongue_Padding`, `Tongue_Label` |
| Cordones | `Laces` (planos, cruzados, uno pasa sobre el otro), `Lace_Bow` + `Aglets`, `Eyelets_Lat`, `Eyelets_Med` |
| Costuras | 11 objetos `Stitch_*`: ~700 puntadas, cada una una cápsula que entra y sale del panel |

311.000 triángulos en el hero (`QL = 1`). La **izquierda** se genera con el mismo script (`SIDE = "L"`): espeja vértices e invierte el orden de las caras, así que las normales, la jerarquía y los pivotes quedan correctos sin escalas negativas. El símbolo de marca (dos eslabones entrelazados) es original.

### Materiales

16 juegos de mapas (base color + normal + ORM) generados desde un **mapa de alturas en metros**, periódicos (ruido filtrado por FFT y patrones enteros), aplicados sobre UV físicas (1 unidad = 10 cm), de modo que el tejido tiene la misma escala en todos los paneles. Densidad: 20–70 px/mm.

| Material | Relieve |
| --- | --- |
| mesh | agujeros ovalados alternados + trama de hilo |
| knit / collar | columnas de punto en V |
| foam (EVA) | arrugas de compresión + poro |
| bead (capa de amortiguación) | celdas con domo y junta (Voronoi periódico) |
| rubber | grano + picaduras; los surcos son geometría |
| lace / webbing | trenzado en espiga / cinta acanalada |
| suede, film, tpu, lining, insole, strobel, brand | fibra, microgofrado, sarga, logo en relieve |

Los tejidos, espumas, cordón y marca van a resolución completa; el resto a la mitad y los ORM a la mitad de eso (≈100 MB de GPU por GLB en alta, ≈25 MB en lite).
La **oclusión entre capas** se hornea con Cycles a color de vértice (`COLOR_0`); en la web `uAO` la atenúa durante el despiece para que las piezas sueltas no queden oscurecidas.

### Regenerar

Con `sneaker-master.blend` abierto en Blender (consola de Python o MCP):

```python
exec(open(r"D:\Git\LibreriaDeAnimaciones\animaciones\sneaker-3d\blender\scripts\export.py", encoding="utf8").read(), {"TARGETS": None})
```

Tarda ~2 min: genera, hornea, exporta los cuatro GLB y deja el maestro guardado. `render.py` se corre igual (`{"SHOTS": None}`).

| GLB | Geometría | Texturas | Peso |
| --- | --- | --- | --- |
| `sneaker-exploded.glb` | 41 mallas, 311k tris | 1024 | 6,6 MB |
| `sneaker-exploded-lite.glb` | QL 0,55 | 512 | 2,0 MB |
| `sneaker-running-pair.glb` | 2 mallas con skin, 322k tris | 1024 | 6,9 MB |
| `sneaker-running-pair-lite.glb` | QL 0,45 | 512 | 2,5 MB |

## Usar las experiencias en otra página

La página necesita `gsap` + `ScrollTrigger` como scripts globales (solo el despiece), un importmap para `three` y `three/addons/`, y `styles/sneaker.css`.

```html
<link rel="stylesheet" href="sneaker-3d/styles/sneaker.css">
<script src="gsap.min.js"></script><script src="ScrollTrigger.min.js"></script>
<script type="importmap">{"imports":{"three":"…/three.module.js","three/addons/":"…/jsm/"}}</script>
<script type="module">
  import { mountExploded, mountRunning } from "./sneaker-3d/src/index.js";

  const exp = await mountExploded(document.querySelector("#hero"));            // crea su propio tramo de scroll (7 pantallas)
  // mountExploded(el, { scroll: false })  ->  exp.setProgress(0..1) desde cualquier otro control
  const run = await mountRunning(document.querySelector("#run"), { controls: true });   // el contenedor define el alto
  run.pause(); run.play(); run.replay(); run.setSpeed(1.5); run.reset();
  exp.destroy(); run.destroy();                                                // libera GPU, workers, listeners y DOM
</script>
```

Opciones: `model` (URL de otro GLB), `onLoad(0..1)`; despiece: `screens`, `scrub`, `captions`, `onProgress`; carrera: `controls`, `speed`, `autoplay`.

### Cómo funciona el despiece

Un timeline maestro de GSAP (duración 100, `fromTo` explícitos) mueve dos escalares por pieza: `a` (separación mayor: suela hacia abajo, capellada entera hacia arriba) y `b` (detalle: cada capa a su lugar de exhibición). La pose es función pura de `(a, b)`; con ambos en 0 se copia la transformación original. La tabla `PARTS` de `exploded.js` define offsets, rotación de exhibición, arco, tiempos y easing por pieza (las pesadas tardan más; lo último en salir es lo primero en volver). Etapas: hero 0–10 · estructura 10–30 · detalle 28–52 · pausa 52–62 · reconstrucción 62–90 · cierre 90–100.

### Cómo funciona la carrera

Cada pie tiene una fase (la izquierda va medio ciclo desfasada) y `pose(fase)` devuelve todo: posición, cabeceo, flexión, compresión y moño. En el apoyo (35 % del ciclo) el punto de contacto viaja con el piso, y la altura sale del punto más bajo de la suela (talón → metatarsos → punta), así que no hay deslizamiento ni penetración. La velocidad solo escala el avance de la fase.

Rig exportado desde Blender (5 huesos de deformación por pie): `Toe` flexiona en los metatarsos (zona de 6 cm), `RearCush` / `ToeCush` bajan la capellada sobre la espuma (la entresuela se comprime en proporción a la altura, la goma no), `Bow` mueve el moño. El contrafuerte y la punta de la puntera quedan fuera de la zona de flexión.

## Resultados de las pruebas

`tests/smoke.js` con Playwright (Chromium, 1440 × 810 y 390 × 844), última corrida:

| Prueba | Resultado |
| --- | --- |
| Errores de consola / red | 0 |
| Despiece: residuo en 0 %, en 100 % y al volver a 0 % | 0 m / 0 rad |
| Despiece: pose en 25 / 50 / 75 % bajando = subiendo | idéntica |
| Carrera: salto entre el último y el primer cuadro | 6 µm |
| Carrera: punto más bajo de la suela | 0 mm (nunca bajo el piso) |
| Carrera: flexión máx. / compresión talón / antepié | 37° / 5,5 mm / 4,7 mm |
| Controles: play, pause, replay, reset, velocidad 2× | correctos (2× avanza 1,97×) |
| `destroy()` | 0 canvas, 0 nodos propios |
| Rendimiento | 60 fps, 42 draw calls |
| Colecciones anteriores (`index`, `coffee-3d`, `loopsmith-3d`) | cargan sin errores |

Capturas en `previews/verify/` (despiece 0–100, carrera en 5 fases, macros web, escritorio y mobile) y renders de Blender en `previews/blender/` (8 vistas, par y 6 macros con luz rasante).

## Límites conocidos

- Las texturas PBR son procedurales generadas con numpy y guardadas como imagen; lo único horneado con Cycles es la oclusión. El microrelieve va en mapas de normales: no hay displacement por textura (surcos, tacos y costuras sí son geometría).
- La carrera se anima en JavaScript sobre el rig; el `.blend` no trae una acción con el ciclo. No se usan morph targets.
- Sin KTX2 ni Meshopt: no había codificador disponible; van WebP + Draco.
- Mobile se probó con viewport emulado, no en un teléfono real.
- El moño es estilizado y la textura se comprime un poco en la punta, donde converge la parametrización.
- Las dos experiencias en la misma página usan dos contextos WebGL; la segunda se monta recién al acercarse.
