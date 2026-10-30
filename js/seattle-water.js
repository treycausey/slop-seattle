import * as THREE from 'three/webgpu';
import {Fn,vec2,vec3,vec4,float,texture,positionWorld,normalWorldGeometry,cameraPosition,cameraViewMatrix,time,mix,smoothstep,normalize,dot,clamp,pow,max,color} from 'three/tsl';
import {noise2D} from './tsl-materials.js';
import {createWaterWaveTexture} from './procedural-water.js';

export function createSeattleWater(){
  const mat=new THREE.MeshStandardNodeMaterial({metalness:0,roughness:.25});
  const waveTexture=createWaterWaveTexture();waveTexture.name='Generated Seattle wind spectrum';
  const sheltered=smoothstep(0.5,5.5,positionWorld.y);
  const waves=Fn(()=>{
    const p=positionWorld.xz,t=time,calm=mix(float(1),float(.4),sheltered);
    const gust=noise2D(p.mul(.006).add(vec2(t.mul(.009),t.mul(-.005)))).mul(.55).add(.65);
    const slope=vec2(0).toVar(),variance=float(.0015).toVar(),crest=float(0).toVar();
    for(const[L,rotation,amplitude]of[[67,0,.065],[24,1.93,.072],[8.9,4.07,.066],[3.4,2.71,.055]]){
      const c=Math.cos(rotation),s=Math.sin(rotation),uv=vec2(p.x.mul(c).sub(p.y.mul(s)),p.x.mul(s).add(p.y.mul(c))).div(L).add(vec2(.7,.23).mul(t.mul(.8*Math.sqrt(L/9)/L)));
      const sample=texture(waveTexture,uv),amp=gust.mul(calm).mul(amplitude);
      slope.addAssign(vec2(sample.x.mul(c).add(sample.y.mul(s)),sample.y.mul(c).sub(sample.x.mul(s))).mul(amp));
      variance.addAssign(max(sample.z.sub(dot(sample.xy,sample.xy)),0).mul(amp.mul(amp)));
      crest.addAssign(sample.w.mul(amplitude));
    }
    return vec4(slope,variance,crest);
  })();
  const n=normalize(mix(normalWorldGeometry,vec3(waves.x.negate(),1,waves.y.negate()),smoothstep(.5,.9,normalWorldGeometry.y)));
  mat.normalNode=cameraViewMatrix.transformDirection(n);
  mat.roughnessNode=clamp(pow(waves.z,.25).add(sheltered.mul(.04)),.12,.6);
  const view=normalize(cameraPosition.sub(positionWorld)),fresnel=pow(float(1).sub(clamp(dot(n,view),0,1)),5).mul(.98).add(.02);
  mat.metalnessNode=fresnel.mul(1.4).clamp(0,.85);
  const body=mix(color(0x13383d),color(0x2d4d46),noise2D(positionWorld.xz.mul(.0035)).mul(.65).add(sheltered.mul(.2)));
  mat.colorNode=mix(body,color(0x69928a),smoothstep(.16,.36,waves.w).mul(.3).mul(float(1).sub(sheltered)));
  let disposed=false;
  mat.seattleTextures=[waveTexture];
  mat.userData.dispose=()=>{if(disposed)return;disposed=true;waveTexture.dispose();mat.dispose();};
  return mat;
}
