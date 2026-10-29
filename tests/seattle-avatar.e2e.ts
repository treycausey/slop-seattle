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
const state = () => page.evaluate(() => window.slopSeattle.getState());
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
const backend = process.env.E2E_BACKEND ?? "webgpu";
try {
  await page.goto(server.url + (backend === "webgl" ? "/?webgl" : ""), {
    waitUntil: "networkidle",
  });
  assert.deepEqual(errors, []);
  await page.waitForFunction(() => window.slopSeattle?.getState().ready, null, {
    timeout: 90000,
  });
  assert.equal((await state()).avatar.look, "grunge");
  for (const mode of ["person", "cyclist"]) {
    await page.locator(`button[data-mode="${mode}"]`).click();
    await page.waitForFunction(
      (m) => window.slopSeattle.getState().mode === m,
      mode,
    );
    await page.locator("#avatar-control").waitFor({ state: "visible" });
    for (const look of ["grunge", "beast"]) {
      await page.locator("#avatar-look").focus();
      await page.locator("#avatar-look").selectOption(look);
      await frames(8);
      assert.equal((await state()).avatar.look, look);
      const before = await state();
      await page.keyboard.down("w");
      await frames(40);
      await page.keyboard.up("w");
      await frames(6);
      const after = await state();
      assert(
        Math.hypot(after.x - before.x, after.z - before.z) > 0.1,
        `${mode}/${look} movement`,
      );
      assert.equal(after.avatar.headVisible, look === "beast");
      assert(after.avatar.extraMeshes <= 10);
      if (look === "beast")
        assert(
          Math.hypot(
            ...after.avatar.headPositions[mode === "person" ? 0 : 1]
              .filter((_, i) => i !== 1)
              .map((v, i) => v - [after.x, after.z][i]),
          ) < 2,
          "hawk head follows active rig",
        );
      await page.screenshot({
        path: root + `/tmp/codex-avatar-${mode}-${look}-${backend}.png`,
      });
      if (mode === "person") {
        await page.mouse.move(950, 400);
        await page.mouse.down();
        await page.mouse.move(470, 400, { steps: 12 });
        await page.mouse.up();
        await frames(12);
        const screen=(await state()).avatar.headScreen;
        assert(Math.abs(screen[0])<.85&&Math.abs(screen[1])<.85&&screen[2]>0&&screen[2]<1,'front orbit keeps avatar in view');
        await page.screenshot({
          path: root + `/tmp/codex-avatar-front-${look}-${backend}.png`,
        });
        await page.mouse.move(470, 400);
        await page.mouse.down();
        await page.mouse.move(950, 400, { steps: 12 });
        await page.mouse.up();
        await frames(8);
      }
    }
  }
  const cdp = await chrome.context.newCDPSession(page),
    rounds = [];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 10; i++) {
      await page
        .locator("#avatar-look")
        .selectOption(i % 2 ? "grunge" : "beast");
      await frames(2);
    }
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
      key + " stays fixed when changing looks",
    );
  assert(rounds[2].heap < rounds[1].heap + 4 * 1024 * 1024);
  await page.locator("#avatar-look").selectOption("beast");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.slopSeattle?.getState().ready);
  assert.equal((await state()).avatar.look, "beast");
  assert.equal((await state()).mode, "cyclist");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#avatar-look").selectOption("grunge");
  await frames(6);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: root + `/tmp/codex-avatar-mobile-${backend}.png`,
  });
  await page.keyboard.press("4");
  await page.locator("#avatar-control").waitFor({ state: "hidden" });
  assert.deepEqual(errors, []);
  assert.deepEqual(media, []);
  assert.deepEqual(chrome.blocked, []);
  console.log(
    JSON.stringify({
      result: "PASS",
      backend,
      avatar: (await state()).avatar,
      rounds,
      checks: [
        "both looks",
        "walk",
        "pedal",
        "head attachment",
        "30 toggles",
        "save restore",
        "mobile",
        "no downloaded art",
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
