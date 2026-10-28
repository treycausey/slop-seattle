import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { openChrome, spawnServer, minimalEnv } from "@treycausey/kit/e2e";
const root = new URL("..", import.meta.url).pathname;
mkdirSync(`${root}/tmp`, { recursive: true });
const server = await spawnServer({
  argv: (port) => ["uv", "run", "python", "-m", "http.server", String(port), "--bind", "127.0.0.1"],
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
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" || m.text().includes("GL_INVALID_OPERATION")) errors.push(m.text());
});
const state = () => page.evaluate(() => window.slopSeattle.getState());
try {
  await page.goto(server.url + (process.env.E2E_BACKEND === "webgl" ? "/?webgl" : ""), {
    waitUntil: "networkidle",
  });
  await page.waitForSelector('body[data-ready="true"]', { timeout: 120000 });
  assert.equal(await page.title(), "Slop Seattle");
  assert.ok((await state()).buildings > 4000);
  await page.screenshot({ path: `${root}/tmp/codex-seattle-desktop.png` });
  for (const mode of ["person", "car", "cyclist", "helicopter"]) {
    await page.locator(`button[data-mode="${mode}"]`).click();
    assert.equal((await state()).mode, mode);
    assert.equal(
      await page.locator(`button[data-mode="${mode}"]`).getAttribute("aria-pressed"),
      "true",
    );
  }
  // Real keyboard movement and altitude control, followed by a destination reset.
  const start = await state();
  await page.keyboard.down("w");
  await page.waitForFunction(
    (p) =>
      Math.hypot(window.slopSeattle.getState().x - p.x, window.slopSeattle.getState().z - p.z) > 4,
    start,
    { timeout: 15000 },
  );
  await page.keyboard.up("w");
  const beforeClimb = await state();
  await page.keyboard.down("e");
  await page.waitForFunction((y) => window.slopSeattle.getState().y > y + 2, beforeClimb.y, {
    timeout: 15000,
  });
  await page.keyboard.up("e");
  for (const destination of [
    "needle",
    "market",
    "wheel",
    "columbia",
    "smith",
    "spheres",
    "stadium",
    "lake",
  ]) {
    await page.locator("#places-button").click();
    await page.locator(`[data-destination="${destination}"]`).click();
    const p = await state();
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
    await page.waitForFunction(() => document.getElementById("speed").textContent === "0");
  }
  await page.locator("#time-select").selectOption("midnight");
  assert.equal((await state()).time, "midnight");
  await page.locator("#time-select").selectOption("midday");
  assert.equal((await state()).time, "midday");
  await page.locator("#map-button").click();
  assert.ok(await page.locator("#atlas").isVisible());
  await page.locator("#map-search").fill("Pike");
  assert.match(await page.locator("#map-status").innerText(), /matching/);
  await page.locator("#map-search").fill("no-such-seattle-street");
  assert.match(await page.locator("#map-status").innerText(), /^0 /);
  await page.locator("#map-search").fill("");
  await page.screenshot({ path: `${root}/tmp/codex-seattle-atlas.png` });
  await page.locator("#atlas-map").click({ position: { x: 440, y: 280 } });
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
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 200, y: 300 }],
  });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.locator("#touch-controls").waitFor({ state: "visible" });
  const stick = await page.locator("#touch-stick").boundingBox();
  assert.ok(stick);
  const x = stick.x + stick.width / 2,
    y = stick.y + stick.height / 2;
  const touchStart = await state();
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: y - 35 }],
  });
  await page.waitForFunction(
    (p) =>
      Math.hypot(window.slopSeattle.getState().x - p.x, window.slopSeattle.getState().z - p.z) > 2,
    touchStart,
    { timeout: 15000 },
  );
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.screenshot({ path: `${root}/tmp/codex-seattle-mobile.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false);
  assert.deepEqual(chrome.blocked, []);
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
        "8 destinations",
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
    }),
  );
} finally {
  await chrome.close();
  await server.stop();
}
