import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { openChrome, spawnServer, minimalEnv } from "@treycausey/kit/e2e";
const root = new URL("..", import.meta.url).pathname;
mkdirSync(`${root}/tmp`, { recursive: true });
const server = await spawnServer({
  argv: (port) => ["uv", "run", "python", "-c", `from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler; ThreadingHTTPServer.request_queue_size=128; ThreadingHTTPServer(('127.0.0.1',${port}),SimpleHTTPRequestHandler).serve_forever()`],
  cwd: root,
  env: minimalEnv(["PATH", "HOME", "UV_CACHE_DIR"]),
  healthPath: "/index.html",
});
const chrome = await openChrome({
  viewport: { width: 1440, height: 1000 },
  allowHosts: ["127.0.0.1", "cdn.jsdelivr.net"],
});
const page = chrome.page,
  errors: string[] = [],
  baseline = process.env.DETAIL_BASELINE === "1";
const media: string[] = [];
page.on("request", (r) => {
  if (/\.(png|jpe?g|webp|ktx2?|gltf|glb|obj)(\?|$)/i.test(r.url())) media.push(r.url());
});
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" || m.text().includes("GL_INVALID")) errors.push(m.text());
});
// Expose production objects for measurements, without changing the enabled integration.
await page.route("**/js/seattle-city.js", async (route) => {
  let source = readFileSync(`${root}/js/seattle-city.js`, "utf8");
  assert.ok(source.includes("createSeattleDetails"), "production detail integration is required");
  source = source.replace("const bay =", "window.detailProbe={details,group};const bay =");
  if (baseline) source = source.replace("if (position) details.update(position);", "");
  await route.fulfill({ contentType: "text/javascript", body: source });
});
await page.route("**/js/seattle.js", async (route) => {
  const source = readFileSync(`${root}/js/seattle.js`, "utf8")
    .replace(
      "renderer.render(scene, camera.camera);",
      "window.detailRenderer=renderer;renderer.render(scene, camera.camera);",
    );
  await route.fulfill({ contentType: "text/javascript", body: source });
});
const metrics = async () =>
  page.evaluate(async () => {
    const timings: number[] = [];
    let last = performance.now();
    await new Promise<void>((resolve) => {
      let n = 0;
      const tick = (now: number) => {
        timings.push(now - last);
        last = now;
        if (++n < 90) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    timings.shift();
    timings.sort((a, b) => a - b);
    return {
      frameMedianMs: timings[Math.floor(timings.length * 0.5)],
      frameP95Ms: timings[Math.floor(timings.length * 0.95)],
      frameMaxMs: timings.at(-1),
      details: window.detailProbe.details.stats(),
      gpu: window.detailRenderer.info.memory,
      visuals: window.slopSeattle.getState().visuals,
    };
  });
try {
  const cdp = await chrome.context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await page.goto(server.url + (process.env.E2E_BACKEND === "webgl" ? "/?webgl" : ""), {
    waitUntil: "networkidle",
  });
  await page.waitForSelector('body[data-ready="true"]', { timeout: 120000 });
  if (!baseline) await page.waitForFunction(() => window.detailProbe.details.stats().tiles === 9);
  await cdp.send("HeapProfiler.collectGarbage");
  const heap = async () =>
    (await cdp.send("Performance.getMetrics")).metrics.find((m) => m.name === "JSHeapUsedSize")
      ?.value;
  const initialHeap = await heap(),
    initial = await metrics();
  await page.evaluate(() => {
    window.detailFrames = { count: 0, totalMs: 0, maxMs: 0, over50: 0, running: true };
    let last = performance.now();
    const tick = (now: number) => {
      const s = window.detailFrames;
      if (!s.running) return;
      const dt = now - last;
      last = now;
      s.count++;
      s.totalMs += dt;
      s.maxMs = Math.max(s.maxMs, dt);
      if (dt > 50) s.over50++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const places = ["needle", "market", "wheel", "columbia", "smith", "spheres", "stadium", "lake"];
  const rounds = [];
  for (let round = 0; round < 3; round++) {
    for (const id of places) {
      await page.locator("#places-button").click();
      await page.locator(`[data-destination="${id}"]`).click();
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            let n = 0;
            const tick = () => {
              if (++n === 12) resolve();
              else requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }),
      );
      if (!baseline)
        await page.waitForFunction(() => window.detailProbe.details.stats().tiles === 9);
      if (round === 0)
        await page.screenshot({
          path: `${root}/tmp/detail-${baseline ? "baseline" : "streamed"}-${process.env.E2E_BACKEND ?? "webgpu"}-${id}.png`,
        });
    }
    await cdp.send("HeapProfiler.collectGarbage");
    rounds.push({
      round,
      heap: await heap(),
      gpu: await page.evaluate(() => window.detailRenderer.info.memory),
    });
  }
  // Real Walk/first-person view at the Market supplements the aerial landmark captures.
  await page.locator("#places-button").click();
  await page.locator('[data-destination="market"]').click();
  await page.locator('[data-mode="person"]').click();
  await page.keyboard.press("v");
  await page.keyboard.press("v");
  if (!baseline) await page.waitForFunction(() => window.detailProbe.details.stats().tiles === 9);
  await page.screenshot({
    path: `${root}/tmp/detail-street-${baseline ? "baseline" : "streamed"}-${process.env.E2E_BACKEND ?? "webgpu"}.png`,
  });
  await cdp.send("HeapProfiler.collectGarbage");
  const finalHeap = await heap(),
    final = await metrics();
  const transitions = await page.evaluate(() => {
    window.detailFrames.running = false;
    return window.detailFrames;
  });
  assert.ok(final.details.instanceBytes <= 884736);
  if (!baseline) {
    assert.equal(final.details.capacityTiles, 9);
    assert.ok(final.details.builds > 100);
    // Repeated region eviction must release old source references and reuse existing GPU buffers.
    const lifecycle = await page.evaluate(async () => {
      const d = window.detailProbe.details,
        bytes = d.stats().instanceBytes;
      const data = await (await fetch("./js/seattle-data.json")).json();
      for (let i = 0; i < 12; i++) {
        d.setData(data);
        for (let j = 0; j < 9; j++) d.update({ x: 0, y: 40, z: 0 });
      }
      const reused = d.stats();
      d.setData({ buildings: [], roads: [], parks: [] });
      d.update({ x: 0, y: 40, z: 0 });
      const empty = d.stats();
      d.dispose();
      d.dispose();
      return { bytes, reused, empty, disposed: d.stats() };
    });
    assert.equal(lifecycle.reused.instanceBytes, lifecycle.bytes);
    assert.equal(lifecycle.empty.instances, 0);
    assert.equal(lifecycle.disposed.instanceBytes, 0);
    assert.equal(lifecycle.disposed.indexCells, 0);
    console.log(JSON.stringify({ lifecycle }));
  }
  const startup = await page.evaluate(() => ({
    ready: window.slopSeattle.getState().startupMs,
    compile: window.slopSeattle.getState().shaderCompileMs,
    resources: performance
      .getEntriesByType("resource")
      .reduce((sum, r) => sum + (r as PerformanceResourceTiming).encodedBodySize, 0),
  }));
  assert.deepEqual(errors, []);
  assert.deepEqual(chrome.blocked, []);
  assert.deepEqual(media, []);
  console.log(
    JSON.stringify({
      backend: process.env.E2E_BACKEND ?? "webgpu",
      baseline,
      initialHeap,
      finalHeap,
      heapGrowth: finalHeap - initialHeap,
      rounds,
      transitions,
      initial,
      final,
      startup,
      result: "PASS",
    }),
  );
} finally {
  await chrome.close();
  await server.stop();
}
