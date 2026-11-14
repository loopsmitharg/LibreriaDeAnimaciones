/*
 * Prueba de humo para Playwright (MCP: browser_run_code_unsafe con `filename`, o pegando la función en un test).
 * Monta cada escena de LIST, junta errores de consola / red y guarda una captura en assets/previews/verify/.
 * LIST: [id, esperaMs, progresoDeScroll?]. Requiere el servidor estático en :5511 (ver README).
 */
async (page) => {
  await page.route("**/*", (r) => r.continue());                              // sin caché HTTP: siempre el código actual
  const LIST = [["bean-playground"], ["coffee-rain", 9000], ["magnetic-coffee"], ["physics-bowl", 5000], ["zero-gravity"], ["macro-inspection"], ["coffee-explosion", 1800, .6], ["coffee-vortex", 1800, .45], ["coffee-tunnel", 1800, .4], ["scroll-assembly", 2000, 1], ["macro-journey", 2500, .5], ["cinematic-storytelling", 2500, .42], ["slow-motion-drop", 3200], ["bean-orbit"], ["coffee-spiral"], ["coffee-burst", 3600], ["coffee-wave"], ["infinite-flow"], ["roast-transformation", 6500], ["material-laboratory"], ["product-hero"], ["coffee-swarm", 3000], ["gravity-switch"], ["ultimate-experience", 3000, .83]];
  const out = "D:/Git/LibreriaDeAnimaciones/animaciones/coffee-3d/assets/previews/verify/", res = {}, errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text())); page.on("pageerror", (e) => errs.push(String(e))); page.on("response", (r) => r.status() >= 400 && errs.push(r.status() + " " + r.url()));
  for (const [id, wait, prog] of LIST) {
    errs.length = 0;
    await page.goto(`http://localhost:5511/animaciones/coffee-3d/scene.html?id=${id}`);
    try { await page.waitForFunction(() => window.__ready, null, { timeout: 20000 }); } catch { res[id] = ["NO READY", ...errs]; continue; }
    if (prog != null) await page.evaluate((p) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p), prog);
    await page.waitForTimeout(wait || 2500);
    await page.screenshot({ path: `${out}scene-${id}${prog != null ? "-" + Math.round(prog * 100) : ""}.jpg`, type: "jpeg", quality: 82 });
    res[id + (prog != null ? "@" + prog : "")] = [await page.evaluate(() => JSON.stringify(window.__scene.stage.stats())), ...errs];
  }
  return res;
}
