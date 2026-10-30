export const TERRAIN_STEP=54;

// Intersect surveyed outlines/holes with the rendered terrain triangles.
// Sharing their exact piecewise-planar surface prevents gray ground cutting through lawns.
export function parkBuffers(park,bounds,triangulate,heightAt,isLand,origin={minX:0,minZ:0},step=TERRAIN_STEP) {
  if(!Number.isFinite(step)||step<=0)throw new RangeError('Terrain step must be positive and finite');
  const clean=r=>r.length>1&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1]?r.slice(0,-1):r;
  const rings=[park.ring,...(park.holes??[])].map(clean),points=rings.flat();
  const positions=[],indices=[],vertices=new Map(),heights=new Map();
  const sample=(x,z)=>{const key=x+':'+z;if(!heights.has(key))heights.set(key,heightAt(x,z));return heights.get(key);};
  const vertex=p=>{
    const key=p[0].toFixed(5)+':'+p[1].toFixed(5);
    if(!vertices.has(key)){
      const x=origin.minX+Math.floor((p[0]-origin.minX)/step)*step,z=origin.minZ+Math.floor((p[1]-origin.minZ)/step)*step,
        u=(p[0]-x)/step,v=(p[1]-z)/step,a=sample(x,z),c=sample(x+step,z+step),b=v>=u?sample(x,z+step):sample(x+step,z);
      const y=v>=u?a+u*(c-b)+v*(b-a):a+u*(b-a)+v*(c-b);
      vertices.set(key,positions.length/3);positions.push(p[0],y+0.55,p[1]);
    }
    return vertices.get(key);
  };
  const clip=(polygon,nx,nz,limit)=>{
    const result=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],da=a[0]*nx+a[1]*nz-limit,db=b[0]*nx+b[1]*nz-limit;
      if(da>=0)result.push(a);
      if((da>=0)!==(db>=0)){const t=da/(da-db);result.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
    }
    return result;
  };
  const rectangle=(polygon,minX,maxX,minZ,maxZ)=>{
    for(const plane of [[1,0,minX],[-1,0,-maxX],[0,1,minZ],[0,-1,-maxZ]])polygon=clip(polygon,...plane);
    return polygon;
  };
  for(const face of triangulate(rings[0],rings.slice(1))){
    const polygon=rectangle(face.map(i=>points[i]),bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ);
    if(polygon.length<3)continue;
    const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]),maxX=Math.max(...xs),maxZ=Math.max(...zs);
    for(let z=origin.minZ+Math.floor((Math.min(...zs)-origin.minZ)/step)*step;z<maxZ;z+=step)
      for(let x=origin.minX+Math.floor((Math.min(...xs)-origin.minX)/step)*step;x<maxX;x+=step){
        const cell=rectangle(polygon,x,x+step,z,z+step);
        for(const side of [-1,1]){
          const half=clip(cell,-side,side,side*(z-x));
          for(let i=1;i+1<half.length;i++){
            const a=half[0],b=half[i],c=half[i+1],area=(b[1]-a[1])*(c[0]-a[0])-(b[0]-a[0])*(c[1]-a[1]);
            if(Math.abs(area)<1e-8||!isLand((a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3))continue;
            const ids=[vertex(a),vertex(b),vertex(c)];if(area<0)[ids[1],ids[2]]=[ids[2],ids[1]];indices.push(...ids);
          }
        }
      }
  }
  return {positions,indices};
}
