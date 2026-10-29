import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openChrome, spawnServer, minimalEnv } from "@treycausey/kit/e2e";
const root = new URL("..", import.meta.url).pathname;
const server = await spawnServer({
  argv: port => ["uv", "run", "python", "-c",
    `from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler; ThreadingHTTPServer.request_queue_size=128; ThreadingHTTPServer(('127.0.0.1',${port}),SimpleHTTPRequestHandler).serve_forever()`],
  cwd: root, env: minimalEnv(["PATH", "HOME", "UV_CACHE_DIR"]), healthPath: "/index.html",
});
const chrome = await openChrome({ viewport: { width: 900, height: 700 }, allowHosts: ["127.0.0.1", "cdn.jsdelivr.net"] });
const page = chrome.page, errors: string[] = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if(m.type()==="error") errors.push(m.text()); });
await page.route("**/js/seattle.js", async route => {
  const source=readFileSync(`${root}/js/seattle.js`,"utf8").replace("renderer.setAnimationLoop(() => {",
    "window.renderProbe={renderer,scene,camera:camera.camera,city,lighting};renderer.setAnimationLoop(() => {");
  await route.fulfill({contentType:"text/javascript",body:source});
});
await page.route("**/js/seattle-geometry.js", async route => {
  const source=readFileSync(`${root}/js/seattle-geometry.js`,"utf8").replace("object.castShadow = false;",
    "object.userData.testStaticCaster=true;object.castShadow = false;");
  await route.fulfill({contentType:"text/javascript",body:source});
});
try {
  await page.goto(server.url+(process.env.E2E_BACKEND==="webgl"?"/?webgl":""),{waitUntil:"networkidle"});
  await page.waitForSelector('body[data-ready="true"]',{timeout:120000});
  await page.locator("#places-button").click();
  await page.locator('[data-destination="market"]').click();
  await page.waitForFunction(()=>window.slopSeattle.getState().camera==="landmark");
  const results=await page.evaluate(async()=>{
    const THREE=await import("three/webgpu"), {applyFacadeLOD}=await import("./js/seattle-facade-lod.js"),
      {batchShadows}=await import("./js/seattle-geometry.js"),
      reference=await import("./js/tsl-materials.js?full-surface-reference"),
      shared=await import("./js/tsl-materials.js");
    // This separate module never enables Seattle's work-skipping path.
    for(const [key,node]of Object.entries(reference.cityUniforms)){
      if(node.value?.copy)node.value.copy(shared.cityUniforms[key].value);else node.value=shared.cityUniforms[key].value;
    }
    const references={asphalt:reference.createRoadSurfaceMaterial(),paving:reference.createSidewalkMaterial()};
    const casterRoot=new THREE.Group(),box=new THREE.BoxGeometry(),base=new THREE.MeshBasicNodeMaterial();
    const caster=()=>{const m=new THREE.Mesh(box,base);m.castShadow=true;return m;};
    const visible=caster(),hidden=caster(),hiddenParent=new THREE.Group(),hiddenChild=caster(),movingParent=new THREE.Group(),moving=caster();
    hidden.material=new THREE.MeshBasicNodeMaterial({visible:false});hiddenParent.visible=false;hiddenParent.add(hiddenChild);
    movingParent.userData.dynamic=true;movingParent.add(moving);casterRoot.add(visible,hidden,hiddenParent,movingParent);
    batchShadows(casterRoot);
    const casterFilters={visible:visible.castShadow,hidden:hidden.castShadow,hiddenParent:hiddenChild.castShadow,moving:moving.castShadow,
      proxyVertices:casterRoot.children.filter(o=>o.name==="Static opaque shadow silhouettes").reduce((n,o)=>n+o.geometry.attributes.position.count,0)};
    const {renderer:r,scene,camera,city,lighting}=window.renderProbe;
    r.setAnimationLoop(null);
    const scratch=document.createElement("canvas");scratch.width=r.domElement.width;scratch.height=r.domElement.height;
    const context=scratch.getContext("2d",{willReadFrequently:true});
    const capture=(s,c)=>{
      r._nodes.nodeFrame.update();r._nodes.nodeFrame.time=0;
      r.render(s,c);context.clearRect(0,0,scratch.width,scratch.height);context.drawImage(r.domElement,0,0);
      return context.getImageData(0,0,scratch.width,scratch.height).data;
    };
    const difference=(a,b)=>{
      let squares=0,changed=0,light=0;
      for(let i=0;i<a.length;i+=4){let delta=0;for(let j=0;j<3;j++){const d=a[i+j]-b[i+j];squares+=d*d;delta=Math.max(delta,Math.abs(d));light+=a[i+j];}if(delta>8)changed++;}
      return {rms:Math.sqrt(squares/(a.length/4*3)),changedFraction:changed/(a.length/4),mean:light/(a.length/4*3)};
    };
    let shadow;
    if(r.backend.isWebGPUBackend){
      const optimized=capture(scene,camera);
      scene.traverse(o=>{if(o.name==="Static opaque shadow silhouettes")o.visible=false;if(o.userData.testStaticCaster)o.castShadow=true;});
      await r.compileAsync(scene,camera);capture(scene,camera);
      shadow=difference(optimized,capture(scene,camera));
      const original=capture(scene,camera);lighting.sunLight.castShadow=false;
      await r.compileAsync(scene,camera);capture(scene,camera);
      shadow.withoutShadows=difference(original,capture(scene,camera));lighting.sunLight.castShadow=true;
      scene.traverse(o=>{if(o.name==="Static opaque shadow silhouettes")o.visible=true;if(o.userData.testStaticCaster)o.castShadow=false;});
    }
    const fixture=new THREE.Scene();fixture.environment=scene.environment;
    fixture.add(new THREE.HemisphereLight(0xaaccee,0x776655,1.5));
    const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(1,2,3);fixture.add(sun);
    const view=new THREE.PerspectiveCamera(50,scratch.width/scratch.height,0.1,100);
    const near=[];
    for(const [name,material,wall]of [["asphalt",city.palette.asphalt,false],["paving",city.palette.paving,false],["stone",city.palette.limestone,false],["facade",city.styles[3],true],["glass",city.styles[0],true]]){
      const geometry=new THREE.PlaneGeometry(20,20),mesh=new THREE.Mesh(geometry,material);
      if(wall){applyFacadeLOD(mesh);view.position.set(0,0,24);}else{mesh.rotation.x=-Math.PI/2;view.position.set(0,15,15);}
      view.lookAt(0,0,0);fixture.add(mesh);
      const optimizedMaterial=mesh.material,original=mesh.material.fragmentNode;
      await r.compileAsync(fixture,view);capture(fixture,view);const optimized=capture(fixture,view);
      if(references[name])mesh.material=references[name];else{mesh.material.fragmentNode=null;mesh.material.needsUpdate=true;}
      await r.compileAsync(fixture,view);capture(fixture,view);
      near.push({name,...difference(optimized,capture(fixture,view))});
      mesh.material=optimizedMaterial;mesh.material.fragmentNode=original;mesh.material.needsUpdate=true;mesh.removeFromParent();geometry.dispose();mesh.dispatchEvent({type:"dispose"});
    }
    return {shadow,near,casterFilters};
  });
  console.log(JSON.stringify({backend:process.env.E2E_BACKEND??"webgpu",...results}));
  assert.deepEqual(results.casterFilters,{visible:false,hidden:true,hiddenParent:true,moving:true,proxyVertices:36});
  for(const result of results.near){assert.ok(result.mean>1,`nonempty ${result.name}`);assert.ok(result.rms<1&&result.changedFraction<0.005,JSON.stringify(result));}
  if(results.shadow){assert.ok(results.shadow.mean>1);assert.ok(results.shadow.changedFraction<0.01,JSON.stringify(results.shadow));assert.ok(results.shadow.withoutShadows.changedFraction>0.001,"positive control: visible shadows");}
  assert.deepEqual(errors,[]);assert.deepEqual(chrome.blocked,[]);
  console.log(JSON.stringify({backend:process.env.E2E_BACKEND??"webgpu",...results,result:"PASS"}));
} finally {await chrome.close();await server.stop();}
