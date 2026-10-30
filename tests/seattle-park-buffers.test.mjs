import test from 'node:test';
import assert from 'node:assert/strict';
import {parkBuffers} from '../js/seattle-park-buffers.js';
const bounds={minX:-100,maxX:100,minZ:-100,maxZ:100};
function area(buffers){
  const {positions:p,indices}=buffers;let area=0;
  for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(n=>n*3),cross=(p[b+2]-p[a+2])*(p[c]-p[a])-(p[b]-p[a])*(p[c+2]-p[a+2]);assert.ok(cross>0,'upward triangle winding');area+=cross/2;}
  return area;
}
test('triangular park keeps its surveyed boundary and area, sharing sampled terrain vertices',()=>{
  const park={ring:[[0,0],[96,0],[0,96],[0,0]]},triangulate=()=>[[0,1,2]];
  const samples=new Set();const height=(x,z)=>{const key=x+':'+z;assert.ok(!samples.has(key),'terrain grid nodes sampled once');samples.add(key);return x*0.1+z*0.2;};
  const result=parkBuffers(park,bounds,triangulate,height,()=>true);
  assert.ok(Math.abs(area(result)-4608)<1e-9);assert.ok(result.positions.length/3<result.indices.length);
  for(let i=0;i<result.positions.length;i+=3){const [x,y,z]=result.positions.slice(i,i+3);assert.ok(x>=0&&z>=0&&x+z<=96);assert.ok(Math.abs(y-(x*0.1+z*0.2+0.55))<1e-9);}
  samples.clear();assert.deepEqual(result,parkBuffers(park,bounds,triangulate,height,()=>true));
});
test('clipping a courtyard park to a region preserves holes and exact cropped area',()=>{
  const park={ring:[[0,0],[10,0],[10,10],[0,10],[0,0]],holes:[[[3,3],[7,3],[7,7],[3,7],[3,3]]]};
  const faces=[[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];
  const result=parkBuffers(park,{minX:1,maxX:9,minZ:1,maxZ:9},()=>faces,()=>0,()=>true,{minX:0,minZ:0},3);
  assert.ok(Math.abs(area(result)-48)<1e-9);
  for(let i=0;i<result.positions.length;i+=3){const [x,,z]=result.positions.slice(i,i+3);assert.ok(x>=1&&x<=9&&z>=1&&z<=9);assert.ok(!(x>3&&x<7&&z>3&&z<7));}
});
test('concave park geometry does not fill the open corner',()=>{
  const park={ring:[[0,0],[20,0],[20,5],[5,5],[5,20],[0,20]]};
  const result=parkBuffers(park,bounds,()=>[[0,1,2],[0,2,3],[0,3,5],[3,4,5]],()=>0,()=>true,{minX:0,minZ:0},4);
  assert.equal(area(result),175);
  for(let i=0;i<result.positions.length;i+=3)assert.ok(result.positions[i]<=5||result.positions[i+2]<=5);
});
test('water, degenerate faces and off-region polygons allocate no terrain vertices',()=>{
  const park={ring:[[0,0],[10,0],[0,10]]},height=()=>{throw new Error('must not sample rejected terrain');};
  for(const [limits,faces,land]of[[bounds,[[0,1,2]],()=>false],[bounds,[[0,0,0]],()=>true],[{minX:20,maxX:30,minZ:20,maxZ:30},[[0,1,2]],()=>true]])assert.deepEqual(parkBuffers(park,limits,()=>faces,height,land),{positions:[],indices:[]});
  for(const edge of [0,-1,NaN,Infinity])assert.throws(()=>parkBuffers(park,bounds,()=>[],height,()=>true,{minX:0,minZ:0},edge),RangeError);
});
test('a lawn stays above the rendered terrain grid on a curved hill',()=>{
  const height=(x,z)=>20*Math.exp(-((x-54)**2+(z-54)**2)/(18**2));
  const park={ring:[[0,0],[108,0],[108,108],[0,108]]};
  const result=parkBuffers(park,{minX:0,maxX:108,minZ:0,maxZ:108},()=>[[0,1,2],[0,2,3]],height,()=>true);
  const check=([x,y,z])=>{
    const gx=Math.floor(x/54)*54,gz=Math.floor(z/54)*54,u=(x-gx)/54,v=(z-gz)/54;
    const a=height(gx,gz),c=height(gx+54,gz+54),surface=v>=u?a+u*(c-height(gx,gz+54))+v*(height(gx,gz+54)-a):a+u*(height(gx+54,gz)-a)+v*(c-height(gx+54,gz));
    assert.ok(y>=surface+0.549,'terrain must not protrude through lawn');
  };
  for(let i=0;i<result.positions.length;i+=3)check(result.positions.slice(i,i+3));
  for(let i=0;i<result.indices.length;i+=3){
    const points=result.indices.slice(i,i+3).map(n=>result.positions.slice(n*3,n*3+3));
    check([0,1,2].map(axis=>points.reduce((s,p)=>s+p[axis],0)/3));
    for(let j=0;j<3;j++)check([0,1,2].map(axis=>(points[j][axis]+points[(j+1)%3][axis])/2));
  }
});
test('neighboring regions share the same terrain-grid seam with a translated origin',()=>{
  const park={ring:[[0,0],[108,0],[108,108],[0,108]]},origin={minX:-11,minZ:-19},height=(x,z)=>Math.sin(x/37)*Math.cos(z/29)*20;
  const make=(minX,maxX)=>parkBuffers(park,{minX,maxX,minZ:0,maxZ:108},()=>[[0,1,2],[0,2,3]],height,()=>true,origin);
  const seam=mesh=>{const result=new Map();for(let i=0;i<mesh.positions.length;i+=3){const [x,y,z]=mesh.positions.slice(i,i+3);if(Math.abs(x-50)<1e-8)result.set(z.toFixed(5),y);}return result;};
  const left=make(0,50),right=make(50,108),a=seam(left),b=seam(right);
  assert.ok(Math.abs(area(left)+area(right)-108**2)<1e-7);assert.deepEqual([...a.keys()].sort(),[...b.keys()].sort());
  for(const [z,y]of a)assert.ok(Math.abs(y-b.get(z))<1e-8);
});
