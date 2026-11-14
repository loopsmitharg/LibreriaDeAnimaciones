/*
 * Prueba de humo para Playwright (MCP: browser_run_code_unsafe con `filename`, o pegando la función en un test).
 * Requiere el servidor estático en :5511 (ver README). Guarda capturas en previews/verify/ y devuelve un informe:
 *   - despiece: carga, errores, residuo de transformación en 0 / 25 / 50 / 75 / 100 % bajando y subiendo (misma pose = mismo progreso)
 *   - carrera: continuidad del loop, piso (sin penetración), controles, sincronía de la velocidad
 *   - limpieza: destroy() deja 0 canvas y 0 nodos propios
 */
async (page) => {
  const base = "http://localhost:5511/animaciones/sneaker-3d/", out = "D:/Git/LibreriaDeAnimaciones/animaciones/sneaker-3d/previews/verify/", res = {}, errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text())); page.on("pageerror", (e) => errs.push(String(e))); page.on("response", (r) => r.status() >= 400 && errs.push(r.status() + " " + r.url()));
  const shot = (n) => page.screenshot({ path: `${out}${n}.jpg`, type: "jpeg", quality: 84 });
  await page.setViewportSize({ width: 1440, height: 810 });

  // ── despiece por scroll ──
  await page.goto(base + "embed.html?exp=exploded&quality=high"); await page.waitForFunction(() => window.__ready, null, { timeout: 40000 });
  const scrollTo = async (p) => { await page.evaluate((p) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p), p); await page.waitForTimeout(1800); };
  const state = () => page.evaluate(() => ({ p: +__exp.progress.toFixed(4), ...__exp.residual(), poses: __exp.parts.map((x) => x.o.position.toArray().map((v) => +v.toFixed(5)).join()).join("|") }));
  const down = {}, up = {};
  for (const p of [0, .25, .5, .75, 1]) { await scrollTo(p); down[p] = await state(); await shot(`exploded-${p * 100}`); }
  for (const p of [.75, .5, .25, 0]) { await scrollTo(p); up[p] = await state(); }
  res.exploded = {
    stats: await page.evaluate(() => __exp.stage.stats()), parts: await page.evaluate(() => __exp.parts.length),
    residual: { start: [down[0].d, down[0].a], end: [down[1].d, down[1].a], backToStart: [up[0].d, up[0].a] },
    sameGoingUp: [.25, .5, .75].map((p) => down[p].poses === up[p].poses), progress: Object.values(down).map((s) => s.p),
  };
  await page.evaluate(() => document.querySelector("#off").click());
  res.exploded.afterDestroy = await page.evaluate(() => ({ canvas: document.querySelectorAll("canvas").length, nodes: document.querySelector("#box").childElementCount }));

  // ── par corriendo ──
  await page.goto(base + "embed.html?exp=running&quality=high"); await page.waitForFunction(() => window.__ready, null, { timeout: 40000 });
  res.running = await page.evaluate(async () => {
    const r = __exp, P = r.pose, keys = ["x", "y", "pitch", "flex", "heel", "fore", "bow"]; let minY = 1e9, maxFlex = 0, maxHeel = 0, maxFore = 0, step = 0;
    for (let i = 0; i < 1000; i++) { const a = P(i / 1000), b = P((i + 1) / 1000); minY = Math.min(minY, a.y); maxFlex = Math.max(maxFlex, a.flex); maxHeel = Math.max(maxHeel, a.heel); maxFore = Math.max(maxFore, a.fore); step = Math.max(step, Math.hypot(b.x - a.x, b.y - a.y)); }
    const wait = (ms) => new Promise((k) => setTimeout(k, ms)), click = (s) => document.querySelector(s).click();
    r.reset(); const paused = r.state.playing === false && r.state.phase === 0;
    click("[data-a=toggle]"); await wait(1000); const ph1 = r.state.phase; click("[data-a=toggle]"); const p0 = r.state.phase; await wait(400); const stays = r.state.phase === p0;
    r.setSpeed(2); r.play(); await wait(1000); const ph2 = r.state.phase - p0; r.pause();
    click("[data-a=replay]"); await wait(200); const replay = r.state.playing && r.state.phase < .8; click("[data-a=reset]");
    return { loopJump: Math.max(...keys.map((k) => Math.abs(P(.999999)[k] - P(.000001)[k]))), minHeight: minY, maxStepPerMilliCycle: step, maxFlexDeg: maxFlex * 57.3, heelMm: maxHeel * 1000, foreMm: maxFore * 1000,
      opposite: Math.abs(P(.1).x - P(.6).x) > .1, controls: { paused, playAdvances: ph1 > .5, pauseHolds: stays, speed2xRatio: +(ph2 / ph1).toFixed(2), replay, reset: r.state.phase === 0 && r.state.speed === 1 }, stats: r.stage.stats() };
  });
  for (const ph of [0, .16, .33, .5, .75]) { await page.evaluate((p) => { __exp.pause(); __exp.setPhase(p); }, ph); await page.waitForTimeout(500); await shot(`running-${Math.round(ph * 100)}`); }
  await page.evaluate(() => document.querySelector("#off").click());
  res.running.afterDestroy = await page.evaluate(() => ({ canvas: document.querySelectorAll("canvas").length, nodes: document.querySelector("#box").childElementCount }));

  // ── página completa + responsive ──
  for (const [n, w, h] of [["page-desktop", 1440, 810], ["page-mobile", 390, 844]]) {
    await page.setViewportSize({ width: w, height: h }); await page.goto(base + "index.html"); await page.waitForFunction(() => window.__exploded, null, { timeout: 40000 }); await page.waitForTimeout(1200); await shot(n + "-hero");
    await page.evaluate(() => window.scrollTo(0, (document.querySelector(".sn-track").offsetHeight - innerHeight) * .57)); await page.waitForTimeout(2000); await shot(n + "-exploded");
    await page.evaluate(() => document.querySelector("#running").scrollIntoView()); await page.waitForFunction(() => window.__running, null, { timeout: 40000 }); await page.waitForTimeout(1500); await shot(n + "-running");
    res[n] = { overflowX: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), fps: await page.evaluate(() => [__exploded.stage.stats().fps, __running.stage.stats().fps]) };
  }
  res.errors = errs;
  return res;
}
