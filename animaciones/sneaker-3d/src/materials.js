/**
 * Ajustes de material tras cargar el GLB: sombras, filtrado anisotrópico y la oclusión horneada.
 * El AO de contacto entre capas viaja como color de vértice (COLOR_0). `uAO` (0..1) lo atenúa:
 * con la zapatilla armada vale 1; en el despiece baja a 0 para que las piezas sueltas no queden "sucias".
 */
const SHEEN = { knit: .07, mesh: .05, suede: .11, collar: .08, lace: .06, lining: .06, insole: .05, webbing: .05 };
export function prepare(root, renderer, uAO = { value: 1 }) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy()), seen = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    if (o.isSkinnedMesh) o.frustumCulled = false;
    for (const m of [].concat(o.material)) {
      if (seen.has(m)) continue; seen.add(m);
      for (const k of ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap"]) if (m[k]) m[k].anisotropy = aniso;
      m.aoMapIntensity = .8;
      if (m.sheen) { m.sheenColor.setScalar(SHEEN[m.name] ?? .06); m.sheenRoughness = .55; }   // el exportador manda el sheen en blanco pleno: acá va el valor real de cada tejido
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uAO = uAO;
        sh.fragmentShader = "uniform float uAO;\n" + sh.fragmentShader.replace("#include <color_fragment>",
          "#if defined( USE_COLOR_ALPHA )\n diffuseColor.rgb *= mix( vec3( 1.0 ), vColor.rgb, uAO );\n#elif defined( USE_COLOR )\n diffuseColor.rgb *= mix( vec3( 1.0 ), vColor, uAO );\n#endif");
      };
      m.customProgramCacheKey = () => "sn-ao";
    }
  });
  return uAO;
}
