/**
 * Escenario base: UN renderer por escena activa, cámara, entorno de estudio procedural (PMREM), tres rigs de luz,
 * puntero + raycaster, bucle con dt acotado, pausa fuera de pantalla, calidad adaptable y limpieza de GPU.
 *
 * Color: texturas de color en sRGB, datos (normal/ORM) lineales, salida sRGB con tone mapping ACES.
 * En Blender los renders de verificación usan la vista "Standard"; la exposición de cada rig se ajustó acá a ojo contra esos renders.
 */
import * as THREE from "three";

const gsap = window.gsap;
export const isTouch = matchMedia("(pointer: coarse)").matches;
export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const quality = (() => {
  const force = new URLSearchParams(location.search).get("quality");          // ?quality=low | high
  const low = force ? force === "low" : isTouch || Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
  return { low, pixelRatio: Math.min(devicePixelRatio || 1, low ? 1.5 : 2), shadowMap: low ? 1024 : 2048, count: (n) => Math.round(n * (low ? .5 : 1)) };
})();

/** Rigs de luz. key/fill/rim: [x, y, z, intensidad]; env = intensidad del entorno; exp = exposición. */
export const RIGS = {
  soft: { label: "Soft Studio", env: .8, exp: .9, key: [-2.5, 4, 4, 1.3], fill: [3.5, 1, 3, .4], rim: [0, 2.5, -4, .6] },
  side: { label: "Dramatic Side Light", env: .1, exp: 1, key: [-6, .9, 1.1, 3.2], fill: [4, 1, 3, .05], rim: [3, 2, -4, .5] },
  back: { label: "Cinematic Backlight", env: .14, exp: 1, key: [1.2, 2.6, -5, 4.2], fill: [-2, -1, 4, .2], rim: [-4.5, 1.5, -1.5, 1.2] },
};

/** Cuarto oscuro y cálido con softboxes: reflejos reales sobre el aceite del grano sin descargar un HDRI. */
function studioEnvironment(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), new THREE.MeshBasicMaterial({ color: 0x241c16, side: THREE.BackSide })));
  const box = (w, h, x, y, z, color, power, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); };
  box(12, 6, 0, 6.8, 1, 0xfff1dc, 7, 0, Math.PI / 2);          // softbox cenital cálido
  box(2, 9, -10, 1, 2, 0xffe2bd, 8, Math.PI / 2);                // tira lateral izquierda
  box(2, 8, 10, 1, -2, 0xcfe0ff, 4, Math.PI / 2);                // tira derecha fría (separa el borde)
  box(14, 3, 0, 0, -11, 0xfff4e6, 3.5);                           // panel trasero bajo
  box(16, 8, 0, 2, 11, 0xffffff, 1.6, Math.PI);                  // relleno frontal
  const pm = new THREE.PMREMGenerator(renderer), tex = pm.fromScene(s, .04).texture; pm.dispose();
  s.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return tex;
}

