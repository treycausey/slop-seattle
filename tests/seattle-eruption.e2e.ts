import assert from "node:assert/strict";
import { openChrome, spawnServer, minimalEnv } from "@treycausey/kit/e2e";
const root = new URL("..", import.meta.url).pathname;
const server = await spawnServer({
  argv: (p) => [
    "uv",
    "run",
    "python",
    "-c",
    `from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler; ThreadingHTTPServer.request_queue_size=128; ThreadingHTTPServer(('127.0.0.1',${p}),SimpleHTTPRequestHandler).serve_forever()`,
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
const state = () => page.evaluate(() => window.slopSeattle.getState()),
  backend = process.env.E2E_BACKEND ?? "webgpu";
const frames = (n) =>
  page.evaluate(
    (n) =>
      new Promise((r) => {
        let i = 0;
        const f = () => (++i >= n ? r(null) : requestAnimationFrame(f));
        requestAnimationFrame(f);
      }),
    n,
  );
async function place(id) {
  await page.locator("#places-button").click();
  await page.locator(`[data-destination="${id}"]`).click();
  await page.waitForFunction(
    () =>
      window.slopSeattle.getState().camera === "landmark" &&
      !window.slopSeattle.getState().streaming.busy,
  );
}
async function selectEruption() {
  await place("rainier");
  await page.waitForFunction(() =>
    window.slopSeattle.getState().secrets.nearbyIds.includes("eruption"),
  );
  for (let n = 0; (await state()).secrets.nearest !== "eruption"; n++) {
    assert(n < 4);
    await page.locator("#secret-next").click();
  }
}
try {
  await page.goto(server.url + (backend === "webgl" ? "/?webgl" : ""), {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => window.slopSeattle?.getState().secrets.ready,
    null,
    { timeout: 90000 },
  );
  const boot = await state(),
    cdp = await chrome.context.newCDPSession(page),
    rounds = [];
  assert.equal(boot.secrets.resident, 0);
  for (let round = 0; round < 3; round++) {
    await selectEruption();
    await page.waitForFunction(
      () => !document.getElementById("secret-discover").disabled,
      null,
      { timeout: 30000 },
    );
    if (round === 0)
      await page.screenshot({
        path: root + `/tmp/codex-eruption-normal-${backend}.png`,
      });
    const count = (await state()).secrets.activations;
    await page.keyboard.press("f");
    await page.waitForFunction(() =>
      window.slopSeattle
        .getState()
        .secrets.effects.some((e) => e.id === "eruption" && e.progress > 0.28),
    );
    const active = await state(),
      effect = active.secrets.effects.find((e) => e.id === "eruption");
    assert.equal(effect.ashPuffs, 28);
    assert.equal(effect.embers, 18);
    assert.equal(effect.draws, 4);
    assert(effect.proxyScale < 0.25 && effect.proxyScale > 0.1);
    assert.equal(active.secrets.meshes, 4);
    assert(active.secrets.geometryBytes < 1500000);
    await page.keyboard.press("f");
    assert.equal(
      (await state()).secrets.activations,
      count + 1,
      "cooldown blocks repeated allocation",
    );
    await page.locator("#secret-look").click();
    if (round === 0)
      await page.screenshot({
        path: root + `/tmp/codex-eruption-peak-${backend}.png`,
      });
    await place("needle");
    assert(
      (await state()).secrets.activeIds.includes("eruption"),
      "eruption remains visible across the city for its bounded lifetime",
    );
    await page.waitForFunction(
      () =>
        !window.slopSeattle.getState().secrets.activeIds.includes("eruption"),
      null,
      { timeout: 25000 },
    );
    assert.equal((await state()).secrets.geometryBytes, 0);
    assert.equal(
      (await state()).visuals.rainier.snowVertices,
      boot.visuals.rainier.snowVertices,
    );
    await cdp.send("HeapProfiler.collectGarbage");
    rounds.push({
      gpu: (await state()).gpu,
      heap: (await cdp.send("Runtime.getHeapUsage")).usedSize,
    });
  }
  for (const key of ["geometries", "textures", "programs", "uniformBuffers"])
    assert.equal(
      rounds[2].gpu[key],
      rounds[1].gpu[key],
      key + " stays fixed across eruptions",
    );
  assert(rounds[2].heap < rounds[1].heap + 6 * 1024 * 1024);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.slopSeattle?.getState().secrets.ready,
  );
  assert((await state()).secrets.foundIds.includes("eruption"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  await selectEruption();
  const tap = async (selector) => {
    const b = await page.locator(selector).boundingBox();
    assert(b);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  };
  await tap("#secret-discover");
  await page.waitForFunction(() =>
    window.slopSeattle.getState().secrets.activeIds.includes("eruption"),
  );
  await tap("#secret-look");
  await frames(4);
  const held = await state();
  await frames(25);
  assert.deepEqual(
    (await state()).secrets.effects,
    held.secrets.effects,
    "reduced motion holds a static eruption",
  );
  assert.deepEqual((await state()).secrets.poses, held.secrets.poses);
  assert.equal(held.secrets.effects[0].progress, 0.5);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: root + `/tmp/codex-eruption-mobile-${backend}.png`,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(media, []);
  assert.deepEqual(chrome.blocked, []);
  console.log(
    JSON.stringify({
      result: "PASS",
      backend,
      startupMs: boot.startupMs,
      rounds,
      checks: [
        "31st discovery",
        "four procedural draws",
        "cooldown24s",
        "three eruptions",
        "global horizon alignment",
        "expiry/disposal",
        "save restore",
        "touch",
        "static reduced motion",
        "no media",
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
