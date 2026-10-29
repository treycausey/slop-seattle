import * as THREE from 'three/webgpu';
import { LANDMARK_CATALOG, terrainHeightAt } from './seattle-config.js';
import { batchStatic, batchShadows } from './seattle-geometry.js';
import { applyFacadeLOD } from './seattle-facade-lod.js';

const LIMIT=8, RANGE=1050;
export function createDistrictLandmarks(parent,p,shadowBatch) {
  const root=new THREE.Group();root.name='Seattle neighborhood landmarks';root.userData.dynamic=true;
  parent.add(root);
  const groups=LANDMARK_CATALOG.map(d=>{
    const g=new THREE.Group();g.name=d.name;g.position.set(d.x,terrainHeightAt(d.x,d.z),d.z);
    g.userData.signature=d.signature;g.userData.catalogId=d.id;root.add(g);return g;
  });
  const boxes=new THREE.BoxGeometry(1,1,1),columns=new THREE.CylinderGeometry(1,1,1,8),bins=new Map(),pieces=new Map();
  const dummy=new THREE.Object3D(),active=new Map();
  const packed=new THREE.Group();root.add(packed);
  let builder,loading,attempted=false,error=null,focus=null,requested=null,lastX=Infinity,lastZ=Infinity,desired=[],dirty=false;
  let prepare=async()=>{},preparing=false,preparation=Promise.resolve(),version=0,shown=[],pending=null,disposed=false;
  const part=(d,mat,x,y,z,w,h,depth,round=false)=>{
    const key=mat.uuid+round;
    if(!bins.has(key))bins.set(key,{mat,round,rows:[]});
    bins.get(key).rows.push({id:d.id,x:d.x+x,y:terrainHeightAt(d.x,d.z)+y+h/2,z:d.z+z,w,h,depth});
  };
  // Instanced, permanent coarse architectural silhouettes: no per-site materials or textures.
  for(const d of LANDMARK_CATALOG){
    const {w,h,d:depth,kind}=d;
    if(kind==='railbridge'){
      part(d,p.steel,0,4,0,w,3,depth);
      for(const x of [-w/2,w/2])part(d,p.steel,x,6,0,1,12,depth);
      part(d,p.concrete,0,10,-depth*.2,w+5,h*.6,10);
    }else if(kind==='spring'||kind==='terrace'){
      for(let i=0;i<3;i++)part(d,kind==='spring'?p.copper:p.concrete,0,i*2,0,w-i*7,2,depth-i*7);
    }else if(kind==='clock'){
      part(d,p.copper,0,0,0,.7,h,1,true);part(d,p.white,0,h-2,0,3,2,3);
    }else{
      part(d,['modern','glasshouse','showroom'].includes(kind)?p.blueRoof:p.facades[4],0,0,0,w,h*.7,depth);
      part(d,p.roof,0,h*.7,0,w+1,2,depth+1);
      if(['school','tower','fire','church','cathedral','onion'].includes(kind))
        for(const x of (['cathedral','onion'].includes(kind)?[-w*.35,w*.35]:[0]))
          part(d,p.limestone,x,h*.5,depth*.25,w*.2,h*.5,depth*.25);
      if(kind==='industrial')for(const x of [-w*.25,w*.25])part(d,p.roof,x,h,-depth*.2,2.5,h*2,2.5,true);
      if(kind==='glasshouse')part(d,p.blueRoof,0,h*.5,0,depth*.4,h*.5,depth*.4,true);
    }
  }
  for(const bin of bins.values()){
    const m=new THREE.InstancedMesh(bin.round?columns:boxes,bin.mat,bin.rows.length);
    m.name='Instanced neighborhood silhouettes';m.castShadow=false;m.receiveShadow=false;
    root.add(m);bin.mesh=m;
    bin.rows.forEach((row,i)=>{
      dummy.position.set(row.x,row.y,row.z);dummy.scale.set(row.w,row.h,row.depth);dummy.updateMatrix();
      m.setMatrixAt(i,dummy.matrix);
      if(!pieces.has(row.id))pieces.set(row.id,[]);
      pieces.get(row.id).push({mesh:m,index:i,matrix:dummy.matrix.clone()});
    });
    m.computeBoundingSphere();
  }
  const silhouette=(id,visible)=>{
    for(const {mesh,index,matrix}of pieces.get(id)){
      dummy.matrix.copy(matrix);if(!visible)dummy.matrix.scale(new THREE.Vector3(0,0,0));
      mesh.setMatrixAt(index,dummy.matrix);mesh.instanceMatrix.needsUpdate=true;
    }
  };
  const load=()=>{attempted=true;return loading??=(import('./seattle-landmark-models.js').then(m=>{builder=m.buildDistrictLandmark;error=null;})
    .catch(()=>{error='Landmark detail could not load. Reload to retry.';throw new Error(error);}));};
  const clear=g=>{
    g.traverse(o=>{if(o.isMesh){o.dispatchEvent({type:'dispose'});o.geometry.dispose();}});g.clear();
  };
  const pack=()=>{
    if(preparing)return preparation;
    if(!dirty)return Promise.resolve();dirty=false;preparing=true;
    const revision=version,ids=[...active.keys()],staging=new THREE.Group();pending=staging;
    for(const g of active.values())g.traverse(o=>{
      if(!o.isMesh)return;
      const copy=new THREE.Mesh(o.geometry.clone(),o.material);
      copy.geometry.applyMatrix4(g.matrixWorld);copy.castShadow=true;copy.receiveShadow=true;staging.add(copy);
    });
    batchStatic(staging);
    if(shadowBatch)batchShadows(staging);
    staging.traverse(o=>{if(o.isMesh&&o.material.userData.facadeStyle)applyFacadeLOD(o);
      o.updateMatrix();o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;});
    staging.updateMatrixWorld(true);
    // Compile detached geometry with the real scene's lights, yielding through the engine scheduler.
    // Old detail/coarse silhouettes remain available until the replacement is ready.
    preparation=(async()=>{
      try{
        await prepare(staging);
        if(disposed||revision!==version){clear(staging);dirty=!disposed;return;}
        clear(packed);if(staging.children.length)packed.add(...staging.children);
        for(const id of shown)silhouette(id,true);
        shown=ids;for(const id of shown)silhouette(id,false);
        packed.updateMatrixWorld(true);
      }catch(e){clear(staging);error='Landmark detail could not prepare. Reload to retry.';throw new Error(error);}
      finally{preparing=false;pending=null;}
    })();
    return preparation;
  };
  const retire=id=>{
    const g=active.get(id);if(!g)return;
    if(shown.includes(id)){clear(packed);for(const id of shown)silhouette(id,true);shown=[];}
    clear(g);active.delete(id);silhouette(id,true);dirty=true;version++;
  };
  const build=d=>{
    if(active.has(d.id))return;
    if(active.size>=LIMIT)retire([...active.keys()].find(id=>id!==focus)??active.keys().next().value);
    const g=groups.find(g=>g.userData.catalogId===d.id);
    builder(g,p,d);g.updateMatrixWorld(true);
    g.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;});
    g.visible=false;active.set(d.id,g);dirty=true;version++;
  };
  return {
    groups,
    setPrepare(callback){prepare=callback;},
    async ensure(id){
      const d=LANDMARK_CATALOG.find(d=>d.id===id);if(!d)return;await load();focus=id;requested=id;lastX=Infinity;
      try{while(!shown.includes(id)){
        if(error)throw new Error(error);if(!active.has(id))build(d);await pack();
        if(!shown.includes(id))await new Promise(resolve=>requestAnimationFrame(resolve));
      }}finally{requested=null;}
    },
    update(position){
      if(!position||disposed||error)return;
      if(!builder){if(!attempted)void load().catch(()=>{});return;}
      if((position.x-lastX)**2+(position.z-lastZ)**2>60**2){
        lastX=position.x;lastZ=position.z;
        if(focus&&!requested){const d=LANDMARK_CATALOG.find(d=>d.id===focus);if(Math.hypot(d.x-lastX,d.z-lastZ)>1800)focus=null;}
        desired=LANDMARK_CATALOG.map(d=>({d,distance:Math.hypot(d.x-lastX,d.z-lastZ)}))
          .filter(v=>v.distance<RANGE||v.d.id===focus).sort((a,b)=>(b.d.id===focus)-(a.d.id===focus)||a.distance-b.distance)
          .slice(0,LIMIT).map(v=>v.d);
        for(const id of active.keys())if(!desired.some(d=>d.id===id))retire(id);
      }
      if(preparing)return;
      const next=desired.find(d=>!active.has(d.id));if(next)build(next); // at most one build per frame
      void pack().catch(()=>{});
    },
    stats(){let bytes=0,meshes=0;for(const g of active.values())g.traverse(o=>{
      if(!o.isMesh)return;meshes++;for(const a of Object.values(o.geometry.attributes))bytes+=a.array.byteLength;
      bytes+=o.geometry.index?.array.byteLength??0;
    });let packedBytes=0;for(const group of [packed,pending])group?.traverse(o=>{if(o.isMesh){for(const a of Object.values(o.geometry.attributes))packedBytes+=a.array.byteLength;packedBytes+=o.geometry.index?.array.byteLength??0;}});
      return {ready:!!builder,error,preparing,pendingBuilds:desired.filter(d=>!active.has(d.id)).length+(dirty?1:0),resident:active.size,limit:LIMIT,ids:[...active.keys()],visibleIds:[...shown],geometryBytes:bytes+packedBytes,meshes,packedDraws:packed.children.length,silhouetteDraws:bins.size};},
    dispose(){disposed=true;for(const id of active.keys())retire(id);clear(packed);for(const {mesh}of bins.values())mesh.dispose();boxes.dispose();columns.dispose();root.removeFromParent();},
  };
}
