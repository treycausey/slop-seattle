import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {openChrome,spawnServer,minimalEnv}from'@treycausey/kit/e2e';
const root=new URL('..',import.meta.url).pathname,backend=process.env.E2E_BACKEND??'webgpu';
const server=await spawnServer({argv:p=>['uv','run','python','-c',`from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler; ThreadingHTTPServer.request_queue_size=128; ThreadingHTTPServer(('127.0.0.1',${p}),SimpleHTTPRequestHandler).serve_forever()`],cwd:root,env:minimalEnv(['PATH','HOME','UV_CACHE_DIR']),healthPath:'/index.html'});
const chrome=await openChrome({viewport:{width:1440,height:1000},allowHosts:['127.0.0.1','cdn.jsdelivr.net']}),{page}=chrome;
const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.text().includes('GL_INVALID'))errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
await page.route('**/js/seattle.js',route=>route.fulfill({contentType:'text/javascript',body:readFileSync(root+'/js/seattle.js','utf8').replace('window.slopSeattle = {','window.photoProbe={camera,scene,lighting,renderer};window.slopSeattle = {')}));
const state=()=>page.evaluate(()=>window.slopSeattle.getState());
const frames=()=>page.evaluate(()=>new Promise<void>(resolve=>{let count=20;const step=()=>--count?requestAnimationFrame(step):resolve();requestAnimationFrame(step);}));
try{
 await page.goto(server.url+(backend==='webgl'?'/?webgl':''),{waitUntil:'networkidle'});await page.waitForSelector('body[data-ready="true"]',{timeout:120000});
 assert.ok(!requests.some(u=>u.includes('/seattle-photo.js')),'Photo is absent from boot');
 // Failed optional import has one bounded, user-initiated cache-busted retry.
 let fail=true;await page.route('**/js/seattle-photo.js*',route=>fail?route.fulfill({status:503,body:'test: Photo unavailable'}):route.continue());
 await page.locator('#photo-button').click();await page.waitForFunction(()=>document.getElementById('travel-status').textContent.includes('Try Photo again'));
 assert.equal((await state()).photo,false);fail=false;
 await page.locator('#places-button').click();await page.locator('[data-destination="market"]').click();await page.waitForFunction(()=>window.slopSeattle.getState().camera==='landmark');
 await page.keyboard.press('p');await page.waitForFunction(()=>window.slopSeattle.getState().photo);
 assert.equal(await page.locator('.seattle-header').isVisible(),false);assert.match(await page.locator('#photo-tools button:focus').innerText(),/Back/);
 const before=await state();await page.keyboard.down('w');await page.keyboard.press('1');await page.keyboard.press('m');await frames();await page.keyboard.up('w');
 const paused=await state();assert.deepEqual([paused.x,paused.y,paused.z,paused.mode],[before.x,before.y,before.z,before.mode]);assert.equal(await page.locator('#atlas').evaluate(e=>e.open),false);
 await page.screenshot({path:root+`/tmp/codex-photo-${backend}-desktop.png`});
 const eye=await page.evaluate(()=>window.photoProbe.camera.camera.position.toArray());
 await page.mouse.move(750,500);await page.mouse.down();await page.mouse.move(900,560,{steps:6});await page.mouse.up();await page.mouse.wheel(0,180);await frames();
 assert.notDeepEqual(await page.evaluate(()=>window.photoProbe.camera.camera.position.toArray()),eye);
 await page.keyboard.press('Escape');assert.equal((await state()).photo,false);assert.equal(await page.locator('#photo-button').evaluate(e=>e===document.activeElement),true);
 await page.locator('#time-select').selectOption('midnight');await page.locator('#photo-button').click();await frames();
 await page.screenshot({path:root+`/tmp/codex-photo-${backend}-night-city.png`});
 const time=(await state()).time;await page.locator('#photo-tools button').first().click();assert.notEqual((await state()).time,time);
 await page.locator('#photo-tools button').last().click();
 const cdp=await chrome.context.newCDPSession(page),rounds=[];
 for(let round=0;round<3;round++){
  for(let n=0;n<10;n++){await page.locator('#photo-button').click();await page.waitForFunction(()=>window.slopSeattle.getState().photo);await page.keyboard.press('Escape');}
  await cdp.send('HeapProfiler.collectGarbage');const metrics=await cdp.send('Runtime.getHeapUsage');rounds.push({heap:metrics.usedSize,gpu:(await state()).gpu});
 }
 assert.deepEqual(rounds[2].gpu,rounds[1].gpu);assert.ok(rounds[2].heap<rounds[0].heap+3000000);assert.equal(await page.locator('#photo-tools').count(),1);
 await page.locator('#places-button').click();await page.locator('#photo-button').focus();await page.keyboard.press('p');await page.waitForFunction(()=>window.slopSeattle.getState().photo);
 assert.equal(await page.locator('#destinations').evaluate(e=>e.matches(':popover-open')),false);await page.keyboard.press('Escape');
 for(let n=0;(await state()).camera!=='skyline';n++){assert.ok(n<6);await page.keyboard.press('v');}
 const direction=()=>page.evaluate(()=>window.photoProbe.camera.camera.quaternion.toArray());
 await page.waitForFunction(()=>Math.abs(window.photoProbe.camera.camera.position.x+1800)<0.001);
 const skyline=await direction();await page.locator('#photo-button').click();await frames();const framed=await direction();assert.ok(Math.abs(framed.reduce((s,v,i)=>s+v*skyline[i],0))>0.999999);await page.keyboard.press('Escape');
 await page.locator('[data-mode="blueangels"]').click();await page.waitForFunction(()=>window.slopSeattle.getState().mode==='blueangels');
 await page.locator('#photo-button').click();await page.waitForFunction(()=>window.slopSeattle.getState().photo);const jet=await state();await frames();const still=await state();assert.deepEqual([jet.x,jet.y,jet.z],[still.x,still.y,still.z]);await page.keyboard.press('Escape');
 await page.locator('[data-mode="helicopter"]').click();
 await page.setViewportSize({width:320,height:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:390,height:844});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 const tap=async selector=>{const b=await page.locator(selector).boundingBox();assert.ok(b);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.emulateMedia({reducedMotion:'reduce'});await tap('#photo-button');await page.waitForFunction(()=>window.slopSeattle.getState().photo);
 const touchEye=await page.evaluate(()=>window.photoProbe.camera.camera.position.toArray());
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:360},{x:240,y:360}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:360},{x:270,y:360}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frames();
 assert.notDeepEqual(await page.evaluate(()=>window.photoProbe.camera.camera.position.toArray()),touchEye);
 await page.screenshot({path:root+`/tmp/codex-photo-${backend}-mobile.png`});await tap('#photo-tools button:last-child');assert.equal((await state()).photo,false);
 await page.reload({waitUntil:'networkidle'});await page.waitForSelector('body[data-ready="true"]',{timeout:120000});assert.equal((await state()).photo,false);assert.equal((await state()).time,'golden');
 fail=true;const count=requests.filter(u=>u.includes('/seattle-photo.js')).length;
 await page.locator('#photo-button').click();await page.waitForFunction(()=>document.getElementById('travel-status').textContent.includes('Try Photo again'));
 await page.locator('#photo-button').click();await page.waitForFunction(()=>document.getElementById('travel-status').textContent.includes('Reload to retry'));
 await page.locator('#photo-button').click();assert.equal(requests.filter(u=>u.includes('/seattle-photo.js')).length,count+2);
 assert.equal((await state()).photo,false);fail=false;await page.reload({waitUntil:'networkidle'});await page.waitForSelector('body[data-ready="true"]',{timeout:120000});
 // Diagnostic sky view: inspect the real night shader, independently of city occlusion.
 const sky=await page.evaluate(()=>{
  const {renderer,scene,camera,lighting}=window.photoProbe;renderer.setAnimationLoop(null);lighting.applyPreset('midnight');
  const target=lighting.sky.sunPosition.value.clone().multiplyScalar(1000).add(camera.camera.position);camera.camera.lookAt(target);renderer.render(scene,camera.camera);
  return {meshes:window.slopSeattle.getState().visuals.meshes,textures:renderer.info.memory.textures,gpu:renderer.info.memory.total};
 });
 await page.screenshot({path:root+`/tmp/codex-photo-${backend}-moon.png`});
 assert.deepEqual(errors.filter(e=>!e.includes('503')),[]);assert.deepEqual(chrome.blocked,[]);assert.ok(!requests.some(u=>/\.(png|jpg|webp|gltf|glb)(\?|$)/.test(u)));
 writeFileSync(root+`/tmp/codex-photo-${backend}.json`,JSON.stringify({rounds,sky},null,2));
 console.log(JSON.stringify({result:'PASS',backend,checks:['lazy import','bounded failure/retry','keyboard pause/orbit/zoom/exit/focus','light cycle','30 toggles and bounded GPU/heap','touch pinch and exit','reduced motion','save reload','night sky shader','no media'],rounds,sky}));
}finally{await chrome.close();await server.stop();}
