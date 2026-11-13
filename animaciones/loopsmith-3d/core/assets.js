/**
 * Carga y caché de los assets exportados desde Blender. Se descargan una sola vez por página y se comparten:
 * las geometrías y la textura son del asset (nunca se liberan mientras la página viva); los materiales son de cada instancia.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const MODELS = new URL("../assets/models/", import.meta.url);
const DRACO = new URL("../../../assets/vendor/three/jsm/libs/draco/gltf/", import.meta.url).href;
let loader, logoP, propsP;

const gltfLoader = () => (loader ??= new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(DRACO)));
const json = (name) => fetch(new URL(name, MODELS)).then((r) => r.json());

/** { scene, meta, presets, symbolMap } del logo. `meta` está en ejes glTF (ver blender/build_logo.py). */
export const loadLogoAsset = () => (logoP ??= (async () => {
  const [gltf, meta, presets] = await Promise.all([gltfLoader().loadAsync(new URL("loopsmith-logo.glb", MODELS).href), json("loopsmith-logo.meta.json"), json("loopsmith-presets.json")]);
  let symbolMap = null;
  gltf.scene.traverse((o) => { if (o.name === "Symbol_Body") symbolMap = o.material.map; });
  return { scene: gltf.scene, meta, presets: presets.presets, symbolMap };
})());

/** Anillo, losa y guijarro: { Prop_Ring, Prop_Slab, Prop_Pebble } -> Mesh (geometría compartida). */
export const loadPropsAsset = () => (propsP ??= gltfLoader().loadAsync(new URL("loopsmith-props.glb", MODELS).href).then((g) => {
  const out = {}; g.scene.traverse((o) => { if (o.isMesh) out[o.name] = o; }); return out;
}));

export { THREE };
