/**
 * Extensiones del MeshStandardMaterial del grano (onBeforeCompile; glTF estándar no las cubre):
 *
 *  - Detalle macro (C3_DETAIL): un normal map de micrograno que se repite muchas veces sobre el grano. A distancias a las que
 *    los texeles del mapa horneado ya se ven borrosos, el microrrelieve sigue nítido. También modula apenas la roughness.
 *  - Mezcla de tostados (C3_BLEND): interpola color, roughness y normales hacia un segundo juego de mapas con un frente
 *    irregular (ruido), no con un fundido plano. `material.userData.c3.uMix.value` va de 0 a 1.
 *
 *    enhance(material, { detail: true });  enhance(material, { blend: true });  setBlendTarget(material, await loadMaps("dark", "2k"));
 */
import * as THREE from "three";

let detailTex = null;
/** Normal map procedural y repetible (RGB = normal, A = altura). Se genera una vez y se comparte. */
export function detailTexture(size = 256) {
  if (detailTex) return detailTex;
  const h = new Float32Array(size * size), rnd = (x, y, s) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
  for (let oct = 0; oct < 4; oct++) {                                           // value noise periódico: 4 octavas
    const cells = 16 << oct, amp = .5 ** oct;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells, fy = (y / size) * cells, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = rnd(ix % cells, iy % cells, oct), b = rnd((ix + 1) % cells, iy % cells, oct), c = rnd(ix % cells, (iy + 1) % cells, oct), d = rnd((ix + 1) % cells, (iy + 1) % cells, oct);
      h[y * size + x] += (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * amp;
    }
  }
  const data = new Uint8Array(size * size * 4), at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * 3.2, dy = (at(x, y + 1) - at(x, y - 1)) * 3.2, l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
    data[i] = (-dx / l * .5 + .5) * 255; data[i + 1] = (-dy / l * .5 + .5) * 255; data[i + 2] = (1 / l * .5 + .5) * 255; data[i + 3] = Math.min(255, at(x, y) / 1.875 * 255);
  }
  detailTex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat); detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping; detailTex.generateMipmaps = true;
  detailTex.minFilter = THREE.LinearMipmapLinearFilter; detailTex.magFilter = THREE.LinearFilter; detailTex.anisotropy = 8; detailTex.needsUpdate = true;
  return detailTex;
}

const PARS = /* glsl */`
#ifdef C3_DETAIL
  uniform sampler2D uDetail; uniform vec2 uDetailScale; uniform float uDetailStrength;
#endif
#ifdef C3_BLEND
  uniform sampler2D mapB; uniform sampler2D ormB; uniform sampler2D normalB; uniform float uMix;
  float c3Hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float c3Noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(c3Hash(i), c3Hash(i + vec2(1, 0)), f.x), mix(c3Hash(i + vec2(0, 1)), c3Hash(i + 1.), f.x), f.y); }
  float c3RoastMask(vec2 uv) { float n = c3Noise(uv * 7.) * .55 + c3Noise(uv * 19.) * .3 + c3Noise(uv * 53.) * .15; return smoothstep(-.18, .18, uMix * 1.36 - .18 - n); }
#endif
`;

function patch(shader) {
  Object.assign(shader.uniforms, this.userData.c3);
  const normalChunk = THREE.ShaderChunk.normal_fragment_maps
    .replace("vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;", `vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
      #ifdef C3_BLEND
        mapN = mix(mapN, texture2D( normalB, vNormalMapUv ).xyz * 2.0 - 1.0, c3Mask);
      #endif`)
    .replace("mapN.xy *= normalScale;", `mapN.xy *= normalScale;
      #ifdef C3_DETAIL
        mapN.xy += (c3Det.xy * 2.0 - 1.0) * uDetailStrength;
      #endif`);
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>\n${PARS}`)
    .replace("#include <map_fragment>", `
      #ifdef C3_BLEND
        float c3Mask = c3RoastMask(vMapUv);
      #endif
      #include <map_fragment>
      #ifdef C3_BLEND
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuse * texture2D(mapB, vMapUv).rgb, c3Mask);
      #endif`)
    .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      #ifdef C3_BLEND
        roughnessFactor = mix(roughnessFactor, roughness * texture2D(ormB, vRoughnessMapUv).g, c3Mask);
      #endif
      #ifdef C3_DETAIL
        vec4 c3Det = texture2D(uDetail, vRoughnessMapUv * uDetailScale);
        roughnessFactor = clamp(roughnessFactor * (.86 + .28 * c3Det.a), .04, 1.);
      #endif`)
    .replace("#include <normal_fragment_maps>", normalChunk);
}

/** Activa detalle y/o mezcla sobre un MeshStandardMaterial con map + normalMap + roughnessMap. */
export function enhance(material, { detail = false, blend = false, detailStrength = .32 } = {}) {
  const u = (material.userData.c3 ??= { uDetail: { value: detailTexture() }, uDetailScale: { value: new THREE.Vector2(30, 21) }, uDetailStrength: { value: detailStrength }, mapB: { value: null }, ormB: { value: null }, normalB: { value: null }, uMix: { value: 0 } });
  u.uDetailStrength.value = detailStrength;
  material.defines = { ...material.defines }; if (detail) material.defines.C3_DETAIL = ""; if (blend) material.defines.C3_BLEND = "";
  material.onBeforeCompile = patch; material.needsUpdate = true;
  return material;
}
/** Juego de mapas de destino de la mezcla ({ map, normalMap, orm } de loadMaps). */
export function setBlendTarget(material, maps) { const u = material.userData.c3; u.mapB.value = maps.map; u.ormB.value = maps.orm; u.normalB.value = maps.normalMap; }
