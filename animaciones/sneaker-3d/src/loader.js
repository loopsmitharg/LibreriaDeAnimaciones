/** Carga de GLB (Draco) con caché por URL. Los GLB traen sus texturas WebP embebidas. */
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

export const MODELS = new URL("../models/", import.meta.url).href;
const DRACO = new URL("../../../assets/vendor/three/jsm/libs/draco/gltf/", import.meta.url).href;
let draco = null, users = 0;
const cache = new Map();

/** Devuelve el gltf ya parseado. `onProgress(0..1)`. Cada llamada cuenta como un usuario: llamar a release() al desmontar. */
export function loadGLB(url, { dracoPath = DRACO, onProgress } = {}) {
  users++;
  if (!cache.has(url)) {
    draco ||= new DRACOLoader().setDecoderPath(dracoPath);
    cache.set(url, new GLTFLoader().setDRACOLoader(draco).loadAsync(url, (e) => e.total && onProgress?.(e.loaded / e.total)));
  }
  return cache.get(url);
}
/** Suelta el decodificador Draco (workers) cuando ya no queda ninguna experiencia montada. */
export function release(url) {
  cache.delete(url);
  if (--users <= 0 && draco) { draco.dispose(); draco = null; users = 0; }
}
