import assert from 'node:assert/strict';
import {readFileSync,writeFileSync}from'node:fs';
import {gzipSync}from'node:zlib';
import {openChrome,spawnServer,minimalEnv}from'@treycausey/kit/e2e';
const root=new URL('..',import.meta.url).pathname;
const server=await spawnServer({argv:p=>['uv','run','python','-c',`from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler; ThreadingHTTPServer.request_queue_size=128; ThreadingHTTPServer(('127.0.0.1',${p}),SimpleHTTPRequestHandler).serve_forever()`],cwd:root,env:minimalEnv(['PATH','HOME','UV_CACHE_DIR']),healthPath:'/index.html'});
const chrome=await openChrome({viewport:{width:900,height:700},allowHosts:['127.0.0.1','cdn.jsdelivr.net']}),{page}=chrome;
// Isolated decoder measurements: actual browser Response/DecompressionStream and the production codec.
await page.route('**/__codec.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Seattle decoder integration</title>'}));
const json=readFileSync(root+'/tools/data/seattle-core.json');
await page.route('**/__core.json.gz',route=>route.fulfill({contentType:'application/octet-stream',body:gzipSync(json,{level:9})}));
try{
 await page.goto(server.url+'/__codec.html');
 const cdp=await chrome.context.newCDPSession(page);await cdp.send('Performance.enable');
 const results=[];
 for(let round=0;round<3;round++)for(const variant of ['json','binary']){
  const result=await page.evaluate(async variant=>{
   const {readSeattleResponse}=await import('./js/seattle-codec.js');
   const body=await(await fetch(variant==='json'?'./__core.json.gz':'./js/seattle-data.bin.gz')).arrayBuffer();
   const start=performance.now();
   const data=variant==='json'?await new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream('gzip'))).json():await readSeattleResponse(new Response(body));
   const decodeMs=performance.now()-start;
   return{variant,decodeMs,bytes:body.byteLength,buildings:data.buildings.length,roads:data.roads.length,parks:data.parks.length};
  },variant);assert.deepEqual([result.buildings,result.roads,result.parks],[4490,2317,51]);results.push({round,...result});
 }
 const checks=await page.evaluate(async()=>{
  const {readSeattleResponse}=await import('./js/seattle-codec.js'),raw=await(await fetch('./js/seattle-data.bin.gz')).arrayBuffer();
  const inflated=await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const data=await readSeattleResponse(new Response(inflated));
  let invalid='',offline='';try{await readSeattleResponse(new Response(new Uint8Array([0x1f,0x8b,0])));}catch(e){invalid=e.message;}
  try{await readSeattleResponse(new Response('no',{status:503}));}catch(e){offline=e.message;}
  return{buildings:data.buildings.length,invalid,offline};
 });assert.equal(checks.buildings,4490);assert.match(checks.invalid,/invalid.*retry/);assert.match(checks.offline,/503.*retry/);
 const heaps=[];
 for(let round=0;round<3;round++){
  await page.evaluate(async()=>{const {readSeattleResponse}=await import('./js/seattle-codec.js');for(let i=0;i<15;i++)await readSeattleResponse(await fetch('./js/seattle-data.bin.gz'));});
  await cdp.send('HeapProfiler.collectGarbage');const{metrics}=await cdp.send('Performance.getMetrics');heaps.push(metrics.find(m=>m.name==='JSHeapUsedSize').value);
 }
 assert.ok(heaps[2]<heaps[0]+2*1024*1024,'decoder retains no per-visit buffers');
 assert.deepEqual(chrome.blocked,[]);writeFileSync(root+'/tmp/codex-issue5-decoder-browser.json',JSON.stringify({results,checks,heaps},null,2));console.log(JSON.stringify({result:'PASS',results,checks,heaps}));
}finally{await chrome.close();await server.stop();}
