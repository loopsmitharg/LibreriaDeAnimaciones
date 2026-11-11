# Estudio de movimiento · Loop Smiths

La colección vive en [`animaciones/lusion/`](../animaciones/lusion/index.html). Abrí el índice de la librería, elegí **Colección Lusion** y entrá en una de las once piezas. Cada URL `?demo=…` abre la vista previa, los parámetros, el reinicio y el código de integración. La cortina además navega entre dos URL con `scene=1` y `scene=2`.

## Repositorio y alcance

La librería sirve HTML, CSS y JavaScript estáticos. El índice tiene filtros por tipo, las demos anteriores tienen ficha técnica y el repositorio incluye fuentes locales, GSAP 3.12.5 y ScrollTrigger. No encontré `AGENTS.md`, configuración TypeScript, gestor de paquetes ni tareas de build, lint o pruebas. Las nuevas demos reutilizan las fuentes y la ficha de la librería. El showcase carga el CSS y el JS de la pieza activa, y carga ScrollTrigger solo para el túnel y el trazo.

Las escenas, el texto, los gradientes y el clip de Prisma se hicieron para Loop Smiths. El clip es un gradiente espiral animado generado fuera del navegador con FFmpeg. Pesa 28 KB, no tiene audio y usa un póster local de 5 KB. El runtime usa HTML, CSS, SVG y los dos scripts de GSAP que ya incluía la librería.

## Recorrido en la referencia

