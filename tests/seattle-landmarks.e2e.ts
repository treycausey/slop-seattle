import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { openChrome,spawnServer,minimalEnv } from '@treycausey/kit/e2e';
const root=new URL('..',import.meta.url).pathname,backend=process.env.E2E_BACKEND??'webgpu';
const server=await spawnServer({argv:port=>['uv','run','python','-c',`from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler; ThreadingHTTPServer.request_queue_size=128; ThreadingHTTPServer(('127.0.0.1',${port}),SimpleHTTPRequestHandler).serve_forever()`],cwd:root,env:minimalEnv(['PATH','HOME','UV_CACHE_DIR']),healthPath:'/index.html'});
const chrome=await openChrome({viewport:{width:1440,height:1000},allowHosts:['127.0.0.1','cdn.jsdelivr.net']});
const {page}=chrome,errors=[],media=[];let imports=0,fail=true;
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('503'))errors.push(m.text());});
page.on('request',r=>{if(/\.(png|jpe?g|webp|gltf|glb|obj)(\?|$)/.test(r.url()))media.push(r.url());});
await page.route('**/js/seattle.js',route=>{
  const source=readFileSync(`${root}/js/seattle.js`,'utf8');assert.ok(source.includes('window.slopSeattle = {'));
  return route.fulfill({contentType:'text/javascript',body:source.replace('window.slopSeattle = {','window.landmarkProbe={city,controllerManager,renderer};window.slopSeattle = {')});
});
await page.route('**/js/seattle-landmark-models.js',async route=>{
  imports++;assert.equal(await page.locator('body').getAttribute('data-ready'),'true','detail imports after first render');
  if(fail)await route.fulfill({status:503,body:'test: model code offline'});else await route.continue();
});
const state=()=>page.evaluate(()=>window.slopSeattle.getState());
const frames=n=>page.evaluate(n=>new Promise<void>(resolve=>{const step=()=>--n>0?requestAnimationFrame(step):resolve();requestAnimationFrame(step);}),n);
async function visit(id){
  await page.locator('#places-button').click();const name=await page.locator(`[data-destination="${id}"] span`).textContent();await page.locator(`[data-destination="${id}"]`).click();
  await page.waitForFunction(({id,name})=>window.slopSeattle.getState().camera==='landmark'&&document.getElementById('location-label').textContent===name&&window.landmarkProbe.city.districts.stats().visibleIds.includes(id),{id,name},{timeout:60000});
  await page.waitForFunction(()=>!window.slopSeattle.getState().streaming.busy&&window.slopSeattle.getState().visuals.details.tiles===9);
  await page.waitForFunction(()=>{const s=window.slopSeattle.getState().visuals.districts;return !s.preparing&&s.pendingBuilds===0;});
  await frames(14);const s=await state();
  assert.equal(s.placeView.clear,true,id);assert.ok(s.visuals.districts.resident<=8);assert.ok(s.visuals.districts.geometryBytes<12*1024*1024);
  assert.ok(s.visuals.districts.packedDraws<=16);assert.ok(s.streaming.resident<=4);
  return s;
}
try{
  await page.goto(server.url+(backend==='webgl'?'/?webgl':''),{waitUntil:'networkidle'});
  await page.waitForSelector('body[data-ready="true"]',{timeout:120000});
  await page.waitForFunction(()=>!!window.slopSeattle.getState().visuals.districts.error);
  await frames(20);assert.equal(imports,1,'failed lazy import does not retry every frame');
  await page.locator('#places-button').click();await page.locator('[data-destination="fremont-library"]').click();
  await page.waitForFunction(()=>document.getElementById('travel-status').textContent.includes('Reload to retry'));
  fail=false;await page.reload({waitUntil:'networkidle'});
  await page.waitForSelector('body[data-ready="true"]',{timeout:120000});
  await page.waitForFunction(()=>window.slopSeattle.getState().visuals.districts.ready);
  assert.equal(imports,2);
  const courtyard=await page.evaluate(()=>{
    const g=window.landmarkProbe.city.landmarks.find(g=>g.name==="L'Amourita Apt Bldg");
    const wings=window.landmarkProbe.city.colliders.filter(c=>c.landmark===g.name);
    return {walls:wings.length,centerBlocked:wings.some(c=>g.position.x>c.minX&&g.position.x<c.maxX&&g.position.z>c.minZ&&g.position.z<c.maxZ)};
  });
  assert.equal(courtyard.walls,3,'courtyard architecture retains three solid wings');assert.equal(courtyard.centerBlocked,false,'courtyard stays open');
  await page.locator('#places-button').click();assert.equal(await page.locator('[data-destination]').count(),95);
  await page.locator('#place-search').fill('Licton');
  assert.equal(await page.locator('[data-destination]:visible').count(),1);
  assert.equal(await page.locator('#place-count').innerText(),'1 place');
  await page.locator('#place-search').fill('not-a-place');assert.equal(await page.locator('#place-count').innerText(),'0 places');
  await page.locator('#place-search').fill('');await page.keyboard.press('Escape');
  const rounds=[],cdp=await chrome.context.newCDPSession(page);
  for(let round=0;round<3;round++){
    for(const id of ['showbox','st-james','steam-plant','shellhouse','neptune','conservatory','queenanne-high','magnolia-library','salmon-bridge','licton','greenwood-clock'])await visit(id);
    await visit('fremont-library');await cdp.send('HeapProfiler.collectGarbage');
    rounds.push({state:await state(),heap:(await cdp.send('Runtime.getHeapUsage')).usedSize});
  }
  for(const key of ['geometries','textures','programs','uniformBuffers','total'])assert.equal(rounds[2].state.gpu[key],rounds[1].state.gpu[key],`stable warm GPU ${key}`);
  assert.ok(rounds[2].heap<rounds[1].heap+6*1024*1024,'bounded retained heap');
  await visit('licton');
  const offscreen=await page.evaluate(()=>{
    const e=window.landmarkProbe.controllerManager.entities;
    return {person:e.person.presentationVisible,cyclist:e.cyclist.presentationVisible,pose:Array.from(e.person.rig.pose),carLightRoot:e.car.mesh.visible,dayLamps:e.car.headLights.map(l=>l.visible),crowds:[...e.person.crowd.meshes,...e.cyclist.riderCrowd.meshes].map(m=>m.visible)};
  });
  assert.equal(offscreen.person,false);assert.equal(offscreen.cyclist,false);assert.ok(offscreen.crowds.every(v=>!v));
  assert.equal(offscreen.carLightRoot,true,'culling preserves the light hierarchy');assert.ok(offscreen.dayLamps.every(v=>!v),'zero-output daytime lamps stay out of shader keys');
  await frames(15);assert.deepEqual(await page.evaluate(()=>Array.from(window.landmarkProbe.controllerManager.entities.person.rig.pose)),offscreen.pose,'culled inactive rig does no pose work');
  await page.locator('[data-mode="person"]').click();await frames(5);
  assert.equal(await page.evaluate(()=>window.landmarkProbe.controllerManager.entities.person.presentationVisible),true,'active rig restores');
  const before=await state();await page.keyboard.down('w');await page.waitForFunction(p=>Math.hypot(window.slopSeattle.getState().x-p.x,window.slopSeattle.getState().z-p.z)>2,before);await page.keyboard.up('w');
  await page.locator('[data-mode="blueangels"]').click();await page.waitForFunction(()=>window.slopSeattle.getState().blueAngels.active);await frames(4);
  assert.equal(await page.evaluate(()=>window.landmarkProbe.controllerManager.entities.helicopter.mesh.visible),false,'Blue mode retains helicopter hiding');
  await page.locator('[data-mode="helicopter"]').click();
  await visit('conservatory');await page.screenshot({path:`${root}/tmp/codex-landmarks-${backend}-conservatory.png`});
  await page.setViewportSize({width:390,height:844});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  const tap=async selector=>{
    const b=await page.locator(selector).boundingBox();assert.ok(b,selector);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  await tap('#places-button');await page.locator('#place-search').fill('Neptune');await tap('[data-destination="neptune"]');
  await page.waitForFunction(()=>document.getElementById('location-label').textContent.includes('Neptune'));await frames(12);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${root}/tmp/codex-landmarks-${backend}-mobile.png`});
  assert.deepEqual(errors,[]);assert.deepEqual(media,[]);assert.deepEqual(chrome.blocked,[]);
  writeFileSync(`${root}/tmp/codex-landmarks-${backend}.json`,JSON.stringify({backend,rounds,final:await state()},null,2));
  console.log(JSON.stringify({status:'PASS',backend,checks:['95 searchable Places','lazy failure and reload','36 visits and resource disposal','rig culling and restoration','Blue mode visibility','keyboard and touch'],rounds:rounds.map(r=>({gpu:r.state.gpu,heap:r.heap,districts:r.state.visuals.districts}))}));
}finally{await chrome.close();await server.stop();}
