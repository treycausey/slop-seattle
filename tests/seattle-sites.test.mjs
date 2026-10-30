import test from 'node:test';
import assert from 'node:assert/strict';
import {siteIndex,facadeTreatment,inPolygon} from '../js/seattle-site-index.js';
import {groveSites} from '../js/seattle-grove-plan.js';
import {buildingBuffers} from '../js/seattle-building-buffers.js';
const square=(x,z,w)=>[[x,z],[x+w,z],[x+w,z+w],[x,z+w],[x,z]];
test('frontage distinguishes real street shops, courtyard windows and shared party walls',()=>{
 const b={id:17,height:18,ring:square(0,0,20)},neighbor={id:18,height:22,ring:square(20,0,20)};
 const index=siteIndex({buildings:[b,neighbor],roads:[{width:8,points:[[-10,-10],[50,-10]]}]});
 assert.equal(facadeTreatment(index,b,[0,0],[20,0],1),0);
 assert.equal(facadeTreatment(index,b,[20,0],[20,20],1),3);
 assert.equal(facadeTreatment(index,b,[20,20],[0,20],1),1);
 assert.equal(facadeTreatment(index,b,[5,5],[5,10],-1,true),2);
 index.dispose();assert.equal(index.roadDistance(0,0),Infinity);
});
test('footprint metadata fits complete bays on rotated walls with constant dimensions and no roof allocation',()=>{
 const ring=[[0,0],[10,10],[0,20],[-10,10],[0,0]];
 const result=buildingBuffers(ring,[],13,7,()=>[[0,1,2],[0,2,3]],()=>({kind:1,seed:17.35}));
 assert.equal(result.walls.box.length,result.walls.positions.length/3*4);
 assert.equal(result.walls.facadeWall.length,result.walls.positions.length);
 assert.equal(result.roof.box,undefined);
 for(let i=0;i<result.walls.box.length;i+=4){assert.ok(Math.abs(result.walls.box[i]-Math.sqrt(200))<1e-8);assert.equal(result.walls.box[i+1],13);}
 for(let i=0;i<result.walls.facadeWall.length;i+=12){assert.deepEqual(result.walls.facadeWall.slice(i,i+12),[1,13,1,0,13,1,0,0,1,1,0,1]);}
});
test('seeded groves cover surveyed parks beyond their center and keep holes, streets, footprints and landmark views clear',()=>{
 const bounds={minX:0,maxX:1000,minZ:0,maxZ:1000},park={ring:square(0,0,1000),holes:[square(350,350,200)]},building={id:1,height:20,ring:square(100,100,100)};
 const data={parks:[park],buildings:[building],roads:[{width:12,points:[[0,250],[1000,250]]}]},index=siteIndex(data),landmarks=[{id:'test',x:700,z:700}];
 const sites=groveSites(data,bounds,index,()=>true,landmarks,240);
 assert.deepEqual(sites,groveSites(data,bounds,index,()=>true,landmarks,240));assert.equal(sites.length,240);
 assert.ok(sites.some(s=>s.x>800));assert.ok(sites.some(s=>s.type===0)&&sites.some(s=>s.type===1));
 for(const s of sites){assert.ok(inPolygon(park.ring,s.x,s.z));assert.ok(!inPolygon(park.holes[0],s.x,s.z));assert.equal(index.buildingAt(s.x,s.z),undefined);assert.ok(index.roadDistance(s.x,s.z)>=5);assert.ok(Math.hypot(s.x-700,s.z-700)>=55);assert.ok(s.scale>=.65&&s.scale<1.35);}
 assert.equal(groveSites(data,bounds,index,()=>false,landmarks).length,0);
});
test('overlapping north regions leave core planting exclusively owned by the resident core',()=>{
 const bounds={minX:0,maxX:400,minZ:0,maxZ:400},core={minX:0,maxX:200,minZ:0,maxZ:400};
 const data={parks:[{ring:square(0,0,400)}],buildings:[],roads:[]},index=siteIndex(data);
 const sites=groveSites(data,bounds,index,()=>true,[],240,core);
 assert.ok(sites.length>0);assert.ok(sites.every(s=>s.x>=200));
});
