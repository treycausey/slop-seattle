import assert from 'node:assert/strict';
import {openChrome,spawnServer,minimalEnv} from '@treycausey/kit/e2e';
const root=new URL('..',import.meta.url).pathname;
const server=await spawnServer({argv:p=>['uv','run','python','-c',`from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler; ThreadingHTTPServer.request_queue_size=128; ThreadingHTTPServer(('127.0.0.1',${p}),SimpleHTTPRequestHandler).serve_forever()`],cwd:root,env:minimalEnv(['PATH','HOME','UV_CACHE_DIR']),healthPath:'/index.html'});
const chrome=await openChrome({viewport:{width:1440,height:1000},allowHosts:['127.0.0.1','cdn.jsdelivr.net']}),{page}=chrome,errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(server.url+(process.env.E2E_BACKEND==='webgl'?'/?webgl':''),{waitUntil:'networkidle'});await page.waitForSelector('body[data-ready="true"]',{timeout:120000});
 const result=await page.evaluate(async()=>{
  const THREE=await import('three/webgpu'),{buildSeattle}=await import('./js/seattle-city.js'),{createSeattlePalette,createSeattleFacades}=await import('./js/seattle-materials.js');
  const data={bounds:{minX:1500,maxX:1596,minZ:800,maxZ:896},buildings:[],roads:[],parks:[{ring:[[1500,800],[1596,800],[1500,896],[1500,800]],holes:[]}]};
  const scene=new THREE.Scene(),palette=createSeattlePalette(),city=buildSeattle(scene,data,{chunk:true,palette,styles:createSeattleFacades()});
  const lawn=city.group.children.find(m=>m.material===palette.grass),position=lawn.geometry.attributes.position,index=lawn.geometry.index;
  let outside=0,area=0;for(let i=0;i<position.count;i++){const x=position.getX(i),z=position.getZ(i);if(x<1500-0.001||z<800-0.001||x+z>2396+0.001)outside++;}
  const count=index?.count??position.count;for(let i=0;i<count;i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;area+=Math.abs((position.getX(b)-position.getX(a))*(position.getZ(c)-position.getZ(a))-(position.getZ(b)-position.getZ(a))*(position.getX(c)-position.getX(a)))/2;}
  const normal=lawn.geometry.attributes.normal;let upward=true;for(let i=0;i<normal.count;i++)if(normal.getY(i)<=0)upward=false;
  const result={outside,area,indexed:Boolean(index),vertices:position.count,triangles:count/3,upward};city.dispose();return result;
 });
 assert.equal(result.outside,0,'park boundary never expands to a 24m grid square');assert.ok(Math.abs(result.area-4608)<0.01,'surveyed triangular park area is preserved');assert.equal(result.indexed,true,'terrain shares vertices');
 assert.equal(result.upward,true);
 await page.locator('#places-button').click();await page.locator('[data-destination="gasworks"]').click();await page.waitForFunction(()=>window.slopSeattle.getState().camera==='landmark'&&!window.slopSeattle.getState().streaming.busy);
 await page.locator('#photo-button').click();await page.waitForFunction(()=>window.slopSeattle.getState().photo);
 await page.screenshot({path:root+`/tmp/codex-parks-final-${process.env.E2E_BACKEND??'webgpu'}-desktop.png`});
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.querySelector('#canvas-container canvas').height===Math.floor(innerHeight*Math.min(devicePixelRatio,1.5)));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.ok(await page.locator('#photo-tools button:last-child').isVisible());
 await page.screenshot({path:root+`/tmp/codex-parks-final-${process.env.E2E_BACKEND??'webgpu'}-mobile.png`});
 await page.keyboard.press('Escape');assert.equal((await page.evaluate(()=>window.slopSeattle.getState())).photo,false);
 assert.deepEqual(errors,[]);assert.deepEqual(chrome.blocked,[]);console.log(JSON.stringify({result:'PASS',...result}));
}finally{await chrome.close();await server.stop();}
