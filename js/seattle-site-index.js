// Shared spatial queries for facade frontage and seeded planting. References only; region-owned.
export function inPolygon(ring, x, z) {
  let inside = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[i],b=ring[j];
    if ((a[1]>z)!==(b[1]>z) && x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
export const inFootprint=(b,x,z)=>inPolygon(b.ring,x,z)&&!(b.holes??[]).some(r=>inPolygon(r,x,z));
export function siteIndex(data) {
  const cells=new Map(),step=64,key=(x,z)=>`${Math.floor(x/step)}:${Math.floor(z/step)}`;
  const add=(kind,item,minX,minZ,maxX,maxZ)=>{
    for(let x=Math.floor(minX/step);x<=Math.floor(maxX/step);x++)for(let z=Math.floor(minZ/step);z<=Math.floor(maxZ/step);z++){
      const k=`${x}:${z}`;if(!cells.has(k))cells.set(k,{buildings:[],roads:[]});cells.get(k)[kind].push(item);
    }
  };
  for(const b of data.buildings){const xs=b.ring.map(p=>p[0]),zs=b.ring.map(p=>p[1]);add('buildings',b,Math.min(...xs)-2,Math.min(...zs)-2,Math.max(...xs)+2,Math.max(...zs)+2);}
  for(const road of data.roads)for(let i=1;i<road.points.length;i++){
    const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
    if(!length)continue;const r={a,dx,dz,length,width:road.width};const pad=road.width/2+42;
    add('roads',r,Math.min(a[0],b[0])-pad,Math.min(a[1],b[1])-pad,Math.max(a[0],b[0])+pad,Math.max(a[1],b[1])+pad);
  }
  const at=(x,z)=>cells.get(key(x,z));
  return {
    buildingAt(x,z,exclude){return at(x,z)?.buildings.find(b=>b!==exclude&&inFootprint(b,x,z));},
    roadDistance(x,z){let best=Infinity;for(const r of at(x,z)?.roads??[]){const t=Math.max(0,Math.min(1,((x-r.a[0])*r.dx+(z-r.a[1])*r.dz)/r.length));best=Math.min(best,Math.hypot(x-r.a[0]-t*r.dx,z-r.a[1]-t*r.dz)-r.width/2);}return best;},
    dispose(){cells.clear();},
  };
}
export function facadeTreatment(index,b,a,c,side,hole=false){
  const dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz),nx=side*dz/len,nz=-side*dx/len;
  const mx=(a[0]+c[0])/2,mz=(a[1]+c[1])/2;
  const neighbor=index.buildingAt(mx+nx*0.8,mz+nz*0.8,b);
  if(neighbor&&neighbor.height>=b.height*0.65)return 3;
  if(hole)return 2;
  // A door/shop belongs to a real street-facing wall, not every side of every home.
  const frontage=index.roadDistance(mx+nx*3,mz+nz*3);
  return len>=6&&b.height>=10&&frontage<18&&((b.id>>>0)%5!==0)?0:1;
}
