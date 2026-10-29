import assert from "node:assert/strict";
import { openChrome, spawnServer, minimalEnv } from "@treycausey/kit/e2e";
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
  if (m.type() === "error" || m.text().includes("GL_INVALID"))
    errors.push(m.text());
});
page.on("request", (r) => requests.push(r.url()));
const state = () => page.evaluate(() => window.slopSeattle.getState());
const frames = async (n = 60) =>
  page.evaluate(
    (n) =>
      new Promise((resolve) => {
        let count = 0;
        function step() {
          if (++count >= n) resolve(null);
          else requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }),
    n,
  );
const mode = async (key) => {
  await page.keyboard.press(key);
  await page.waitForFunction(
    (key) =>
      window.slopSeattle.getState().mode ===
      (key === "5" ? "blueangels" : "helicopter"),
    key,
    { timeout: 30000 },
  );
};
try {
  await page.goto(
    server.url + (process.env.E2E_BACKEND === "webgl" ? "/?webgl" : ""),
    { waitUntil: "networkidle" },
  );
  assert.deepEqual(errors, [], "startup has no module or rendering errors");
  await page.waitForFunction(
    () => document.body.dataset.ready === "true",
    null,
    { timeout: 90000 },
  );
  const boot = await state();
  assert(
    !requests.some((r) => r.includes("seattle-blue")),
    "jet code is deferred until selected",
  );
  await mode("5");
  await page.evaluate(() => {
    window.blueTestPad = {
      connected: true,
      mapping: "standard",
      index: 0,
      id: "Blue flight test",
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [window.blueTestPad],
    });
  });
  await frames(3);
  const padStart = await state();
  await page.evaluate(() => {
    window.blueTestPad.axes = [0.8, -0.7, 0, 0];
    window.blueTestPad.buttons[7] = { pressed: true, value: 1 };
  });
  await frames(30);
  const padEnd = await state();
  assert(padEnd.y > padStart.y + 5);
  assert(Math.abs(padEnd.heading - padStart.heading) > 0.1);
  await page.evaluate(() => {
    window.blueTestPad.axes = [0, 0, 0, 0];
    window.blueTestPad.buttons[7] = { pressed: false, value: 0 };
    window.blueTestPad.buttons[5] = { pressed: true, value: 1 };
  });
  await page.waitForFunction(
    () => window.slopSeattle.getState().mode === "person",
  );
  await page.evaluate(() => {
    window.blueTestPad.buttons[5] = { pressed: false, value: 0 };
  });
  await frames(4);
  await page.evaluate(() => {
    window.blueTestPad.buttons[4] = { pressed: true, value: 1 };
  });
  await page.waitForFunction(
    () => window.slopSeattle.getState().mode === "blueangels",
  );
  await page.evaluate(() => {
    delete navigator.getGamepads;
    delete window.blueTestPad;
  });
  const start = await state();
  assert.equal(start.blueAngels.jets, 4);
  assert(start.blueAngels.draws <= 5);
  await page.keyboard.down("w");
  await page.keyboard.down("d");
  await page.keyboard.down("e");
  await frames(90);
  await page.keyboard.up("w");
  await page.keyboard.up("d");
  await page.keyboard.up("e");
  const flown = await state();
  assert(flown.blueAngels.speed > start.blueAngels.speed);
  assert(flown.y > start.y);
  assert(Math.abs(flown.heading - start.heading) > 0.2);
  assert(Math.hypot(flown.x - start.x, flown.z - start.z) > 50);
  assert.equal(
    await page
      .locator('button[data-mode="blueangels"]')
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.keyboard.press("b");
  assert.equal((await state()).blueAngels.smoke, false);
  await page.locator("#blue-smoke").click();
  assert.equal((await state()).blueAngels.smoke, true);
  await page.locator("#help-button").click();
  const paused = await state();
  await frames(20);
  assert.equal((await state()).x, paused.x);
  await page.keyboard.press("Escape");
  await page.locator("#places-button").click();
  await page.locator('[data-destination="columbia"]').click();
  await page.waitForFunction(
    () => window.slopSeattle.getState().camera === "landmark",
  );
  const towerAltitude = (await state()).y;
  await page.keyboard.down("q");
  await frames(40);
  await page.keyboard.up("q");
  assert(
    (await state()).y >= towerAltitude - 5,
    "teleport refreshes tower clearance before descending",
  );
  await frames(180);
  await page.waitForFunction(
    () => window.slopSeattle.getState().blueAngels.smokeSamples === 64,
    null,
    { timeout: 12000 },
  );
  assert((await state()).blueAngels.smokeSamples <= 64);
  assert((await state()).blueAngels.smokeBytes < 16000);
  await page.screenshot({
    path:
      root +
      "/tmp/codex-blue-" +
      (process.env.E2E_BACKEND ?? "webgpu") +
      ".png",
  });
  for (let i = 0; i < 3; i++) {
    await page.locator("#camera-button").click();
    await frames(4);
    assert(Number.isFinite((await state()).y));
    if (i < 2)
      await page.screenshot({
        path:
          root +
          "/tmp/codex-blue-camera-" +
          i +
          "-" +
          (process.env.E2E_BACKEND ?? "webgpu") +
          ".png",
      });
  }
  // Reuse creates then releases the same bounded geometry/bindings on each visit.
  const cdp = await chrome.context.newCDPSession(page),
    rounds = [];
  for (let i = 0; i < 4; i++) {
    await mode("4");
    await page.locator("#places-button").click();
    await page.locator('[data-destination="needle"]').click();
    await page.waitForFunction(
      () =>
        window.slopSeattle.getState().camera === "landmark" &&
        !window.slopSeattle.getState().streaming.busy,
    );
    await frames(12);
    await cdp.send("HeapProfiler.collectGarbage");
    rounds.push({
      gpu: (await state()).gpu,
      heap: (await cdp.send("Runtime.getHeapUsage")).usedSize,
    });
    await mode("5");
    await frames(8);
  }
  assert.equal(rounds[3].gpu.geometries, rounds[1].gpu.geometries);
  assert.equal(rounds[3].gpu.textures, rounds[1].gpu.textures);
  assert(rounds[3].gpu.uniformBuffers <= rounds[1].gpu.uniformBuffers + 8);
  assert(rounds[3].heap < rounds[1].heap + 8 * 1024 * 1024);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      window.slopSeattle?.getState().ready &&
      window.slopSeattle.getState().mode === "blueangels",
    null,
    { timeout: 90000 },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const touch = async (selector, hold = 1) => {
    const b = await page.locator(selector).boundingBox();
    assert(b);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
    });
    await frames(hold);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  };
  // A touch reveals the existing altitude controls, then holds climb.
  await touch("#blue-smoke");
  const before = await state();
  await touch('[data-touch-action="up"]', 30);
  assert((await state()).y > before.y + 10);
  await page.screenshot({
    path:
      root +
      "/tmp/codex-blue-touch-" +
      (process.env.E2E_BACKEND ?? "webgpu") +
      ".png",
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(await page.locator(".atlas-card").isVisible(), false);
  await mode("4");
  assert.equal((await state()).blueAngels.active, false);
  assert.equal(await page.locator("#blue-smoke").isVisible(), false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mode("5");
  assert.equal((await state()).blueAngels.smoke, false);
  assert.deepEqual(errors, []);
  assert.deepEqual(chrome.blocked, []);
  assert(!requests.some((r) => /\.(png|jpe?g|gltf|glb|obj)(\?|$)/.test(r)));
  const blue = (await state()).blueAngels;
  // Failed optional import leaves the current travel mode working, with a readable recovery.
  await mode("4");
  await page.route("**/seattle-blue.js", (route) =>
    route.fulfill({
      status: 503,
      body: "Unavailable",
      contentType: "text/javascript",
    }),
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.slopSeattle?.getState().ready);
  await page.keyboard.press("5");
  await page.waitForFunction(() =>
    document
      .getElementById("travel-status")
      .textContent.includes("Reload to retry"),
  );
  assert.equal((await state()).mode, "helicopter");
  await page.unroute("**/seattle-blue.js");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.slopSeattle?.getState().ready);
  await mode("5");
  console.log(
    JSON.stringify({
      result: "PASS",
      backend: process.env.E2E_BACKEND ?? "webgpu",
      startupMs: boot.startupMs,
      blue,
      rounds,
      checks: [
        "deferred import",
        "keyboard and emulated gamepad flight/mode wrap",
        "smoke capacity",
        "modal pause",
        "camera",
        "repeat/disposal",
        "save restore",
        "touch climb",
        "reduced motion",
        "no media",
        "failed import recovery",
      ],
    }),
  );
} catch (e) {
  console.error(
    JSON.stringify({
      error: e.message,
      errors,
      state: await state().catch(() => null),
    }),
  );
  throw e;
} finally {
  await chrome.close();
  await server.stop();
}
