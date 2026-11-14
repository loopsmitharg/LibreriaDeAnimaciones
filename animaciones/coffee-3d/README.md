# Coffee 3D Motion Lab

Colección de 24 experiencias 3D con granos de café modelados en Blender y animados en la web con Three.js, GSAP ScrollTrigger y cannon-es. Sin frameworks y sin build: HTML + módulos ES.

## Ejecutar

Hace falta un servidor estático en la raíz del repo (los módulos ES no cargan con `file://`):

```bash
python -m http.server 5511
```

Abrir `http://localhost:5511/animaciones/coffee-3d/index.html`. Cada escena también abre sola: `scene.html?id=coffee-rain&roast=dark&rig=side&quality=low`.

Dependencias: las de `assets/vendor/` del repo (three r170, cannon-es, gsap + ScrollTrigger). No se instaló nada nuevo.

## Estructura

```
coffee-3d/
  index.html · gallery.js      galería (un solo renderer: el grano hero; las tarjetas son capturas)
  scene.html · viewer.js       visor de una escena con HUD y controles
  core/      stage.js (renderer, luces, bucle) · beans.js (carga, materiales, Swarm) · mount.js (mountScene) · kit.js
  effects/   01…24, un módulo por escena + index.js (registro liviano, import dinámico)
  physics/   world.js (cannon-es) · flock.js (partículas con grilla espacial)
  shaders/   bean-shader.js (microdetalle + mezcla de tostados)
  styles/    scene.css (lo mínimo para montar una escena) · lab.css (galería y visor)
  tests/     smoke.js (Playwright)
  assets/
    blender/   coffee-beans-master.blend + scripts/ (beans.py, materials.py, bake.py)
    models/    GLB con Draco
    textures/  baked/ (PNG 2K maestros) · web/ (WebP 2K y 1K) · source/ (height, roughness y AO sueltos)
    previews/  capturas de las tarjetas · blender/ (renders de Cycles) · verify/ (capturas de prueba)
```

## Usar una escena en otra página

```html
<link rel="stylesheet" href="coffee-3d/styles/scene.css">
<script src="vendor/gsap.min.js"></script><script src="vendor/ScrollTrigger.min.js"></script>
<script type="importmap">{"imports":{"three":"vendor/three/build/three.module.js","three/addons/":"vendor/three/jsm/","cannon-es":"vendor/cannon-es/cannon-es.js"}}</script>
<section id="hero" style="height:100vh"></section>
<script type="module">
  import { mountScene } from "./coffee-3d/core/mount.js";
  import def from "./coffee-3d/effects/21-product-hero.js";
  const scene = await mountScene(def, document.querySelector("#hero"), { roast: "dark", params: { html: "<h2>Mi cafetería</h2>" } });
  // scene.play() · pause() · resume() · reset() · setRoast("light") · setRig("side") · set("clave", valor) · destroy()
</script>
```

- El contenedor define el tamaño. Las escenas de scroll (`def.scroll`) crean su propio tramo alto con el escenario `sticky` y usan el scroll de la ventana.
- `core/beans.js` busca el decoder Draco en `../../../assets/vendor/three/jsm/libs/draco/gltf/`; si movés la carpeta, ajustá `DRACO`.
- Solo los granos, sin escenas: `loadGeometries()`, `beanMaterial(roast, "1k" | "2k")`, `new Swarm(geometrias, material, cantidad)`.

## Los granos

Convención en Three.js: largo = 1 unidad sobre Y, hendidura hacia +Z, centrado en el origen.

| Archivo | Contenido | Uso |
|---|---|---|
| `coffee-beans-variants.glb` (350 KB) | 9 variantes × LOD **std** (5.8k tris) y **crowd** (768 tris), sin texturas | escenas con muchos granos |
| `coffee-beans-hero-variants.glb` (1.6 MB) | 9 variantes × LOD **hero** (49k tris), sin texturas | primeros planos; se descarga solo si se pide |
| `coffee-bean-hero.glb` (1.8 MB) | grano clásico hero con texturas 2K embebidas (medium) | autocontenido, para otros motores |
| `coffee-bean-optimized.glb` (375 KB) | grano clásico std con texturas 1K embebidas | autocontenido |

Variantes: clásico, alargado, corto y redondo, hendidura pronunciada, hendidura irregular, ancho asimétrico, grieta lateral, curvado, rugoso.

Todas las variantes y LODs comparten UVs (analíticos: isla de la cara + isla del lomo), así que **un juego de mapas por tostado sirve para todos**: `{roast}_color` (sRGB), `{roast}_normal`, `{roast}_orm` (R oclusión, G roughness, B metallic = 0). Tostados: `light`, `medium`, `dark`, `espresso`; cada uno cambia paleta, roughness, parches de aceite, densidad de grietas y película de la hendidura, no solo el color.

