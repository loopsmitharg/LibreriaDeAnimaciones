/**
 * Escenario: renderer + escena + cámara sobre cualquier contenedor. Un renderer por experiencia.
 * Se pausa fuera de pantalla, ajusta el pixel ratio si caen los fps y libera toda la GPU en dispose().
 */
import * as THREE from "three";
import { studioEnvironment, addLights } from "./lighting.js";

export const quality = (() => {
  const force = new URLSearchParams(location.search).get("quality");          // ?quality=low | high
  const touch = matchMedia("(pointer: coarse)").matches;
  const low = force ? force === "low" : touch || Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
  return { low, pixelRatio: Math.min(devicePixelRatio || 1, low ? 1.5 : 2), shadowMap: low ? 1024 : 2048 };
})();
export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createStage(host, { fov = 28 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(quality.pixelRatio); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05; renderer.setClearColor(0, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement; canvas.className = "sn-canvas"; host.append(canvas);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(fov, 1, .02, 30);
  const env = studioEnvironment(renderer); scene.environment = env; scene.environmentIntensity = .85;
  const lights = addLights(scene, quality.shadowMap);

  const frames = new Set(), kills = [];
  const st = {
    host, canvas, renderer, scene, camera, lights, quality, width: 1, height: 1, aspect: 1, fps: 60, visible: true, disposed: false,
    /** fn(dt, t) en cada cuadro visible. */
    onFrame(fn) { frames.add(fn); return () => frames.delete(fn); },
    /** Cámara orbital: objetivo + azimut (0 = lateral, + hacia la punta) + elevación + distancia. Si el contenedor es más angosto que `fitAspect`, se aleja para que el encuadre entre a lo ancho. */
    look(tx, ty, tz, az, el, dist, fitAspect = 1.45) {
      const d = dist * Math.max(1, fitAspect / st.aspect), ce = Math.cos(el);
      camera.position.set(tx + d * ce * Math.sin(az), ty + d * Math.sin(el), tz + d * ce * Math.cos(az)); camera.lookAt(tx, ty, tz);
    },
    resize() {
      const w = host.clientWidth || 1, h = host.clientHeight || 1; st.width = w; st.height = h; st.aspect = w / h;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); st.onResize?.();
    },
    stats() { const i = renderer.info; return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, fps: Math.round(st.fps), pixelRatio: renderer.getPixelRatio() }; },
    dispose() {
      cancelAnimationFrame(raf); kills.forEach((k) => k.disconnect()); frames.clear();
      scene.traverse((o) => {
        if (o.isLight) o.shadow?.map?.dispose();
        if (!o.isMesh) return;
        o.geometry.dispose(); o.skeleton?.dispose();
        for (const m of [].concat(o.material)) { for (const v of Object.values(m)) v?.isTexture && v.dispose(); m.dispose(); }
      });
      env.dispose(); scene.clear(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); st.disposed = true;
    },
  };
  const ro = new ResizeObserver(() => st.resize()); ro.observe(host);
  const io = new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; }); io.observe(host); kills.push(ro, io);

  let last = performance.now(), time = 0, slow = 0, raf = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const raw = (now - last) / 1000; last = now;
    if (!st.visible || document.hidden) return;                               // fuera de pantalla: ni simula ni dibuja
    const dt = Math.min(raw, 1 / 20); time += dt; st.fps += (1 / Math.max(raw, 1e-3) - st.fps) * .05;
    for (const fn of frames) fn(dt, time);
    renderer.render(scene, camera);
    if (st.fps < 38 && time > 2) { if (++slow > 90 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - .25)); st.resize(); slow = 0; } } else slow = 0;
  };
  st.resize(); raf = requestAnimationFrame(loop);
  return st;
}
export { THREE };
