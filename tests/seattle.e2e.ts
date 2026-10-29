import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { openChrome, spawnServer, minimalEnv } from "@treycausey/kit/e2e";
import {
  DESTINATIONS,
  BRIDGES,
  BOUNDS,
  heightAt,
} from "../js/seattle-config.js";
const root = new URL("..", import.meta.url).pathname;
mkdirSync(`${root}/tmp`, { recursive: true });
const server = await spawnServer({
  argv: (port) => [
    "uv",
    "run",
    "python",
    "-m",
    "http.server",
    String(port),
    "--bind",
    "127.0.0.1",
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
  errors: string[] = [];
const downloadedMedia: string[] = [];
page.on("request", (request) => {
  if (/\.(png|jpe?g|webp|ktx2?|gltf|glb|obj)(\?|$)/i.test(request.url()))
    downloadedMedia.push(request.url());
});
page.on("pageerror", (e) => errors.push(e.message));
page.on("requestfailed", (request) =>
  errors.push(`${request.url()}: ${request.failure()?.errorText}`),
);
page.on("console", (m) => {
  if (m.type() === "error" || m.text().includes("GL_INVALID_OPERATION"))
    errors.push(m.text());
});
const state = () => page.evaluate(() => window.slopSeattle.getState());
try {
  await page.goto(
    server.url + (process.env.E2E_BACKEND === "webgl" ? "/?webgl" : ""),
    {
      waitUntil: "networkidle",
    },
  );
  await page.waitForFunction(
    () =>
      document.body.dataset.ready === "true" ||
      document
        .getElementById("loading-status")
        ?.textContent?.includes("could not start"),
    null,
    { timeout: 120000 },
  );
  assert.equal(
    await page.locator("body").getAttribute("data-ready"),
    "true",
    await page.locator("#loading-status").innerText(),
  );
  assert.equal(await page.title(), "Slop Seattle");
  assert.ok((await state()).buildings > 4000);
  const visual = (await state()).visuals;
  assert.equal(visual.wheelCabins, 42);
  assert.ok(Math.abs(visual.wheelCabinRoll) < 1e-6);
  assert.equal(visual.landmarks.length, 17);
  assert.ok(visual.triangles < 3000000, `triangle budget: ${visual.triangles}`);
  assert.ok(visual.meshes < 600, `draw object budget: ${visual.meshes}`);
  await page.screenshot({ path: `${root}/tmp/codex-seattle-desktop.png` });
  for (const mode of ["person", "car", "cyclist", "helicopter"]) {
    await page.locator(`button[data-mode="${mode}"]`).click();
    assert.equal((await state()).mode, mode);
    assert.equal(
      await page
        .locator(`button[data-mode="${mode}"]`)
        .getAttribute("aria-pressed"),
      "true",
    );
  }
  // Real keyboard movement and altitude control, followed by a destination reset.
  const start = await state();
  await page.keyboard.down("w");
  await page.waitForFunction(
    (p) =>
      Math.hypot(
        window.slopSeattle.getState().x - p.x,
        window.slopSeattle.getState().z - p.z,
      ) > 4,
    start,
    { timeout: 15000 },
  );
  await page.keyboard.up("w");
  const beforeClimb = await state();
  await page.keyboard.down("e");
  await page.waitForFunction(
    (y) => window.slopSeattle.getState().y > y + 2,
    beforeClimb.y,
    {
      timeout: 15000,
    },
  );
  await page.keyboard.up("e");
  for (const { id: destination } of DESTINATIONS) {
    await page.locator("#places-button").click();
    await page.locator(`[data-destination="${destination}"]`).click();
    await page.waitForFunction(
      (name) =>
        window.slopSeattle.getState().camera === "landmark" &&
        document.getElementById("location-label").textContent === name,
      DESTINATIONS.find((d) => d.id === destination).name,
      { timeout: 60000 },
    );
    const p = await state();
    assert.ok(
      Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z),
    );
    const destinationSpec = DESTINATIONS.find((d) => d.id === destination);
    if (
      [
        "gasworks",
        "ballard",
        "shepherd",
        "greenlake",
        "greenwood",
        "gardens",
      ].includes(destination)
    )
      assert.ok(
        p.visuals.landmarks.find((l) => l.name === destinationSpec.name)
          .facadeMeshes > 0,
        `${destination}: shared procedural facade detail`,
      );
    assert.ok(
      Math.hypot(
        p.x - destinationSpec.arrival.x,
        p.z - destinationSpec.arrival.z,
      ) < 200,
      `${destination}: arrival reaches its neighborhood`,
    );
    await page.waitForFunction(
      () => document.getElementById("speed").textContent === "0",
    );
    assert.equal((await state()).camera, "landmark");
    assert.equal(
      (await state()).placeView.clear,
      true,
      `${destination}: view clears neighboring buildings`,
    );
    assert.equal(
      await page.locator("#location-label").innerText(),
      destinationSpec.name,
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    if (process.env.VISUAL_REVIEW === "1")
      await page.screenshot({
        path: `${root}/tmp/codex-detail-${destination}.png`,
      });
  }
  if (process.env.VISUAL_REVIEW === "1") {
    await page.locator("#places-button").click();
    await page.locator('[data-destination="market"]').click();
    await page.locator("#time-select").selectOption("midnight");
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.screenshot({
      path: `${root}/tmp/codex-detail-market-night.png`,
    });
  }
  await page.locator("#time-select").selectOption("midnight");
  assert.equal((await state()).time, "midnight");
  await page.locator("#time-select").selectOption("midday");
  assert.equal((await state()).time, "midday");
  // Reach a canal deck through the atlas and walk it after streamed colliders become active.
  await page.locator('button[data-mode="person"]').click();
  await page.locator("#map-button").click();
  const bridge = BRIDGES.find((b) => b.name === "Ballard Bridge"),
    bounds = await page.locator("#atlas-map").boundingBox();
  const mapScale = Math.min(
    1600 / (BOUNDS.maxX - BOUNDS.minX + 400),
    1200 / (BOUNDS.maxZ - BOUNDS.minZ + 400),
  );
  await page.locator("#atlas-map").click({
    position: {
      x:
        ((800 + (bridge.x - (BOUNDS.minX + BOUNDS.maxX) / 2) * mapScale) *
          bounds.width) /
        1600,
      y:
        ((600 + (bridge.z - (BOUNDS.minZ + BOUNDS.maxZ) / 2) * mapScale) *
          bounds.height) /
        1200,
    },
  });
  await page.waitForFunction(
    () => !document.getElementById("atlas").open,
    null,
    { timeout: 60000 },
  );
  const deckStart = await state();
  assert.ok(
    Math.abs(deckStart.y - bridge.deck) < 1,
    "atlas arrival is on the bridge deck",
  );
  await page.keyboard.down("w");
  await page.waitForFunction(
    (p) =>
      Math.hypot(
        window.slopSeattle.getState().x - p.x,
        window.slopSeattle.getState().z - p.z,
      ) > 12,
    deckStart,
    { timeout: 15000 },
  );
  await page.keyboard.up("w");
  const deckEnd = await state();
  assert.ok(
    Math.abs(deckEnd.y - heightAt(deckEnd.x, deckEnd.z)) < 0.2,
    "walking follows the elevated canal deck",
  );
  await page.locator('button[data-mode="helicopter"]').click();
  await page.locator("#map-button").click();
  assert.ok(await page.locator("#atlas").isVisible());
  await page.locator("#map-search").fill("Pike");
  assert.match(await page.locator("#map-status").innerText(), /matching/);
  await page.locator("#map-search").fill("no-such-seattle-street");
  assert.match(await page.locator("#map-status").innerText(), /^0 /);
  await page.locator("#map-search").fill("");
  await page.screenshot({ path: `${root}/tmp/codex-seattle-atlas.png` });
  await page.locator("#atlas-map").click({ position: { x: 440, y: 280 } });
  await page.waitForFunction(
    () => !document.getElementById("atlas").open,
    null,
    { timeout: 60000 },
  );
  assert.equal(await page.locator("#atlas").isVisible(), false);
  await page.locator("#camera-button").click();
  assert.equal((await state()).camera, "action");
  await page.keyboard.press("v");
  assert.equal((await state()).camera, "pov");
  await page.keyboard.press("v");
  assert.equal((await state()).camera, "skyline");
  await page.screenshot({ path: `${root}/tmp/codex-seattle-skyline.png` });
  await page.locator("#help-button").click();
  assert.ok(await page.locator("#help").isVisible());
  await page.keyboard.press("Escape");
  // A saved mode/position survives a reload via the actual pagehide handler.
  const saved = await state();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]', { timeout: 120000 });
  const restored = await state();
  assert.equal(restored.mode, saved.mode);
  assert.ok(Math.hypot(restored.x - saved.x, restored.z - saved.z) < 15);
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await chrome.context.newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 200, y: 300 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.locator("#touch-controls").waitFor({ state: "visible" });
  const stick = await page.locator("#touch-stick").boundingBox();
  assert.ok(stick);
  const x = stick.x + stick.width / 2,
    y = stick.y + stick.height / 2;
  const touchStart = await state();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: y - 35 }],
  });
  await page.waitForFunction(
    (p) =>
      Math.hypot(
        window.slopSeattle.getState().x - p.x,
        window.slopSeattle.getState().z - p.z,
      ) > 2,
    touchStart,
    { timeout: 15000 },
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.screenshot({ path: `${root}/tmp/codex-seattle-mobile.png` });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(overflow, false);
  assert.deepEqual(chrome.blocked, []);
  assert.deepEqual(
    downloadedMedia,
    [],
    "no downloaded texture or model assets",
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      result: "PASS",
      backend: process.env.E2E_BACKEND ?? "webgpu",
      buildings: restored.buildings,
      roads: restored.roads,
      checks: [
        "boot",
        "4 modes",
        "keyboard movement",
        "helicopter climb",
        "18 destinations",
        "time presets",
        "map search",
        "map travel",
        "camera cycle",
        "help",
        "saved state",
        "touch joystick",
        "mobile layout",
      ],
      screenshots: 5,
      visuals: visual,
      startupMs: restored.startupMs,
      shaderCompileMs: restored.shaderCompileMs,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      loading: await page
        .locator("#loading-status")
        .textContent()
        .catch(() => null),
      errors,
    }),
  );
  await page
    .screenshot({ path: `${root}/tmp/codex-seattle-failure.png` })
    .catch(() => {});
  throw error;
} finally {
  await chrome.close();
  await server.stop();
}