Observé la portada en un navegador real a 1280 × 720 y a 390 × 844. Recorrí hero, reel, destacados, túnel y pie. Abrí el menú, entré en Of The Oak y volví a la galería con el botón del sitio. En el viewport angosto visité About y el índice de Projects desde el menú. Las duraciones y curvas siguientes se estimaron comparando estados visibles antes, durante y después de cada interacción. No se midieron fotograma a fotograma ni se inspeccionó el código de la referencia. [Lusion](https://lusion.co/)

| Efecto y lugar | Qué se observó | Ritmo y secuencia estimados | Recreación |
| --- | --- | --- | --- |
| Precargador de portada y entrada a About | Pantalla negra, marca central que se arma y dígitos que pasan de `000` a `100`. Se alcanza la portada después de la salida. | El conteo depende de la carga. La salida y el primer texto se completan en el orden de un segundo. | `loader` separa progreso real y salida. La demo simula el conteo en 1,5 s y retira una cortina en 0,6 s. |
| Objetos flotantes del hero | Piezas con volumen, oclusión, reflejos y rotaciones independientes dentro de un marco oscuro. La escena sigue en movimiento al abrir el menú. En móvil el marco es alto y el encuadre es más cerrado. | Movimiento continuo, con cambios progresivos de orientación. La duración de un ciclo y la contribución exacta del puntero no se pudieron aislar. | `hero` usa anillos con perspectiva CSS. `solids` construye piezas propias con caras, espesor y perforaciones en CSS 3D. Las dos escenas responden al puntero. |
| Figura de partículas en About | Una figura luminosa formada por puntos aparece sobre un fondo oscuro. También se ven puntos sueltos alrededor del contorno. | Se observó movimiento continuo. El disparador y la mecánica de dispersión original quedaron sin aislar. | `particles` genera un perfil propio a partir de un contorno SVG. La dispersión y el reensamble se activan con un botón, y el puntero desplaza cuatro capas con distinta intensidad. |
| Respuesta al puntero y CTA del reel | Se vio una estela luminosa curva en la zona clara entre hero y reel. El botón de acceso a About se llenó lateralmente al quedar bajo el puntero. | La estela se desvanece en una fracción de segundo. La relación entre la forma de la estela y la velocidad del puntero quedó sin verificar. | `cursor` aproxima la sensación de seguimiento con un halo elástico. Atracción, repulsión y giro son decisiones del demo. |
| Tipografía del hero, reel y pie | El título del hero y las líneas grandes del reel aparecen detrás de un borde horizontal. También se vieron líneas parcialmente recortadas en el pie al entrar. | Ascenso corto con desaceleración y superposición de entradas, aproximadamente 0,4–1 s. | `type` permite máscaras por línea, palabra o carácter, con demora, escala inicial y escalonado. La segmentación por palabra es una variante de la librería. |
| Cinta que une las secciones del reel y de concepto | Un trazo azul crece al bajar junto al título y rodea el bloque de imagen. Más adelante aparece una curva cian. | Avance continuo según scroll, con la línea detrás del texto y de la imagen. | `ribbon` dibuja un SVG con ScrollTrigger, en ambas direcciones y sin anclaje. |
| Reel de portada | Medio enmarcado con movimiento visible y un botón de reproducción sobre el centro. | Se observó la vista previa durante el recorrido. No se midió el reproductor expandido. | `gallery` demuestra carga diferida y control explícito de un clip. |
| Entrada, hover y retorno de tarjetas en Featured Work | Marcos en ángulo que se enderezan al entrar. Las etiquetas muestran caracteres transitorios antes de estabilizarse. La tarjeta Of The Oak cambió de encuadre y mostró una flecha al quedar bajo el puntero. El botón Back regresó a las filas cercanas del mismo listado. | Entrada y descifrado dentro de un segundo. No se verificó que la inclinación siguiera al puntero ni que todas las tarjetas usaran video. | `gallery` combina entrada en perspectiva, etiquetas que se descifran, tilt, zoom, un clip y ficha desplegable. La grilla pasa a lista con FLIP como variante propia. |
| Menú global | En escritorio, paneles separados entran sobre el lateral derecho con desplazamiento, giro leve y opacidad. En móvil, los paneles aparecen sobre un fondo azul a pantalla completa. El botón alterna el estado de apertura. | Paneles y enlaces con entradas solapadas, del orden de 0,4–0,8 s. | `menu` usa diálogo nativo, modo lateral o completo y una secuencia reversible. |
| Transición hacia Of The Oak y About | Al salir de la ficha se vio atenuación del contenido antes de regresar a destacados. Al entrar a About en móvil se vio la salida del menú y una pantalla negra con la marca. | Fundido o cobertura breve antes de la composición nueva. Se conservó la zona aproximada de scroll al regresar de Of The Oak. | `transition` conserva enlaces e historial y coordina la entrada y salida entre dos documentos del mismo origen. La cortina es una interpretación. |
| Zoom de la tablet y túnel antes del pie | La vista sale de un marco con astronauta a un fondo negro. El astronauta se aleja, el túnel converge y luego gana rotación y luces cian y rosas. Más adelante el personaje vuelve a primer plano. | Varias etapas ligadas al desplazamiento. Se observó avance de la cámara aparente. El mecanismo exacto de anclaje quedó sin verificar. | `story` combina anclaje, zoom, capas con desplazamiento de profundidad, fundido de luz y tres títulos. Se puede invertir el recorrido. |
| Salida hacia el pie y siguiente página | Se vio la cápsula de continuación con texto desplazándose y una banda hacia About con una barra parcial. | El texto del pie se descubre al bajar. No se comprobó un cambio automático de página a partir de la barra. | Los indicadores y los reveals se reutilizan desde `story` y `type`. La navegación entre documentos queda en `transition`. |

El índice de Projects cambia a una columna a 390 px y conserva la entrada en ángulo y el texto transitorio. About muestra una figura hecha de partículas en su hero. Of The Oak declara WebGL entre sus servicios, y la portada expone una superficie gráfica con contenido renderizado. La atribución de shaders específicos, dinámica de partículas, iluminación, refracción o física es una inferencia. [Projects](https://lusion.co/projects), [About](https://lusion.co/about), [Of The Oak](https://lusion.co/projects/of_the_oak)

Las piezas de `solids` tienen volumen geométrico en CSS y sombreado fijo en cada cara. `particles` usa un retrato de puntos SVG en capas. Las colisiones, la iluminación dinámica, la nube volumétrica de About, el astronauta articulado y la refracción de la estela quedan fuera de estas recreaciones. Las dos escenas usan formas y código propios.

## Integración

Copiá el fragmento que genera la demo, el par `effects/<nombre>.css` y `effects/<nombre>.js`, y ajustá las rutas de GSAP a tu proyecto. Para la galería, copiá `media/prisma.jpg` y `media/prisma.mp4` o indicá tus propios recursos. El markup de cada fragmento incluye sus clases y atributos de datos. Los IDs del menú y las fichas deben ser únicos si montás varias instancias en la misma página. Las fuentes de Loop Smiths son opcionales y los estilos tienen fuentes de respaldo.

| Demo y función | Opciones | Requisitos y comportamiento |
| --- | --- | --- |
| [`hero`](../animaciones/lusion/index.html?demo=hero) | `duration`, `delay`, `speed`, `distance`, `perspective`, `count`, `color`, `ease`, `enabled` | GSAP. Definí los planos con `[data-depth]` y las variables CSS de cada objeto. El bucle se pausa fuera de vista. |
| [`cursor`](../animaciones/lusion/index.html?demo=cursor) | `distance`, `strength`, `rotation`, `duration`, `ease`, `enabled` | GSAP. Envolvé cada objetivo en `[data-ls-magnet]`. `data-polarity="-1"` invierte su fuerza. Solo usa seguimiento con puntero fino. |
| [`type`](../animaciones/lusion/index.html?demo=type) | `mode`, `trigger`, `duration`, `delay`, `stagger`, `distance`, `scale`, `ease`, `repeat`, `enabled` | GSAP. Cada `[data-ls-line]` contiene texto plano. `repeat: true` permite repetir al volver al viewport. Separá las líneas que deban conservar su ajuste en móvil. |
| [`story`](../animaciones/lusion/index.html?demo=story) | `distance`, `scrub`, `zoom`, `twist`, `pin`, `scroller`, `enabled` | GSAP y ScrollTrigger. Por defecto sigue el scroll de la página. `scroller` acepta un contenedor propio. El pin se activa a partir de 901 px. Por debajo usa `sticky`. |
| [`gallery`](../animaciones/lusion/index.html?demo=gallery) | `duration`, `tilt`, `zoom`, `hoverVideo`, `scramble`, `ease`, `enabled` | GSAP para el movimiento. El control de lista y la reproducción explícita siguen disponibles sin GSAP. El video de ejemplo se pausa fuera de vista. |
| [`menu`](../animaciones/lusion/index.html?demo=menu) | `duration`, `stagger`, `wide`, `color`, `ease`, `enabled` | GSAP para la secuencia. `wide: false` usa el panel lateral en escritorio. El `<dialog>` gestiona la modalidad. Los enlaces a secciones cierran el diálogo y pueden llevar el foco a un destino con `tabindex="-1"`. |
| [`ribbon`](../animaciones/lusion/index.html?demo=ribbon) | `scrub`, `width`, `color`, `reverse`, `scroller`, `enabled` | GSAP y ScrollTrigger. Usá `pathLength="1"` en el `<path data-ls-path>`. El trazo completo queda visible con movimiento reducido. |
| [`loader`](../animaciones/lusion/index.html?demo=loader) | `duration`, `exit`, `color`, `ease`, `enabled` | GSAP. `duration` controla solo la simulación `replay()`. Llamá a `setProgress(0…100)` con el progreso de tu tarea y a `finish()` cuando termine. |
| [`transition`](../animaciones/lusion/index.html?demo=transition) | `duration`, `color`, `ease`, `enabled` | GSAP. Montá el módulo en cada página y marcá los enlaces con `data-ls-transition-link`. La entrada coordinada necesita `sessionStorage`. Si está restringido, la navegación sigue funcionando. |
| [`particles`](../animaciones/lusion/index.html?demo=particles) | `count`, `spread`, `distance`, `duration`, `color`, `enabled` | SVG y CSS. GSAP anima el parallax y la deriva. Reemplazá el `d` de `[data-ls-cloud-shape]` para cambiar el contorno. El método `setScattered(true)` permite dispersar desde un control externo. |
| [`solids`](../animaciones/lusion/index.html?demo=solids) | `count`, `speed`, `perspective`, `distance`, `duration`, `color`, `ease`, `enabled` | Caras HTML proyectadas con CSS 3D. Cada pieza usa dos tapas, doce caras exteriores y doce interiores. GSAP anima el giro. Las variables de cada `[data-ls-solid]` controlan el tamaño, la longitud, la posición y el metal. |

Las opciones de tiempo están en segundos y los ángulos en grados. `enabled: false` desactiva la animación y conserva la interacción básica. Todas las funciones devuelven `destroy()`, que se llama al desmontar. Las funciones de hero, tipografía, menú, precarga y transición también exponen `replay()`.

```js
const scene = document.querySelector('[data-ls-type]');
const title = LoopSmithMotion.type(scene, {
  mode: 'chars',
  trigger: 'viewport',
  stagger: 0.035,
  repeat: true
});

// Si la vista se desmonta, restaurá el contenido original y quitá el observador.
// title.destroy();
```

```js
const loader = LoopSmithMotion.loader(document.querySelector('[data-ls-loader-root]'));
loader.setProgress(0);
// Llamá a loader.setProgress(porcentaje) cuando cambie el progreso de tu tarea.
// Llamá a loader.finish() cuando la tarea esté lista.
```

## Verificación local

Desde la raíz, iniciá `python -m http.server 5510` y abrí [`/animaciones/lusion/`](http://localhost:5510/animaciones/lusion/). Para validar la cortina entre páginas y el portapapeles, usá el servidor local. Revisá el túnel y el trazo con el puntero dentro de la vista previa desplazable, o con el foco ahí y las flechas del teclado.

| Prueba | Resultado |
| --- | --- |
| Chromium 156 con Playwright a 1440 × 960 | Nueve efectos activados. Se comprobaron parallax y retorno, teclado, los tres modos de texto, scroll reversible, video, grilla y lista, apertura y cierre modal, trazo en ambas direcciones, contador y transición de documento. |
| Chromium a 820 × 1180 y 390 × 844 con emulación táctil en móvil | Nueve demos en cada viewport, sin desborde horizontal. Se verificaron el scroll sticky, el menú, los botones táctiles del campo y el control explícito de video. |
| Capturas de las nueve demos | Revisión visual de escenas en estados intermedios o finales. Las capturas muestran el recorte de texto, los planos del túnel, el cambio de encuadre de la galería y la cortina de transición. |
| Movimiento reducido y GSAP no disponible | Preferencia probada en las nueve demos a ambos tamaños. Cambio en vivo probado en tipografía y precarga. Al bloquear GSAP, el túnel mostró sus tres títulos en flujo. |
| Integración y regresión | Los nueve fragmentos generados iniciaron en documentos aislados. Se copió y leyó un ejemplo en el portapapeles. Se validaron el filtro del catálogo y la carga de las 15 demos anteriores. |
| Ampliación de partículas y sólidos | Probadas en los mismos tres tamaños. Se verificaron dispersión y reensamble por teclado y tacto, cantidad de puntos, caras internas y externas, cambios de perspectiva, giro, pausa fuera de pantalla y movimiento reducido. Los dos fragmentos arrancaron en documentos aislados. |
| Consola, sintaxis y diff | Las pruebas pasaron sin errores de aplicación ni advertencias. `node --check` pasó para los once módulos y el showcase, y `git diff --check` quedó limpio. |

La verificación se hizo en Chromium. Quedan por medir la fluidez y la decodificación de video en Safari/iOS, Firefox y dispositivos físicos, especialmente cuando un cliente combine varias escenas en una misma página.
