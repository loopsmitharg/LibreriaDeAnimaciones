/**
 * Controlador del logo: instancia el GLB de Blender, expone cada pieza (símbolo + letras) como objeto 3D independiente,
 * guarda su transformación original, cambia materiales por preset y restaura la composición con precisión.
 *
 *   const logo = new Logo(asset, { preset: "original" });
 *   logo.pieces / logo.letters / logo.symbol      Object3D (Symbol es un Group; las letras, Mesh)
 *   logo.pick(raycaster) -> { piece, point } | null
 *   logo.setPreset("chrome", { duration: .8 })    transición de material (mismos meshes)
 *   logo.restore(.9) / logo.snapHome()            vuelve a la composición original (animado / exacto)
 *   logo.destroy()                                libera solo lo propio (materiales); geometría y textura son del asset
 */
import * as THREE from "three";
import { gsap } from "./gsap.js";

const SLOT = (name, ud) => name === "Symbol_Body" ? "symbol" : name === "Symbol_L" ? "ink" : ud.ls_word === 1 ? "smith" : "loop";

export class Logo {
  constructor(asset, { preset = "original" } = {}) {
    this.asset = asset; this.meta = asset.meta; this._tweens = [];
    this.group = new THREE.Group(); this.group.name = "LoopSmithLogo";
    this.root = asset.scene.clone(true); this.group.add(this.root);
    this.symbol = this.root.getObjectByName("Symbol");
    this.letters = asset.meta.letters.map((l) => this.root.getObjectByName(l.id));
    this.pieces = [this.symbol, ...this.letters];
    const metas = [asset.meta.symbol, ...asset.meta.letters];
    this.pieces.forEach((p, i) => {
      const m = metas[i];
      p.userData = { ...p.userData, index: i, id: m.id, char: m.char || "", meta: m, dims: new THREE.Vector3(...m.dimensions), isPiece: true,
        home: { position: p.position.clone(), quaternion: p.quaternion.clone(), scale: p.scale.clone() } };
    });
    // Materiales: uno vivo por malla (se anima entre presets sin cambiar de objeto). Son propios de esta instancia.
    this.meshes = []; this.root.traverse((o) => { if (o.isMesh) { o.material = new THREE.MeshPhysicalMaterial(); o.userData.slot = SLOT(o.name, { ls_word: o.userData.ls_word ?? this._wordOf(o) }); this.meshes.push(o); } });
    this.preset = null; this.setPreset(preset);
  }

  _wordOf(mesh) { const m = this.meta.letters.find((l) => l.id === mesh.name); return m ? m.word : -1; }

  /** Ancho total y alto de la composición, en unidades (1 = lado del símbolo). */
  get size() { return new THREE.Vector3(this.meta.width, 1, this.meta.depth.symbolBody + this.meta.depth.symbolL); }

  _apply(mat, spec, map) {
    mat.color.set(spec.color); mat.roughness = spec.roughness; mat.metalness = spec.metallic;
    mat.clearcoat = spec.coat; mat.clearcoatRoughness = spec.coatRoughness; mat.ior = spec.ior;
    mat.transmission = spec.transmission; mat.thickness = spec.transmission ? .28 : 0; mat.map = map || null;
    mat.envMapIntensity = spec.metallic ? 2.1 : spec.transmission ? 1.6 : 1;
  }