Qué viaja a la web y qué no:

- La hendidura, los bultos, las abolladuras y las grietas grandes son **geometría**. En los LODs bajos las líneas de la malla se concentran en la hendidura y las normales vienen de la superficie analítica.
- Poros, venas, arrugas, microgrietas y fibras de la hendidura están **horneados al normal map** (el bump procedural de Blender no se exporta a glTF).
- El height map no desplaza nada en el navegador; queda en `textures/source/` como referencia.
- La luz directa no usa el AO: la cavidad de la hendidura se oscurece en el albedo al empaquetar, y las escenas macro usan sombras reales.
- Para el macro extremo, `shaders/bean-shader.js` suma un normal map de micrograno repetido (los texeles 2K ya se verían borrosos).

## Regenerar los assets en Blender

Con Blender 5.x abierto (se usó 5.3 por MCP), en la consola de Python:

```python
S = "…/coffee-3d/assets/blender/scripts/"
for f in ("beans", "materials", "bake"): exec(open(S + f + ".py", encoding="utf8").read())
build_all()                                  # 9 variantes × 3 LODs
for r in ROASTS: build_material(r)           # materiales procedurales editables
bpy.data.objects[HERO].data.materials.append(bpy.data.materials["Coffee_medium"]); bake_ao()
for r in ROASTS: bake_roast(r); pack(r)      # ~100 s por tostado en CPU
export_all()
```

Para cambiar la forma, editar `BASE` / `VARIANTS` en `beans.py`; para el material, `ROASTS` y el grafo de `materials.py`. `ROOT` en `bake.py` es una ruta absoluta: ajustarla en otra máquina.

## Iluminación y color

Tres rigs en `core/stage.js` (`RIGS`): `soft` (Soft Studio), `side` (Dramatic Side Light), `back` (Cinematic Backlight), sobre un entorno de estudio procedural (PMREM, sin HDRI). Color: texturas de color en sRGB, datos lineales, salida sRGB con ACES. Los renders de Blender usan la vista Standard; la exposición de cada rig se ajustó a ojo contra esos renders, no es una coincidencia numérica.

## Rendimiento

- Un `WebGLRenderer` por escena activa; al destruirla se pierde el contexto a propósito. Geometrías y texturas quedan en caché compartida de la página.
- `Swarm` = un `InstancedMesh` por variante: 9 draw calls para cualquier cantidad de granos.
- El bucle se detiene con la pestaña oculta o el escenario fuera de pantalla; el dt se acota a 1/20 s y la física usa paso fijo (1/90 s).
- Calidad adaptable: en touch, pantallas chicas o ≤ 4 núcleos se reducen cantidades, sombras y pixel ratio; si los fps caen de 38 sostenidamente baja el pixel ratio. Las texturas no se tocan.
- `prefers-reduced-motion`: las escenas que no son de scroll arrancan en pausa.

## Verificación hecha

- Blender (Cycles): `assets/previews/blender/` — frente, lateral, tres cuartos, luz rasante, macro y lámina de las 9 variantes con los 4 tostados.
- Three.js (Playwright, Chromium con GPU): las 24 escenas montan sin errores de consola ni 404, a 60 fps en 1280×800 y en 390×844 con `quality=low`. Capturas en `assets/previews/verify/`.
- Interacción: drag + throw por raycasting y Reset (Playground); ningún grano bajo el piso (Rain); 0 granos fuera del cuenco tras inclinar y agitar (Bowl); todos dentro de la caja al cambiar la gravedad; el scroll mueve el progreso; cambio de tostado y de luz desde la barra; `destroy()` quita el canvas y libera el contexto.
- Dirección del normal map comprobada con una luz de posición conocida (los poros se leen como hundidos).

Sin probar: dispositivos móviles reales y Safari/Firefox (solo emulación de viewport en Chromium); rendimiento en GPUs integradas; gestos táctiles de arrastre y pellizco; la comparación contra fotografías macro reales fue de memoria, no lado a lado; los dos GLB con texturas embebidas se exportaron pero la web no los carga, así que no se revisaron en un visor.

Pendientes conocidos: texturas en WebP (no KTX2/Basis: no había toolchain); mapas a 2K (un 4K para el hero costaría ~6 min de bake por tostado); el colisionador del grano son 3 esferas, así que de costado dos granos pueden solaparse levemente.

Repetir la prueba de humo: con el servidor en `:5511`, correr `tests/smoke.js` desde Playwright MCP (`browser_run_code_unsafe` con `filename`).
