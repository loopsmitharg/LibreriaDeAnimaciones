/**
 * Motor base: renderer, escena, cámara, luces, entorno de estudio, puntero, raycasting, bucle, resize y limpieza.
 *
 * Estrategia de renderers (nunca 24 contextos WebGL):
 *   - Previews de las tarjetas: UN renderer compartido (`previewRenderer`). Cada tarjeta es un Stage en modo `preview`:
 *     se renderiza con setViewport en una esquina del canvas compartido y se copia (drawImage) a un <canvas> 2D de la tarjeta.
 *     Solo se renderizan las tarjetas visibles, a 30 fps como máximo.
 *   - Escena activa (detalle / pantalla completa): su propio renderer, que se destruye al desmontar.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { gsap, ScrollTrigger } from "./gsap.js";

export const isTouch = matchMedia("(pointer: coarse)").matches;
export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Calidad adaptable: pixel ratio, sombras y densidad según el dispositivo. */
export const quality = (() => {
  const small = Math.min(innerWidth, innerHeight) < 700, mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  const force = new URLSearchParams(location.search).get("quality");      // ?quality=high | low fuerza el nivel (pruebas)
  const low = force ? force === "low" : isTouch || small || mem <= 4 || cores <= 4;
  return { low, pixelRatio: Math.min(devicePixelRatio || 1, low ? 1.5 : 2), shadowMap: low ? 0 : 2048 };
})();

/** Entorno de estudio procedural: cuarto oscuro + softboxes. Da reflejos reales a metal y vidrio (no es una imagen plana). */
function studioEnvironment(renderer) {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), new THREE.MeshBasicMaterial({ color: 0x1b2230, side: THREE.BackSide }));
  s.add(room);
  const box = (w, h, x, y, z, color, power, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); return m;
  };
  box(13, 7, 0, 6.8, 2, 0xffffff, 8, 0, Math.PI / 2);               // softbox superior (el reflejo principal)
  box(2.2, 9, -9, 1, 3, 0xf3f6ff, 9, Math.PI / 2);                     // tira izquierda (borde frío)
  box(2.2, 9, 9, 1, -1, 0xd8ff9b, 6, Math.PI / 2);                     // tira derecha, matiz lima (guiño de marca)
  box(12, 3.4, 0, -1, -10, 0xffffff, 4.5);                              // panel trasero bajo
  box(16, 9, 0, 1.5, 11, 0xffffff, 2.2, Math.PI);                      // relleno frontal suave
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.035).texture; pm.dispose();
  s.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return tex;
}

let previewRenderer = null, previewEnv = null;
function sharedPreviewRenderer() {
  if (previewRenderer) return previewRenderer;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  r.setPixelRatio(1); r.setSize(640, 400, false); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = .82; r.outputColorSpace = THREE.SRGBColorSpace;
  r.setClearColor(0x000000, 0); r.domElement.className = "ls-shared-gl";
  return (previewRenderer = r);
}

