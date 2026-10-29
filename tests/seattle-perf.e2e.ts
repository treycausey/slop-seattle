import assert from "node:assert/strict";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { cpus, totalmem } from "node:os";
import { openChrome, spawnServer, minimalEnv } from "@treycausey/kit/e2e";
const root = process.env.PERF_ROOT ?? new URL("..", import.meta.url).pathname;
const viewport={width:Number(process.env.PERF_WIDTH??1440),height:Number(process.env.PERF_HEIGHT??1000)};
mkdirSync(`${root}/tmp`, { recursive: true });
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
  viewport,
  allowHosts: ["127.0.0.1", "cdn.jsdelivr.net"],
});
const page = chrome.page,
  errors: string[] = [];
const display = await chrome.context.newCDPSession(page);
await display.send("Emulation.setDeviceMetricsOverride", {
  ...viewport,
  deviceScaleFactor: Number(process.env.PERF_DPR ?? 1),
  mobile: false,
});
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" || m.text().includes("GL_INVALID")) errors.push(m.text());
});
// Measurement access only; production scene, camera, animation step and resolution are unchanged.
await page.route("**/js/seattle.js", async (route) => {
  let source = readFileSync(`${root}/js/seattle.js`, "utf8");
  assert.match(source,/antialias: (true|false),/);
  assert.ok(source.includes("renderer.setAnimationLoop(() => {"));
  assert.ok(source.includes("dt = Math.min((now - last) / 1000, 0.05)"));
  source = source.replace(/antialias: (true|false),/, "$& trackTimestamp: true,");
  if(process.env.PERF_SHADERS==="1")source=source.replace("renderer.shadowMap.enabled = true;","renderer.shadowMap.enabled = true;window.perfBuilders=[];renderer.debug.onNodeBuilderCreated=(b)=>window.perfBuilders.push(b);");
  source = source.replace("dt = Math.min((now - last) / 1000, 0.05)", "dt = 1 / 60");
  source = source.replaceAll(
    "lighting.update(camera.currentPos);",
    "if(window.perfMotion!==undefined){camera.currentPos.x+=Math.sin(window.perfMotion++*0.01)*20;camera.camera.position.copy(camera.currentPos);camera.camera.lookAt(...selectedView.target);}lighting.update(camera.currentPos);",
  );
  source = source.replace(
    "renderer.setAnimationLoop(() => {",
    `const originalLoop=renderer.setAnimationLoop.bind(renderer);renderer.setAnimationLoop=(step)=>{if(step)window.perfProbe={renderer,scene,camera:camera.camera,lighting,city,step,resume:()=>originalLoop(step)};return originalLoop(step);};renderer.setAnimationLoop(() => {`,
  );
  await route.fulfill({ contentType: "text/javascript", body: source });
});
try {
  await page.goto(server.url + (process.env.E2E_BACKEND === "webgl" ? "/?webgl" : ""), {
    waitUntil: "networkidle",
  });
  await page.waitForSelector('body[data-ready="true"]', { timeout: 120000 });
  await page.waitForFunction(()=>window.slopSeattle.getState().secrets.ready);
  const cdp = await chrome.context.newCDPSession(page);
  if (process.env.PERF_PROFILE === "1") {
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.start");
  }
  const results = [];
  for (const id of (
    process.env.PERF_VIEWS ?? "needle,market,columbia,greenwood,gasworks,locks"
  ).split(",")) {
    await page.locator("#places-button").click();
    await page.locator(`[data-destination="${id}"]`).click();
    await page.waitForFunction(
      (id) =>
        window.slopSeattle.getState().camera === "landmark" &&
        document.querySelector(`[data-destination="${id}"] span`)?.textContent ===
          document.getElementById("location-label")?.textContent,
      id,
      { timeout: 60000 },
    );
    await page.waitForFunction(
      () =>
        !window.slopSeattle.getState().streaming.busy &&
        window.slopSeattle.getState().visuals.details.tiles === 9,
    );
    await page.waitForFunction(()=>{
      const d=window.slopSeattle.getState().visuals.districts;
      return !d||(!d.preparing&&d.pendingBuilds===0);
    });
    if(process.env.PERF_MODE){
      await page.locator(`button[data-mode="${process.env.PERF_MODE}"]`).click();
      if(process.env.PERF_STATIONARY!=="1")await page.keyboard.down("w");
    }
    const result = await page.evaluate(
      async ({ id, ablation, moving, count }) => {
        const { renderer: r, scene, camera, lighting, city, step, resume } = window.perfProbe;
        r.setAnimationLoop(null);
        if (moving) window.perfMotion = 0;
        // The pinned engine increments NodeFrame in Animation.start(), not render().
        // Advance it for every measured step so shadows, poses and uniform uploads are real frames.
        const frame = () => {
          r._nodes.nodeFrame.update();
          r.info.reset();
          r.info.frame = r._nodes.nodeFrame.frameId;
          step();
        };
        const flush = async () => {
          if (r.backend.device) await r.backend.device.queue.onSubmittedWorkDone();
          else r.backend.gl.finish();
        };
        const timed = r.hasFeature("timestamp-query");
        const measure = async () => {
          for (let i = 0; i < 8; i++) frame();
          await flush();
          if (timed) await r.resolveTimestampsAsync();
          const samples = [],
            cpu = [],
            gpu = [];
          let rendered;
          for (let repeat = 0; repeat < 5; repeat++) {
            const started = performance.now();
            let submit = 0;
            for (let i = 0; i < count; i++) {
              const t = performance.now();
              frame();
              submit += performance.now() - t;
              rendered = { ...r.info.render };
            }
            await flush();
            samples.push((performance.now() - started) / count);
            cpu.push(submit / count);
            // This engine returns the last query for each render context, not the sum of every step.
            if (timed) gpu.push(await r.resolveTimestampsAsync());
          }
          samples.sort((a, b) => a - b);
          cpu.sort((a, b) => a - b);
          gpu.sort((a, b) => a - b);
          return {
            frameMs: samples[2],
            worstBatchMs: samples.at(-1),
            submitMs: cpu[2],
            gpuLastContextsMs: gpu[2] ?? null,
            samples,
            rendered,
          };
        };
        const normal = await measure(),
          variants = {};
        if(ablation===2){
          const materials=new Map();scene.traverse(o=>{if(o.material?.fragmentNode)materials.set(o.material,o.material.fragmentNode);});
          for(const [m]of materials){m.fragmentNode=null;m.needsUpdate=true;}
          await r.compileAsync(scene,camera);
          variants.fullOriginalShading=await measure();
          for(const [m,node]of materials){m.fragmentNode=node;m.needsUpdate=true;}
          await r.compileAsync(scene,camera);
          const details=scene.getObjectByName("Nearby Seattle detail");details.children.forEach(o=>o.visible=false);
          variants.noProps=await measure();details.children.forEach(o=>o.visible=true);
        }
        if (ablation===1) {
          lighting.sky.visible = false;
          variants.noSky = await measure();
          lighting.sky.visible = true;
          const casters = [];
          scene.traverse((o) => {
            if (o.castShadow) {
              casters.push(o);
              o.castShadow = false;
            }
          });
          variants.noCasters = await measure();
          casters.forEach((o) => (o.castShadow = true));
          const materials = new Map();
          const three = await import("three/webgpu");
          const simple = new three.MeshStandardNodeMaterial({ color: 0x8c918b });
          scene.traverse((o) => {
            if (o.isMesh && o !== lighting.sky) {
              materials.set(o, o.material);
              o.material = simple;
            }
          });
          variants.simpleMaterials = await measure();
          for (const [o, m] of materials) o.material = m;
          simple.dispose();
        }
        const snapshot = window.slopSeattle.getState(),
          drawing = r.getDrawingBufferSize(new (await import("three/webgpu")).Vector2()).toArray();
        const render = { ...r.info.render };
        const draws={};
        const direct=r._renderObjectDirect;
        r._renderObjectDirect=function(object,material,...args){const key=(object.name||object.geometry.type)+':'+object.parent?.name+':'+object.parent?.parent?.name+':'+material.name+':'+material.type;draws[key]=(draws[key]??0)+1;return direct.call(this,object,material,...args);};
        frame();r._renderObjectDirect=direct;
        resume();
        return { id, normal, variants, drawing, snapshot, render, draws };
      },
      {
        id,
        ablation: Number(process.env.PERF_ABLATION??0),
        moving: process.env.PERF_MOVING === "1",
        count: Number(process.env.PERF_COUNT ?? 120),
      },
    );
    results.push(result);
    if(process.env.PERF_MODE)await page.keyboard.up("w");
    if(process.env.PERF_SHADERS==="1")writeFileSync(`${root}/tmp/shaders-${id}.json`,JSON.stringify(await page.evaluate(()=>window.perfBuilders.map(b=>({type:b.material.type,style:b.material.userData,near:!!b.material.maskNode,shader:b.fragmentShader})))));
    console.log(JSON.stringify(result));
    await page.screenshot({
      path: `${root}/tmp/perf-${process.env.PERF_LABEL ?? "current"}-${process.env.E2E_BACKEND ?? "webgpu"}-${id}.png`,
    });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(chrome.blocked, []);
  const report = {
    label: process.env.PERF_LABEL ?? "current",
    backend: process.env.E2E_BACKEND ?? "webgpu",
    timestamp: new Date().toISOString(),
    browser: await page.evaluate(()=>navigator.userAgent),
    hardware: {cpu:cpus()[0]?.model,memoryBytes:totalmem()},
    method: {viewport,dpr:Number(process.env.PERF_DPR??1),stepsPerBatch:Number(process.env.PERF_COUNT??120),batches:5,movingCamera:process.env.PERF_MOVING==="1",mode:process.env.PERF_MODE??"helicopter"},
    sourceSHA256:createHash("sha256").update(readdirSync(`${root}/js`).filter(n=>n.endsWith(".js")).sort().map(n=>n+"\n"+readFileSync(`${root}/js/${n}`,"utf8")).join("\n")).digest("hex"),
    results,
  };
  writeFileSync(
    `${root}/tmp/perf-${report.label}-${report.backend}.json`,
    JSON.stringify(report, null, 2),
  );
  if (process.env.PERF_PROFILE === "1")
    writeFileSync(
      `${root}/tmp/perf-${report.label}.cpuprofile`,
      JSON.stringify((await cdp.send("Profiler.stop")).profile),
    );
} finally {
  await chrome.close();
  await server.stop();
}