  /** Cambia el preset de material. Con `duration` interpola color, rugosidad, metal, laca y transmisión. */
  setPreset(name, { duration = 0, ease = "power2.inOut", stagger = 0 } = {}) {
    const P = this.asset.presets[name]; if (!P) throw new Error(`Preset desconocido: ${name}`);
    this.preset = name; this._tweens.forEach((t) => t.kill()); this._tweens = [];
    for (const [mi, mesh] of this.meshes.entries()) {
      const spec = P[mesh.userData.slot], mat = mesh.material, map = spec.texture ? this.asset.symbolMap : null;
      if (!duration) { this._apply(mat, spec, map); mat.needsUpdate = true; continue; }
      const from = { r: 0, c: mat.color.clone(), rough: mat.roughness, met: mat.metalness, coat: mat.clearcoat, cr: mat.clearcoatRoughness, tr: mat.transmission };
      const to = new THREE.Color(spec.color), crossesTrans = (mat.transmission > 0) !== (spec.transmission > 0), crossesMap = !!mat.map !== !!map;
      const k = { t: 0 }; mat.map = map || mat.map; mat.ior = spec.ior; mat.thickness = spec.transmission ? .28 : mat.thickness; mat.needsUpdate = crossesTrans || crossesMap;
      this._tweens.push(gsap.to(k, { t: 1, duration, ease, delay: mi * stagger, onUpdate: () => {
        mat.color.copy(from.c).lerp(to, k.t); mat.roughness = gsap.utils.interpolate(from.rough, spec.roughness, k.t); mat.metalness = gsap.utils.interpolate(from.met, spec.metallic, k.t);
        mat.clearcoat = gsap.utils.interpolate(from.coat, spec.coat, k.t); mat.clearcoatRoughness = gsap.utils.interpolate(from.cr, spec.coatRoughness, k.t);
        mat.transmission = gsap.utils.interpolate(from.tr, spec.transmission, k.t); mat.envMapIntensity = spec.metallic ? 2.1 : spec.transmission ? 1.6 : 1;
      }, onComplete: () => { this._apply(mat, spec, map); if (!map) mat.map = null; mat.needsUpdate = true; } }));
    }
  }

  /** Raycast contra la geometría real. Devuelve la pieza lógica (Symbol agrupa cuerpo + L) y el punto de impacto. */
  pick(raycaster) {
    const hit = raycaster.intersectObjects(this.pieces, true)[0]; if (!hit) return null;
    let o = hit.object; while (o && !o.userData.isPiece) o = o.parent;
    return o ? { piece: o, point: hit.point, distance: hit.distance } : null;
  }

  /** Centro geométrico de una pieza (coordenadas del grupo del logo, en reposo). */
  homeCenter(piece) { return new THREE.Vector3(...piece.userData.meta.center); }

  /** Vuelve todo a la composición original, al instante. Es exacto: copia las transformaciones guardadas. */
  snapHome() {
    gsap.killTweensOf(this.pieces.map((p) => [p.position, p.scale]).flat());
    for (const p of this.pieces) { const h = p.userData.home; p.position.copy(h.position); p.quaternion.copy(h.quaternion); p.scale.copy(h.scale); }
  }

  /** Vuelve a la composición original con un tween (posición, rotación por slerp y escala). */
  restore(duration = .9, { ease = "expo.out", stagger = .025, onComplete } = {}) {
    this._rt?.kill(); const tl = this._rt = gsap.timeline({ onComplete });
    this.pieces.forEach((p, i) => {
      const h = p.userData.home, q0 = p.quaternion.clone(), k = { t: 0 };
      gsap.killTweensOf(p.position); gsap.killTweensOf(p.scale);
      tl.to(p.position, { x: h.position.x, y: h.position.y, z: h.position.z, duration, ease }, i * stagger)
        .to(p.scale, { x: h.scale.x, y: h.scale.y, z: h.scale.z, duration, ease }, i * stagger)
        .to(k, { t: 1, duration, ease, onUpdate: () => p.quaternion.slerpQuaternions(q0, h.quaternion, k.t) }, i * stagger);
    });
    return tl;
  }

  /** Máximo desvío (posición, rotación, escala) respecto de la composición original. Sirve para verificar restauraciones. */
  homeError() {
    let e = 0;
    for (const p of this.pieces) { const h = p.userData.home; e = Math.max(e, p.position.distanceTo(h.position), 1 - Math.abs(p.quaternion.dot(h.quaternion)), p.scale.distanceTo(h.scale)); }
    return e;
  }

  destroy() {
    this._rt?.kill(); this._tweens.forEach((t) => t.kill()); gsap.killTweensOf(this.pieces);
    this.meshes.forEach((m) => m.material.dispose());       // la geometría y la textura pertenecen al asset compartido
    this.group.removeFromParent(); this.meshes = []; this.pieces = [];
  }
}
