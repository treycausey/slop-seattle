import {inPolygon} from './seattle-site-index.js';
export const groveRandom=n=>{let v=Math.imul(n^(n>>>16),0x45d9f3b);v=Math.imul(v^(v>>>16),0x45d9f3b);return((v^(v>>>16))>>>0)/4294967296;};
export function groveSites(data,bounds,index,isLand,landmarks,limit=240,excluded=null){
  const sites=[],step=26,parks=data.parks;
  for(let iz=Math.ceil(bounds.minZ/step);iz*step<bounds.maxZ;iz++)for(let ix=Math.ceil(bounds.minX/step);ix*step<bounds.maxX;ix++){
    const key=Math.imul(ix,73856093)^Math.imul(iz,19349663),seed=groveRandom(key),x=ix*step+(groveRandom(key+1)-.5)*14,z=iz*step+(groveRandom(key+2)-.5)*14;
    if(x<bounds.minX||x>=bounds.maxX||z<bounds.minZ||z>=bounds.maxZ||!isLand(x,z))continue;
    if(excluded&&x>=excluded.minX&&x<excluded.maxX&&z>=excluded.minZ&&z<excluded.maxZ)continue;
    const park=parks.find(p=>inPolygon(p.ring,x,z)&&!(p.holes??[]).some(r=>inPolygon(r,x,z)));
    const density=groveRandom(Math.imul(Math.floor(ix/4),3719)^Math.imul(Math.floor(iz/4),7151));
    if(seed>(park ? 0.45+density*.35 : 0.025))continue;
    if(index.buildingAt(x,z)||index.roadDistance(x,z)<(park?5:4))continue;
    if(landmarks.some(d=>Math.hypot(d.x-x,d.z-z)<(d.id==='stadium'?135:55)))continue;
    const scale=.65+groveRandom(key+4)*.7,radius=4.5*scale;
    if(park&&[[-radius,0],[radius,0],[0,-radius],[0,radius]].some(([dx,dz])=>!inPolygon(park.ring,x+dx,z+dz)||(park.holes??[]).some(r=>inPolygon(r,x+dx,z+dz))))continue;
    if([[-radius,0],[radius,0],[0,-radius],[0,radius]].some(([dx,dz])=>!isLand(x+dx,z+dz)||index.buildingAt(x+dx,z+dz)))continue;
    sites.push({x,z,scale,type:groveRandom(key+3)<.52?0:1,seed});
    if(sites.length===limit)return sites;
  }
  return sites;
}
