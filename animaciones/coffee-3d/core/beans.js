/**
 * Sistema de carga de los granos modelados en Blender.
 *
 *   const { std, crowd } = await loadGeometries();          // 9 variantes por LOD (BufferGeometry compartidas, nunca se liberan)
 *   const { hero } = await loadGeometries({ hero: true });  // el LOD hero (49k tris por grano) solo se descarga si se pide
 *   const mat = await beanMaterial("dark", "2k");           // MeshStandardMaterial con color + normal + ORM horneados
 *   const swarm = new Swarm(crowd, mat, 600);               // InstancedMesh por variante con una API de índice único
 *
 * Convención: largo del grano = 1 unidad sobre Y, hendidura mirando a +Z, centrado en el origen.
 * Todas las variantes y LODs comparten UVs, así que un juego de texturas por tostado sirve para todos.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const ASSETS = new URL("../assets/", import.meta.url);
const DRACO = new URL("../../../assets/vendor/three/jsm/libs/draco/gltf/", import.meta.url).href;
export const ROASTS = { light: "Light Roast", medium: "Medium Roast", dark: "Dark Roast", espresso: "Espresso" };
export const VARIANTS = ["Clásico", "Alargado", "Corto y redondo", "Hendidura pronunciada", "Hendidura irregular", "Ancho asimétrico", "Grieta lateral", "Curvado", "Rugoso"];
/** Color medio de cada tostado (para el material "simple" de comparación y para UI). */
export const ROAST_TINT = { light: 0x7c4f27, medium: 0x45270f, dark: 0x291407, espresso: 0x170b06 };

let gltf; const files = {}, texCache = new Map(), matCache = new Map();
const loader = () => (gltf ??= new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(DRACO)));

function loadFile(name) {
  return (files[name] ??= loader().loadAsync(new URL(`models/${name}`, ASSETS).href).then((g) => {
    const out = { hero: [], std: [], crowd: [] };
    g.scene.traverse((o) => {
      const m = o.isMesh && /^Bean_(\d+)_.*_(hero|std|crowd)$/.exec(o.name); if (!m) return;
      const geo = o.geometry; geo.rotateX(Math.PI / 2); geo.center(); geo.computeBoundingSphere(); geo.computeBoundingBox();     // glTF (largo en Z) -> largo en Y, cara a +Z
      out[m[2]][+m[1]] = geo;
    });
    return out;
  }));
}

export async function loadGeometries({ hero = false } = {}) {
  const [a, b] = await Promise.all([loadFile("coffee-beans-variants.glb"), hero ? loadFile("coffee-beans-hero-variants.glb") : null]);
  return { std: a.std, crowd: a.crowd, hero: b?.hero ?? null };
}

function texture(roast, kind, res) {
  const key = `${roast}_${kind}_${res}`;
  if (!texCache.has(key)) texCache.set(key, new THREE.TextureLoader().loadAsync(new URL(`textures/web/${key}.webp`, ASSETS).href).then((t) => {
    t.flipY = false; t.colorSpace = kind === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t;      // flipY=false: los UV vienen en convención glTF
  }));
  return texCache.get(key);
}
/** Mapas horneados de un tostado: { map, normalMap, orm } (ORM: R = oclusión, G = roughness, B = metallic = 0). */
export async function loadMaps(roast = "medium", res = "1k") {
  const [map, normalMap, orm] = await Promise.all([texture(roast, "color", res), texture(roast, "normal", res), texture(roast, "orm", res)]);
  return { map, normalMap, orm };
}
const apply = (mat, { map, normalMap, orm }) => { mat.map = map; mat.normalMap = normalMap; mat.roughnessMap = orm; mat.aoMap = orm; mat.needsUpdate = true; return mat; };

/** Material PBR completo. Con `shared` (por defecto) se reutiliza una instancia por tostado y resolución. */
export async function beanMaterial(roast = "medium", res = "1k", { shared = true } = {}) {
  const key = `${roast}_${res}`;
  if (shared && matCache.has(key)) return matCache.get(key);
  const mat = apply(new THREE.MeshStandardMaterial({ metalness: 0, roughness: 1, aoMapIntensity: 1, envMapIntensity: 1 }), await loadMaps(roast, res));
  mat.userData = { roast, res }; if (shared) matCache.set(key, mat);
  return mat;
}
/** Cambia el tostado de un material existente (sin recrearlo): color, normales y roughness cambian juntos. */
export async function setRoast(mat, roast, res = mat.userData.res || "1k") { apply(mat, await loadMaps(roast, res)); mat.userData.roast = roast; return mat; }

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _hit = [];

/**
 * Enjambre instanciado: N granos repartidos entre las variantes (un InstancedMesh por variante = 9 draw calls para miles de granos).
 * Estado en arrays planos: pos (3n), quat (4n), scale (n). Tras modificarlos, `commit()` sube las matrices a la GPU.
 */
export class Swarm {
  constructor(geometries, material, count, { shadows = false, variants = null } = {}) {
    const geos = (variants ? variants.map((v) => geometries[v]) : geometries).filter(Boolean), nv = geos.length;
    this.count = count; this.material = material; this.group = new THREE.Group();
    this.pos = new Float32Array(count * 3); this.quat = new Float32Array(count * 4); this.scale = new Float32Array(count).fill(1);
    for (let i = 0; i < count; i++) this.quat[i * 4 + 3] = 1;
    this.meshes = geos.map((g, v) => {
      const m = new THREE.InstancedMesh(g, material, Math.ceil((count - v) / nv)); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false; m.castShadow = m.receiveShadow = shadows; m.userData.variant = v; this.group.add(m); return m;      // el enjambre ocupa la escena: culling por instancia no rinde
    });
    this.nv = nv; this.radius = geos[0].boundingSphere.radius;
  }
  setMaterial(mat) { this.material = mat; this.meshes.forEach((m) => (m.material = mat)); }
  set(i, x, y, z) { const j = i * 3; this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z; }
  commit() {
    const { pos, quat, scale, nv, meshes } = this;
    for (let i = 0; i < this.count; i++) { const s = scale[i]; _m.compose(_p.fromArray(pos, i * 3), _q.fromArray(quat, i * 4), _s.set(s, s, s)); meshes[i % nv].setMatrixAt((i / nv) | 0, _m); }
    for (const m of meshes) m.instanceMatrix.needsUpdate = true;
  }
  /** Raycasting sobre los granos reales: { index, point, origin (centro del grano en mundo) } o null. */
  pick(raycaster) {
    _hit.length = 0; this.group.updateMatrixWorld();
    for (const m of this.meshes) { m.computeBoundingSphere(); m.raycast(raycaster, _hit); }
    if (!_hit.length) return null; _hit.sort((a, b) => a.distance - b.distance);
    const h = _hit[0], index = h.instanceId * this.nv + h.object.userData.variant;
    return { index, point: h.point.clone(), origin: this.group.localToWorld(new THREE.Vector3().fromArray(this.pos, index * 3)) };
  }
  dispose() { this.meshes.forEach((m) => m.dispose()); this.group.removeFromParent(); }      // geometrías y texturas son del asset compartido
}

export { THREE };