export function createStage(host, { fov = 32, shadows = false, rig = "soft" } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: !quality.low, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(quality.pixelRatio); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0, 0);
  const canvas = renderer.domElement; canvas.className = "c3-canvas"; host.append(canvas);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(fov, 1, .02, 120); camera.position.set(0, 0, 8);
  scene.environment = studioEnvironment(renderer);
  const mk = (color) => { const l = new THREE.DirectionalLight(color, 1); scene.add(l, l.target); return l; };
  const lights = { key: mk(0xfff1df), fill: mk(0xdfe8ff), rim: mk(0xffe8cf) };
  const useShadows = shadows && !(quality.low && isTouch);
  if (useShadows) {
    const k = lights.key; k.castShadow = true; k.shadow.mapSize.set(quality.shadowMap, quality.shadowMap); k.shadow.bias = -.0005; k.shadow.normalBias = .03;
    Object.assign(k.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: .5, far: 40 }); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const ac = new AbortController(), updates = new Set(), disposables = [scene.environment], kills = [];
  const pointer = new THREE.Vector2(0, 0); Object.assign(pointer, { inside: false, down: false });
  const st = {
    host, canvas, renderer, scene, camera, lights, pointer, raycaster: new THREE.Raycaster(), quality, shadows: useShadows,
    time: 0, dt: 0, paused: false, rig, fps: 60, width: 1, height: 1,
    on(target, type, fn, opts) { target.addEventListener(type, fn, { ...opts, signal: ac.signal }); },
    own(...o) { disposables.push(...o); return o[0]; },
    keep(k) { kills.push(k); return k; },
    tick(fn) { updates.add(fn); return fn; },
    readPointer(e) { const r = canvas.getBoundingClientRect(); pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)); },
    /** Cambia de rig con una transición (duración 0 = inmediato). */
    setRig(name, dur = .9) {
      const R = RIGS[name] || RIGS.soft; st.rig = name;
      for (const k of ["key", "fill", "rim"]) { const [x, y, z, i] = R[k]; gsap.to(lights[k].position, { x, y, z, duration: dur, ease: "power2.inOut", overwrite: true }); gsap.to(lights[k], { intensity: i, duration: dur, overwrite: true }); }
      gsap.to(scene, { environmentIntensity: R.env, duration: dur, overwrite: true }); gsap.to(renderer, { toneMappingExposure: R.exp, duration: dur, overwrite: true });
    },
    /** Piso que solo recibe sombra: el fondo sigue siendo CSS. */
    addFloor(y = 0, opacity = .38) { const f = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity })); f.rotation.x = -Math.PI / 2; f.position.y = y; f.receiveShadow = true; scene.add(f); disposables.push(f.geometry, f.material); return f; },
    resize() { const w = host.clientWidth || 1, h = host.clientHeight || 1; st.width = w; st.height = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); st.onResize?.(w, h); },
    render() { (st.renderOverride || (() => renderer.render(scene, camera)))(); },
    stats() { const i = renderer.info; return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, fps: Math.round(st.fps), pixelRatio: renderer.getPixelRatio() }; },
    dispose() {
      gsap.ticker.remove(loop); ac.abort(); updates.clear(); kills.forEach((k) => (k.kill ? k.kill() : k.disconnect?.()));
      [lights.key.position, lights.fill.position, lights.rim.position, lights.key, lights.fill, lights.rim, scene, renderer].forEach((t) => gsap.killTweensOf(t));
      scene.traverse((o) => { if (o.isLight) o.shadow?.map?.dispose(); if (o.isInstancedMesh) o.dispose(); });
      disposables.forEach((d) => d?.dispose?.()); scene.clear(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); st.disposed = true;
    },
  };
  st.setRig(rig, 0);

  st.on(canvas, "pointermove", (e) => { st.readPointer(e); pointer.inside = true; });
  st.on(canvas, "pointerdown", (e) => { st.readPointer(e); pointer.down = true; pointer.inside = true; });
  st.on(window, "pointerup", () => { pointer.down = false; });
  st.on(canvas, "pointerleave", () => { pointer.inside = false; });
  const ro = new ResizeObserver(() => st.resize()); ro.observe(host); kills.push(ro);
  let visible = true; const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(host); kills.push(io);

  let last = performance.now(), slow = 0;
  function loop() {
    const now = performance.now(), raw = (now - last) / 1000; last = now;
    if (!visible || document.hidden) return;                                  // fuera de pantalla: no simula ni dibuja
    const dt = Math.min(raw, 1 / 20); st.dt = dt; st.fps += (1 / Math.max(raw, 1e-3) - st.fps) * .05;
    if (!st.paused) { st.time += dt; for (const fn of updates) fn(dt, st.time); }
    st.render();
    // Calidad adaptable: si los fps se caen sostenidamente, baja el pixel ratio un escalón (nunca toca las texturas).
    if (st.fps < 38 && st.time > 2) { if (++slow > 90 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - .25)); st.resize(); slow = 0; } } else slow = 0;
  }
  st.resize(); gsap.ticker.add(loop);
  return st;
}

export { THREE, gsap };
