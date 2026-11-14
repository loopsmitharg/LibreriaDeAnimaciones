/** Registro liviano de las 24 escenas (solo metadatos). El código de cada una se importa recién al abrirla: loadEffect(meta). */
export const GROUPS = { A: "Interacciones físicas", B: "Scroll", C: "Motion design", D: "Experiencias premium" };

const E = (n, id, title, group, desc, tags) => ({ n, id, title, group, desc, tags, file: `${String(n).padStart(2, "0")}-${id}` });
export const EFFECTS = [
  E(1, "bean-playground", "Coffee Bean Playground", "A", "Agarrá los granos, lanzalos y miralos chocar. Reset los devuelve a su formación.", ["Raycasting", "cannon-es", "Drag & throw"]),
  E(2, "coffee-rain", "Coffee Rain", "A", "Lluvia de granos con rebote y acumulación real sobre una superficie.", ["cannon-es", "Instancing", "Sombras"]),
  E(3, "magnetic-coffee", "Magnetic Coffee", "A", "Un campo magnético en el cursor: atrae o repele con inercia y amortiguación.", ["Campo de fuerza", "Instancing"]),
  E(4, "physics-bowl", "Coffee Physics Bowl", "A", "Un cuenco con granos: inclinalo, movelo y agitalo.", ["cannon-es", "Gravedad relativa"]),
  E(5, "zero-gravity", "Zero Gravity Beans", "A", "Granos en gravedad cero que rotan en varios ejes y esquivan el cursor.", ["Partículas", "Profundidad"]),
  E(6, "macro-inspection", "Macro Bean Inspection", "A", "Un grano hero para rotar y acercarse hasta ver poros, grietas y la hendidura. Con luz rasante.", ["Hero 49k tris", "PBR 2K", "OrbitControls"]),
  E(7, "coffee-explosion", "Coffee Explosion", "B", "Un racimo compacto se separa en el espacio a medida que avanza el scroll. Reversible.", ["ScrollTrigger", "Instancing"]),
  E(8, "coffee-vortex", "Coffee Vortex", "B", "Un vórtice de granos; la cámara avanza por su centro.", ["ScrollTrigger", "Cámara"]),
  E(9, "coffee-tunnel", "Coffee Tunnel", "B", "Un túnel de granos flotantes atravesado por la cámara.", ["ScrollTrigger", "Curva de cámara"]),
  E(10, "scroll-assembly", "Scroll Coffee Assembly", "B", "Granos dispersos que se ordenan hasta dibujar una taza.", ["ScrollTrigger", "Composición"]),
  E(11, "macro-journey", "Coffee Macro Journey", "B", "De un grupo de granos al detalle microscópico de uno solo, recorriendo su hendidura.", ["ScrollTrigger", "Hero 2K", "Macro"]),
  E(12, "cinematic-storytelling", "Coffee Cinematic Storytelling", "B", "Seis fases narrativas encadenadas, sin saltos ni zonas muertas.", ["ScrollTrigger", "6 fases"]),
  E(13, "slow-motion-drop", "Slow Motion Coffee Drop", "C", "Un grano cae en cámara lenta, rebota y pierde energía. La cámara lo sigue.", ["cannon-es", "Cámara lenta"]),
  E(14, "bean-orbit", "Coffee Bean Orbit", "C", "Órbitas tridimensionales alrededor de un centro, con cámara libre.", ["Órbitas", "OrbitControls"]),
  E(15, "coffee-spiral", "Coffee Spiral", "C", "Una espiral vertical que gira, se comprime y se expande.", ["Paramétrico", "Instancing"]),
  E(16, "coffee-burst", "Coffee Burst", "C", "Explosión radial coreografiada que vuelve a su composición.", ["GSAP timeline", "Instancing"]),
  E(17, "coffee-wave", "Coffee Wave", "C", "Cientos de granos forman una superficie que ondula.", ["Instancing", "Onda"]),
  E(18, "infinite-flow", "Infinite Coffee Flow", "C", "Una corriente continua sobre una curva espacial, en loop perfecto.", ["Curva cerrada", "Loop"]),
  E(19, "roast-transformation", "Roast Transformation", "D", "El grano se tuesta: color, roughness y normales cambian con un frente irregular.", ["Shader", "4 tostados"]),
  E(20, "material-laboratory", "Coffee Material Laboratory", "D", "Inspector de materiales: roughness, normales, AO y comparación contra un material simple.", ["Debug views", "Split"]),
  E(21, "product-hero", "Coffee Product Hero", "D", "Sección hero para una marca de café: granos flotando alrededor del contenido.", ["HTML reemplazable", "Parallax"]),
  E(22, "coffee-swarm", "Interactive Coffee Swarm", "D", "Un enjambre con comportamiento colectivo que responde al cursor y reconstruye una forma.", ["Boids", "Instancing"]),
  E(23, "gravity-switch", "Coffee Gravity Switch", "D", "Cambiá la dirección de la gravedad: los granos caen hacia otra pared.", ["cannon-es", "Gravedad"]),
  E(24, "ultimate-experience", "Ultimate Coffee Experience", "D", "La pieza principal: macro, descomposición, interacción y cierre, dirigida por scroll.", ["ScrollTrigger", "Hero + enjambre"]),
];
export const loadEffect = (meta) => import(`./${meta.file}.js`).then((m) => m.default);
