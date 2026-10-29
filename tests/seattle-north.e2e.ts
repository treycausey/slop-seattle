import assert from "node:assert/strict";
import { openChrome, spawnServer, minimalEnv } from "@treycausey/kit/e2e";
import { DESTINATIONS, BOUNDS } from "../js/seattle-config.js";
const root = new URL("..", import.meta.url).pathname;
const server = await spawnServer({
  argv: (port) => [
    "uv",
    "run",
    "python",
    "-c",
    `from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler; ThreadingHTTPServer.request_queue_size=128; ThreadingHTTPServer(('127.0.0.1',${port}),SimpleHTTPRequestHandler).serve_forever()`,
  ],
  cwd: root,
  env: minimalEnv(["PATH", "HOME", "UV_CACHE_DIR"]),
  healthPath: "/index.html",
});
const chrome = await openChrome({
  viewport: { width: 1440, height: 1000 },
  allowHosts: ["127.0.0.1", "cdn.jsdelivr.net"],
});
const page = chrome.page,
  errors = [],
  requests = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("503")) errors.push(m.text());
});
page.on("request", (r) => requests.push(r.url()));
const state = () => page.evaluate(() => window.slopSeattle.getState());
const visit = async (id) => {
  await page.locator("#places-button").click();
  await page.locator(`[data-destination="${id}"]`).click();
  const d = DESTINATIONS.find((d) => d.id === id);
  await page.waitForFunction(
    (name) =>
      window.slopSeattle.getState().camera === "landmark" &&
      document.getElementById("location-label").textContent === name,
    d.name,
    { timeout: 60000 },
  );
  await page.waitForFunction(
    () => !window.slopSeattle.getState().streaming.busy,
  );
  return state();
};
try {
  await page.goto(
    server.url + (process.env.E2E_BACKEND === "webgl" ? "/?webgl" : ""),
    { waitUntil: "networkidle" },
  );
  await page.waitForSelector('body[data-ready="true"]', { timeout: 120000 });
  const boot = await state();
  assert.equal(boot.streaming.resident, 0);
  assert.ok(
    !requests.some((u) => /\/-?\d+_-?\d+\.json.gz/.test(u)),
    "no full north tiles downloaded at boot",
  );
  await page.evaluate(() => {
    window.northLongTasks = [];
    new PerformanceObserver((list) =>
      window.northLongTasks.push(...list.getEntries().map((e) => e.duration)),
    ).observe({ type: "longtask" });
  });
  let injected = false;
  await page.route("**/seattle-north/*.json.gz", async (route) => {
    if (!injected && /\/-?\d+_-?\d+\.json.gz$/.test(route.request().url())) {
      injected = true;
      await route.fulfill({ status: 503, body: "test: neighborhood offline" });
    } else await route.continue();
  });
  await page.locator("#places-button").click();
  await page.locator('[data-destination="troll"]').click();
  await page.waitForFunction(() =>
    document.getElementById("travel-status").textContent.includes("503"),
  );
  const failed = await state();
  assert.ok(
    Math.hypot(failed.x - boot.x, failed.z - boot.z) < 1,
    "failed travel preserves position",
  );
  await page.locator('[data-destination="troll"]').click();
  await page.waitForFunction(
    () =>
      window.slopSeattle.getState().camera === "landmark" &&
      document.getElementById("location-label").textContent === "Fremont Troll",
    null,
    { timeout: 60000 },
  );
  assert.equal(
    await page.locator("#travel-status").isVisible(),
    false,
    "successful retry clears failure state",
  );
  await page.unroute("**/seattle-north/*.json.gz");
  const cdp = await chrome.context.newCDPSession(page),
    rounds = [],
    buildTimes = [];
  for (let round = 0; round < 2; round++) {
    for (const id of [
      "greenwood",
      "gardens",
      "greenlake",
      "gasworks",
      "locks",
      "shepherd",
      "ballard",
      "troll",
    ]) {
      const s = await visit(id);
      assert.ok(s.streaming.resident <= 4);
      assert.ok(s.streaming.buildings < 9500);
      assert.ok(s.visuals.details.instanceBytes <= 884736);
      assert.ok(s.visuals.meshes < 1000);
      assert.ok(s.visuals.triangles < 3000000);
      assert.equal(s.streaming.error, null);
      buildTimes.push(s.streaming.lastBuildMs);
    }
    await page.waitForFunction(
      () => window.slopSeattle.getState().visuals.details.tiles === 9,
      null,
      { timeout: 15000 },
    );
    await cdp.send("HeapProfiler.collectGarbage");
    const heap = await cdp.send("Runtime.getHeapUsage");
    rounds.push({ state: await state(), heapBytes: heap.usedSize });
  }
  const first = rounds[0].state.gpu,
    last = rounds[1].state.gpu;
  for (const key of [
    "geometries",
    "indexAttributes",
    "programs",
    "textures",
    "texturesSize",
  ])
    assert.equal(last[key], first[key], `stable ${key}`);
  // Previously unused bins in the fixed 54-mesh detail pool acquire GPU buffers lazily.
  // This bound rejects the reproduced +1,125 uniform-buffer leak from evicted regions.
  assert.ok(
    last.uniformBuffers <= first.uniformBuffers + 54,
    "uniform buffers stay within the fixed detail pool",
  );
  assert.ok(
    last.total <= first.total + 884736 + 54 * 256,
    "GPU growth stays within the existing detail pool capacity",
  );
  assert.ok(
    rounds[1].heapBytes < rounds[0].heapBytes + 12 * 1024 * 1024,
    `revisit heap growth ${rounds[1].heapBytes - rounds[0].heapBytes}`,
  );
  // Ground mode exercises arrival and movement after data/collider replacement.
  await page.locator('button[data-mode="person"]').click();
  const ground = await state();
  await page.keyboard.down("w");
  await page.waitForFunction(
    (p) =>
      Math.hypot(
        window.slopSeattle.getState().x - p.x,
        window.slopSeattle.getState().z - p.z,
      ) > 2,
    ground,
    { timeout: 15000 },
  );
  await page.keyboard.up("w");
  const frames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const samples = [],
          step = (now) => {
            samples.push(now);
            if (samples.length < 121) requestAnimationFrame(step);
            else
              resolve(
                samples
                  .slice(1)
                  .map((v, i) => v - samples[i])
                  .sort((a, b) => a - b),
              );
          };
        requestAnimationFrame(step);
      }),
  );
  const longTasks = await page.evaluate(() => window.northLongTasks);
  assert.deepEqual(errors, []);
  assert.deepEqual(chrome.blocked, []);
  assert.ok(
    !requests.some((u) => /\.(png|jpe?g|webp|gltf|glb|obj)(\?|$)/.test(u)),
  );
  await page.screenshot({
    path: `${root}/tmp/codex-north-walk-${process.env.E2E_BACKEND ?? "webgpu"}.png`,
  });
  console.log(
    JSON.stringify({
      result: "PASS",
      backend: process.env.E2E_BACKEND ?? "webgpu",
      bootMs: boot.startupMs,
      rounds: rounds.map((r) => ({
        heapBytes: r.heapBytes,
        gpu: r.state.gpu,
        streaming: r.state.streaming,
        meshes: r.state.visuals.meshes,
        triangles: r.state.visuals.triangles,
        details: r.state.visuals.details,
      })),
      tileBuildElapsedMs: buildTimes,
      frameMedianMs: frames[60],
      frameP95Ms: frames[114],
      maxLongTaskMs: Math.max(0, ...longTasks),
      checks: [
        "no north tiles on boot",
        "failed travel and retry",
        "16 streamed visits",
        "bounded GPU and heap",
        "walk after collider replacement",
        "no media downloads",
      ],
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({ errors, state: await state().catch(() => null) }),
  );
  throw error;
} finally {
  await chrome.close();
  await server.stop();
}
