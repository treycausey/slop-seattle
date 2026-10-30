import assert from 'node:assert/strict';
import {readFileSync,writeFileSync}from'node:fs';
import {openChrome,spawnServer,minimalEnv}from'@treycausey/kit/e2e';
const repo=new URL('..',import.meta.url).pathname,root=process.env.QUALITY_ROOT??repo,label=process.env.QUALITY_LABEL??'final',backend=process.env.E2E_BACKEND??'webgpu';
const server=await spawnServer({argv:p=>['uv','run','python','-c',`from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler; ThreadingHTTPServer.request_queue_size=128; ThreadingHTTPServer(('127.0.0.1',${p}),SimpleHTTPRequestHandler).serve_forever()`],cwd:root,env:minimalEnv(['PATH','HOME','UV_CACHE_DIR']),healthPath:'/index.html'});
const chrome=await openChrome({viewport:{width:1440,height:1000},allowHosts:['127.0.0.1','cdn.jsdelivr.net']}),{page}=chrome,errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.text().includes('GL_INVALID'))errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
await page.route('**/js/seattle.js',route=>route.fulfill({contentType:'text/javascript',body:readFileSync(root+'/js/seattle.js','utf8').replace('window.slopSeattle = {','window.qualityProbe={scene,renderer,camera,city};window.slopSeattle = {')}));
const frames=()=>page.evaluate(()=>new Promise(resolve=>{let n=20;const step=()=>--n?requestAnimationFrame(step):resolve(null);requestAnimationFrame(step);}));
const reports=[];
try{
 await page.goto(server.url+(backend==='webgl'?'/?webgl':''),{waitUntil:'networkidle'});await page.waitForSelector('body[data-ready="true"]',{timeout:120000});
 for(const surface of (process.env.QUALITY_SURFACES??'desktop,mobile').split(',')){
  await page.setViewportSize(surface==='mobile'?{width:390,height:844}:{width:1440,height:1000});await frames();
  for(const id of (process.env.QUALITY_VIEWS??'market,ballard,greenwood,gasworks').split(',')){
   for(const composition of ['place','walk']){
    await page.locator('#places-button').focus();await page.keyboard.press(composition==='place'?'4':'1');
    await page.locator('#places-button').click();await page.locator(`[data-destination="${id}"]`).click();
    await page.waitForFunction(id=>window.slopSeattle.getState().camera==='landmark'&&document.querySelector(`[data-destination="${id}"] span`)?.textContent===document.getElementById('location-label')?.textContent,id,{timeout:60000});
    await page.waitForFunction(()=>!window.slopSeattle.getState().streaming.busy&&window.slopSeattle.getState().visuals.details.tiles===9);
    await page.waitForFunction(()=>{const d=window.slopSeattle.getState().visuals.districts;return !d||(!d.preparing&&d.pendingBuilds===0);});
    if(composition==='walk'){await page.locator('#places-button').focus();await page.keyboard.down('w');await frames();await page.keyboard.up('w');await frames();assert.equal(await page.evaluate(()=>window.slopSeattle.getState().camera),'chase');}
    for(const light of ['golden','midday','twilight','midnight']){
     await page.locator('#time-select').selectOption(light);await frames();
     await page.screenshot({path:repo+`/tmp/quality-${label}-${backend}-${surface}-${id}-${composition}-${light}.png`});
    }
    const state=await page.evaluate(()=>window.slopSeattle.getState());
    const camera=await page.evaluate(()=>({eye:window.qualityProbe.camera.camera.position.toArray(),follow:window.qualityProbe.camera.currentPos.toArray(),world:window.qualityProbe.camera.camera.matrixWorld.elements.slice(12,15),inverse:window.qualityProbe.camera.camera.matrixWorldInverse.elements.slice(12,15),auto:window.qualityProbe.camera.camera.matrixWorldAutoUpdate}));
    console.log(JSON.stringify({id,surface,composition,player:[state.x,state.y,state.z],camera}));
    if(composition==='walk')assert.ok(Math.hypot(camera.eye[0]-state.x,camera.eye[2]-state.z)<100,'walk camera follows the destination');
    assert.ok(state.streaming.resident<=4);assert.ok(state.visuals.districts.resident<=8);assert.equal(state.visuals.details.instanceBytes,884736);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    reports.push({surface,id,composition,state});
   }
  }
 }
 const objects=await page.evaluate(()=>{
  const {scene,renderer,city}=window.qualityProbe,footprints=[],textures=new Set();
  scene.traverse(o=>{if(o.isMesh&&o.geometry.attributes.facadeWall)footprints.push({vertices:o.geometry.attributes.position.count,dimensions:o.geometry.attributes.box.count,walls:o.geometry.attributes.facadeWall.count});for(const m of [o.material,o.userData.facadeMaterial])for(const t of m?.seattleTextures??[])textures.add(t);});
  return {footprints,textures:[...textures].map(t=>({name:t.name,width:t.image.width,height:t.image.height,mips:t.mipmaps.length})),gpu:renderer.info.memory};
 });
 if(!process.env.QUALITY_ROOT){assert.ok(objects.footprints.length>0);assert.ok(objects.footprints.every(f=>f.vertices===f.dimensions&&f.vertices===f.walls));assert.ok(objects.textures.some(t=>t.name==='Generated Seattle wind spectrum'&&t.width===256&&t.mips===9));}
 assert.deepEqual(errors,[]);assert.deepEqual(chrome.blocked,[]);assert.ok(!requests.some(u=>/\.(png|jpg|webp|gltf|glb)(\?|$)/.test(u)));
 writeFileSync(repo+`/tmp/quality-${label}-${backend}.json`,JSON.stringify({reports,objects,requests},null,2));console.log(JSON.stringify({result:'PASS',label,backend,captures:reports.length*4,objects}));
}finally{await chrome.close();await server.stop();}
