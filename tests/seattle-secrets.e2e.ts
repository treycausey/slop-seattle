import assert from "node:assert/strict";
import { openChrome, spawnServer, minimalEnv } from "@treycausey/kit/e2e";
import { SECRETS } from "../js/seattle-secrets-plan.js";
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
  media = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" || m.text().includes("GL_INVALID"))
    errors.push(m.text());
});
page.on("request", (r) => {
  if (/\.(png|jpe?g|webp|gltf|glb|obj)(\?|$)/.test(r.url()))
    media.push(r.url());
});
const state = () => page.evaluate(() => window.slopSeattle.getState());
async function visit(s) {
  await page.locator("#places-button").click();
  await page.locator(`[data-destination="${s.place}"]`).click();
  await page.waitForFunction(
    (id) => window.slopSeattle.getState().secrets.nearbyIds.includes(id),
    s.id,
    { timeout: 60000 },
  );
  for (let n = 0; (await state()).secrets.nearest !== s.id; n++) {
    assert.ok(n < SECRETS.length, "every local clue can be selected");
    await page.locator("#secret-next").click();
  }
  await page.waitForFunction(
    () => !window.slopSeattle.getState().streaming.busy,
  );
}
async function settle() {
  await page.waitForFunction(
    () => window.slopSeattle.getState().secrets.resident === 0,
    null,
    { timeout: 30000 },
  );
}
try {
  await page.goto(
    server.url + (process.env.E2E_BACKEND === "webgl" ? "/?webgl" : ""),
    { waitUntil: "networkidle" },
  );
  await page.waitForFunction(
    () => window.slopSeattle?.getState().secrets.ready,
    null,
    { timeout: 90000 },
  );
  const boot = await state();
  assert.ok(boot.visuals.rainier.proxyDistance < 60000);
  assert.ok(boot.visuals.rainier.snowVertices > 100);
  assert.equal(boot.secrets.found, 0);
  assert.equal(boot.secrets.resident, 0);
  const cdp = await chrome.context.newCDPSession(page),
    rounds = [];
  for (let round = 0; round < 2; round++) {
    for (const s of SECRETS) {
      await visit(s);
      const before = (await state()).secrets.activations;
      await page.keyboard.press("f");
      await page.waitForFunction(
        (id) => window.slopSeattle.getState().secrets.activeIds.includes(id),
        s.id,
      );
      let current = await state();
      assert.ok(current.secrets.foundIds.includes(s.id));
      assert.ok(current.secrets.resident <= 3);
      assert.ok(current.secrets.geometryBytes < 2000000);
      assert.ok(current.secrets.meshes < 30);
      await page.keyboard.press("f");
      assert.equal(
        (await state()).secrets.activations,
        before + 1,
        "cooldown prevents repeated spawning",
      );
      if (round === 0) {
        await page.locator("#secret-look").click();
        if (s.id === "eruption")
          await page.waitForFunction(() =>
            window.slopSeattle
              .getState()
              .secrets.effects.some(
                (e) => e.id === "eruption" && e.progress > 0.28,
              ),
          );
        if (SECRETS.indexOf(s) >= 15 && s.id !== "eruption") {
          const view = (await state()).placeView;
          assert.ok(view.clear, `${s.id}: clear discovery view`);
          assert.ok(
            view.eye[1] - view.target[1] < 400,
            `${s.id}: close view, not courtyard fallback`,
          );
        }
        if (s.id === "troll")
          await page.waitForFunction(
            () => window.slopSeattle.getState().visuals.trollEyeScale < 0.85,
          );
        await page.evaluate(
          () =>
            new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            ),
        );
        await page.screenshot({
          path: `${root}/tmp/codex-secret-${s.id}-${process.env.E2E_BACKEND ?? "webgpu"}.png`,
        });
      }
    }
    await settle();
    await cdp.send("HeapProfiler.collectGarbage");
    rounds.push({
      state: await state(),
      heap: (await cdp.send("Runtime.getHeapUsage")).usedSize,
    });
  }
  assert.equal(rounds[1].state.secrets.found, SECRETS.length);
  assert.equal(rounds[1].state.secrets.resident, 0);
  assert.ok(Math.abs(rounds[1].state.visuals.trollEyeScale - 1) < 0.001);
  for (const key of ["geometries", "textures", "programs"])
    assert.equal(
      rounds[1].state.gpu[key],
      rounds[0].state.gpu[key],
      `stable ${key}`,
    );
  assert.ok(
    rounds[1].heap < rounds[0].heap + 12 * 1024 * 1024,
    "tour heap stays bounded",
  );
  assert.ok(
    rounds[1].state.gpu.uniformBuffers <=
      rounds[0].state.gpu.uniformBuffers + 54,
  );
  // Journal lists discoveries, pauses input and closes using the real dialog control.
  await page.locator("#secret-journal").click();
  assert.equal(await page.locator("#secret-book li").count(), SECRETS.length);
  const paused = await state();
  await page.keyboard.down("w");
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await page.keyboard.up("w");
  assert.ok(
    Math.hypot((await state()).x - paused.x, (await state()).z - paused.z) <
      0.1,
  );
  await page.keyboard.press("Escape");
  // Save restore, reduced motion, and a real touch activation at the Troll.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.slopSeattle?.getState().secrets.ready,
  );
  assert.equal((await state()).secrets.found, SECRETS.length);
  await page.setViewportSize({ width: 390, height: 844 });
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit(SECRETS.find((s) => s.id === "troll"));
  const box = await page.locator("#secret-discover").boundingBox(),
    before = (await state()).secrets.activations;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForFunction(
    (n) => window.slopSeattle.getState().secrets.activations === n + 1,
    before,
  );
  assert.equal((await state()).secrets.reducedMotion, true);
  await page.locator("#secret-look").click();
  assert.equal(await page.locator(".status-card").isVisible(), false);
  await page.screenshot({
    path: `${root}/tmp/codex-secret-mobile-${process.env.E2E_BACKEND ?? "webgpu"}.png`,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(media, []);
  assert.deepEqual(chrome.blocked, []);
  await visit(SECRETS.find((s) => s.id === "rocket"));
  await page.locator("#secret-discover").click();
  await page.waitForFunction(() =>
    window.slopSeattle.getState().secrets.activeIds.includes("rocket"),
  );
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const held = await state();
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  assert.deepEqual(
    (await state()).secrets.poses,
    held.secrets.poses,
    "reduced motion holds all transform clocks",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await settle();
  // Four co-located events must evict the oldest, never accumulate a fourth.
  for (const id of ["twelve", "spiral", "hawk", "quake"]) {
    await visit(SECRETS.find((s) => s.id === id));
    await page.locator("#secret-discover").click();
  }
  assert.equal((await state()).secrets.resident, 3);
  assert.deepEqual((await state()).secrets.activeIds, [
    "spiral",
    "hawk",
    "quake",
  ]);
  await settle();
  assert.equal((await state()).secrets.geometryBytes, 0);
  const frames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const a = [],
          step = (t) => {
            a.push(t);
            if (a.length < 121) requestAnimationFrame(step);
            else
              resolve(
                a
                  .slice(1)
                  .map((v, i) => v - a[i])
                  .sort((a, b) => a - b),
              );
          };
        requestAnimationFrame(step);
      }),
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(media, []);
  assert.deepEqual(chrome.blocked, []);
  console.log(
    JSON.stringify({
      result: "PASS",
      backend: process.env.E2E_BACKEND ?? "webgpu",
      startupMs: boot.startupMs,
      frameMedianMs: frames[60],
      frameP95Ms: frames[114],
      rounds: rounds.map((r) => ({
        gpu: r.state.gpu,
        heap: r.heap,
        secrets: r.state.secrets,
      })),
      checks: [
        "31 discoveries and local clue cycling",
        "cooldown",
        "62 visits and active-cap eviction",
        "journal pause",
        "save restore",
        "touch",
        "reduced motion",
        "Rainier snow/framing",
        "Troll eye animation/reset",
        "bounded GPU/heap",
        "no downloaded media",
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
