import * as THREE from 'three/webgpu';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {heightAt} from './seattle-config.js';

export function createGroves(parent,palette,sites,bounds){
  const root=new THREE.Group();root.name='Procedural park groves';parent.add(root);
  const lobes=[];
  for(const [x,y,z,s]of [[0,8,0,3.6],[-2,6.8,0.8,2.8],[1.8,6.6,-0.8,2.9]]){
    const g=new THREE.IcosahedronGeometry(s,1);g.scale(1,1.1,1);g.translate(x,y,z);lobes.push(g);
  }
  const broad=mergeGeometries(lobes);lobes.forEach(g=>g.dispose());
  const cones=[];
  for(let j=0;j<5;j++){const g=new THREE.ConeGeometry(3.8-j*.57,5.4-j*.45,8);g.translate(Math.sin(j*2)*.3,4.8+j*2.05,Math.cos(j*2)*.3);cones.push(g);}
  const fir=mergeGeometries(cones);cones.forEach(g=>g.dispose());
  const lowBroad=new THREE.IcosahedronGeometry(4.3,0);lowBroad.scale(1,1.2,1);lowBroad.translate(0,7.5,0);
  const lowFir=new THREE.ConeGeometry(3.6,13,5);lowFir.translate(0,7.8,0);
  const high=[],low=[],dummy=new THREE.Object3D();
  for(const type of [0,1]){
    const rows=sites.filter(s=>s.type===type),material=type?palette.canopy:palette.leaf;
    const a=new THREE.InstancedMesh(type?broad:fir,material,rows.length),b=new THREE.InstancedMesh(type?lowBroad:lowFir,material,rows.length);
    a.name=type?'Alder and maple crowns':'Douglas fir crowns';b.name=a.name+' distant';
    rows.forEach((site,i)=>{dummy.position.set(site.x,heightAt(site.x,site.z)+0.55,site.z);dummy.scale.set(site.scale,site.scale*(.92+site.seed*.2),site.scale);dummy.rotation.y=site.seed*6.28;dummy.updateMatrix();a.setMatrixAt(i,dummy.matrix);});
    // Alternative LODs share one instance buffer. Never allocate a second matrix pool.
    b.instanceMatrix=a.instanceMatrix;a.castShadow=false;b.castShadow=false;a.receiveShadow=b.receiveShadow=true;
    a.computeBoundingSphere();b.computeBoundingSphere();root.add(a,b);high.push(a);low.push(b);
  }
  const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.22,.46,7,5),palette.timber,sites.length);
  sites.forEach((site,i)=>{dummy.position.set(site.x,heightAt(site.x,site.z)+3.8*site.scale,site.z);dummy.scale.set(site.scale,site.scale,site.scale);dummy.rotation.y=site.seed*6.28;dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);});
  trunk.castShadow=false;trunk.computeBoundingSphere();root.add(trunk);
  const update=position=>{
    const dx=Math.max(bounds.minX-position.x,0,position.x-bounds.maxX),dz=Math.max(bounds.minZ-position.z,0,position.z-bounds.maxZ);
    const detailed=Math.hypot(dx,dz,Math.max(0,position.y-heightAt(position.x,position.z)-180))<650;
    high.forEach(m=>m.visible=detailed);low.forEach(m=>m.visible=!detailed);return detailed;
  };
  update({x:0,z:0,y:0});
  const stats={sites:sites.length,matrixBytes:sites.length*64*2,draws:3,highTriangles:sites.filter(s=>s.type===1).length*240+sites.filter(s=>s.type===0).length*80};
  return {update,stats:()=>stats,dispose(){root.removeFromParent();const geometries=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);o.dispose();}});geometries.forEach(g=>g.dispose());root.clear();}};
}