export class Stage {
  /**
   * @param host      elemento contenedor (define el tamaño)
   * @param opts.preview    true: render compartido + copia a canvas 2D
   * @param opts.shadows    activa sombras (solo escenas con piso)
   * @param opts.scroller   elemento con scroll propio (escenas de scroll)
   */
  constructor(host, { preview = false, shadows = false, fov = 30, scroller = null, interactive = true } = {}) {
    this.host = host; this.preview = preview; this.scroller = scroller; this.interactive = interactive;
    this.disposables = []; this.updates = new Set(); this.kept = []; this.running = false; this.visible = true; this.needsRender = true;
    this.ac = new AbortController(); this.continuous = true; this.time = 0; this.dt = 0; this._last = 0;
    this.renderer = preview ? sharedPreviewRenderer() : new THREE.WebGLRenderer({ antialias: !quality.low, alpha: true, powerPreference: "high-performance" });
    if (!preview) {
      const r = this.renderer; r.setPixelRatio(quality.pixelRatio); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = .82; r.outputColorSpace = THREE.SRGBColorSpace; r.setClearColor(0x000000, 0);
      this.canvas = r.domElement; this.canvas.className = "ls-canvas"; host.append(this.canvas);
    } else { this.canvas = document.createElement("canvas"); this.canvas.className = "ls-canvas"; host.append(this.canvas); this.ctx = this.canvas.getContext("2d"); }
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 80); this.camera.position.set(0, 0, 7);
    this.target = new THREE.Vector3(); this.scene.environment = preview ? (previewEnv ??= studioEnvironment(this.renderer)) : studioEnvironment(this.renderer); this.scene.environmentIntensity = .75;
    if (!preview) this.disposables.push(this.scene.environment);      // el entorno de los previews es uno solo, compartido por todas las tarjetas
    this._lights(shadows && !preview && quality.shadowMap > 0);
    this.pointer = { x: 0, y: 0, nx: 0, ny: 0, vx: 0, vy: 0, down: false, inside: false, t: 0, button: 0 };
    this.raycaster = new THREE.Raycaster();
    this._bind(); this.resize();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host); this.kept.push({ kill: () => this.ro.disconnect() });
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (this.visible) this.needsRender = true; }); this.io.observe(host); this.kept.push({ kill: () => this.io.disconnect() });
    this._tick = this._tick.bind(this);
  }

  _lights(shadows) {
    const key = new THREE.DirectionalLight(0xfff4e6, 1.7); key.position.set(-3.2, 5, 6); this.key = key;
    const rim = new THREE.DirectionalLight(0xd8ff9b, 1.9); rim.position.set(5, 2.5, -4);
    const fill = new THREE.DirectionalLight(0xbfd2ff, .35); fill.position.set(4, -1, 5);
    this.scene.add(key, rim, fill, key.target);
    if (shadows) {
      key.castShadow = true; key.shadow.mapSize.set(quality.shadowMap, quality.shadowMap); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
      Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 24 });
      this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.shadows = true;
    }
  }

  /** Suelo que solo recibe sombra (el fondo sigue siendo el del CSS). */
  addFloor(y = -1, size = 40) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(size, size), this.shadows ? new THREE.ShadowMaterial({ opacity: .42 }) : new THREE.MeshBasicMaterial({ visible: false }));
    f.rotation.x = -Math.PI / 2; f.position.y = y; f.receiveShadow = true; this.scene.add(f); this.disposables.push(f.geometry, f.material); return f;
  }

  own(...objs) { this.disposables.push(...objs); return objs[0]; }
  keep(x) { this.kept.push(x); return x; }
  on(target, type, fn, opts) { target.addEventListener(type, fn, { ...opts, signal: this.ac.signal }); }

  _bind() {
    const el = this.preview ? this.host : this.canvas, p = this.pointer;
    const read = (e) => {
      const r = el.getBoundingClientRect(), now = performance.now(), dt = Math.max(1, now - p.t);
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
      if (p.inside && dt < 120) { p.vx += ((nx - p.nx) / dt * 1000 - p.vx) * .4; p.vy += ((ny - p.ny) / dt * 1000 - p.vy) * .4; }
      p.nx = nx; p.ny = ny; p.x = e.clientX - r.left; p.y = e.clientY - r.top; p.t = now; p.inside = true; this.needsRender = true;
    };
    if (!this.interactive) return;
    this.on(el, "pointermove", read);
    this.on(el, "pointerdown", (e) => { read(e); p.down = true; p.button = e.button; this.needsRender = true; });
    this.on(window, "pointerup", () => { p.down = false; });
    this.on(el, "pointerleave", () => { p.inside = false; p.vx = p.vy = 0; });
    this.on(el, "pointercancel", () => { p.inside = false; p.down = false; });
  }

  /** Raycaster desde el puntero (o desde coordenadas NDC). */
  ray(nx = this.pointer.nx, ny = this.pointer.ny) { this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera); return this.raycaster; }

  /** Punto del rayo del puntero sobre un plano (por defecto perpendicular a la cámara y que pasa por `through`). */
  pointerOnPlane(plane, nx = this.pointer.nx, ny = this.pointer.ny, out = new THREE.Vector3()) { return this.ray(nx, ny).ray.intersectPlane(plane, out); }
  cameraPlane(through) { const n = new THREE.Vector3(); this.camera.getWorldDirection(n); return new THREE.Plane().setFromNormalAndCoplanarPoint(n, through); }

  resize() {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h; this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.preview) { const pr = Math.min(2, devicePixelRatio || 1, 1.25), cw = w * pr, ch = h * pr, k = Math.min(1, 640 / cw, 400 / ch); this.canvas.width = Math.round(cw * k); this.canvas.height = Math.round(ch * k); }
    else this.renderer.setSize(w, h, false), this.canvas.style.width = "100%", this.canvas.style.height = "100%";
    this.needsRender = true; this.onResize?.(w, h);
  }

  /** Encuadre estándar del logo: distancia para que el ancho `width` y el alto `height` entren con margen. */
  frame(width = 4.3, height = 1.9) {
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const d = Math.max(width / (2 * tan * this.camera.aspect), height / (2 * tan));
    this.home = { position: new THREE.Vector3(0, 0, d), target: new THREE.Vector3() };
    this.camera.position.copy(this.home.position); this.target.copy(this.home.target); this.camera.lookAt(this.target); return d;
  }

  look() { this.camera.lookAt(this.target); }

  /** Registra una función por frame: fn(dt, t). Devuelve la función para quitarla con `off`. */
  add(fn) { this.updates.add(fn); this.needsRender = true; return fn; }
  off(fn) { this.updates.delete(fn); }
  invalidate() { this.needsRender = true; }

  start() { if (!this.running) { this.running = true; this._last = performance.now(); gsap.ticker.add(this._tick); } return this; }
  stop() { if (this.running) { this.running = false; gsap.ticker.remove(this._tick); } return this; }

  _tick() {
    const now = performance.now(); let dt = Math.min((now - this._last) / 1000, 1 / 20); this._last = now;
    if (!this.visible || document.hidden) return;
    if (this.preview) { this._acc = (this._acc || 0) + dt; if (this._acc < 1 / 30) return; dt = this._acc; this._acc = 0; }
    this.dt = dt; this.time += dt;
    for (const fn of this.updates) fn(dt, this.time);
    if (!this.continuous && !this.needsRender) return;       // escenas en reposo no gastan GPU
    this.render();
  }

  render() {
    const r = this.renderer;
    if (this.preview) {
      const w = this.canvas.width, h = this.canvas.height;
      r.setViewport(0, 0, w, h); r.setScissorTest(true); r.setScissor(0, 0, w, h); r.clear(); r.render(this.scene, this.camera); r.setScissorTest(false);
      this.ctx.clearRect(0, 0, w, h); this.ctx.drawImage(r.domElement, 0, r.domElement.height - h, w, h, 0, 0, w, h);
    } else r.render(this.scene, this.camera);
    this.frames = (this.frames || 0) + 1; this.needsRender = false;
  }

  stats() { const i = this.renderer.info; return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length ?? 0 }; }

  /** Libera todo lo que creó la escena. Los assets compartidos (geometrías/texturas del GLB) NO se tocan. */
  destroy() {
    this.stop(); this.ac.abort(); this.updates.clear();
    this.kept.forEach((k) => (k.kill ? k.kill() : k.disconnect?.())); this.kept = [];
    this.scene.traverse((o) => { if (o.isLight) o.shadow?.map?.dispose(); });
    this.disposables.forEach((d) => d?.dispose?.()); this.disposables = [];
    this.canvas.remove();
    if (!this.preview) { this.renderer.dispose(); this.renderer.forceContextLoss(); }
    this.scene.clear(); this.destroyed = true;
  }
}

export { THREE, gsap, ScrollTrigger };
