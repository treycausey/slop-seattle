import * as THREE from 'three/webgpu';
import {Fn,If,attribute,float,vec2,vec3,vec4,color,texture,positionWorld,cameraPosition,normalWorldGeometry,normalize,dot,abs,fract,floor,mix,max,smoothstep,fwidth,length,pow,log2} from 'three/tsl';
import {filteredPulse,hash2D,cityUniforms} from './tsl-materials.js';

let atlas;
function signAtlas(){
  if(atlas)return atlas;
  const c=document.createElement('canvas');c.width=512;c.height=256;
  const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.font='bold 23px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ['COFFEE ROASTERS','BOOKS & PAPER','RECORD SHOP','FLOWERS','NEIGHBORHOOD BAKERY','CYCLE WORKS','NOODLE HOUSE','CORNER STORE'].forEach((s,i)=>ctx.fillText(s,256,i*32+16,482));
  atlas=new THREE.CanvasTexture(c);atlas.colorSpace=THREE.NoColorSpace;atlas.anisotropy=4;atlas.name='Generated Seattle shop lettering';
  return atlas;
}
export function streetFronts(mat){
  if(mat.userData.streetFronts)return mat;
  mat.userData.streetFronts=true;
  const signs=signAtlas(),box=attribute('box','vec4'),wall=attribute('facadeWall','vec3');
  const oldColor=mat.colorNode,oldEmission=mat.emissiveNode??vec3(0),oldRough=mat.roughnessNode??float(mat.roughness);
  const s=wall.x.mul(box.x),y=box.y.sub(wall.y),seed=floor(box.w);
  const width=box.x.div(floor(box.x.div(6.4)).max(1)),u=fract(s.div(width)).mul(width);
  const fw=vec2(fwidth(s),fwidth(y)).max(0.001);
  const band=(v,a,b,p)=>filteredPulse(v,a,b,p);
  const shop=wall.z.lessThan(0.5).and(y.lessThan(3.7)).and(y.greaterThan(0));
  const fade=float(1).sub(smoothstep(60,100,length(positionWorld.sub(cameraPosition))));
  const result=Fn(()=>{
    const out=vec4(0).toVar();
    If(shop.and(fade.greaterThan(0.001)),()=>{
      const choice=hash2D(vec2(seed,floor(s.div(width))));
      const left=width.mul(0.12),right=width.mul(0.74);
      const opening=band(u,left,width.sub(0.18),fw.x).mul(band(y,0.18,2.75,fw.y));
      const door=band(u,right,width.sub(0.22),fw.x).mul(band(y,0.08,2.7,fw.y));
      const frame=max(band(u,right.sub(0.08),right.add(0.08),fw.x),band(y,2.3,2.39,fw.y));
      const glazing=opening.mul(float(1).sub(frame));
      const paint=mix(mix(color(0x253c38),color(0x784a37),choice.greaterThan(0.4)),color(0x233547),choice.greaterThan(0.72));
      const light=mix(color(0xffd5a2),color(0xc8dbd6),choice.greaterThan(0.65));
      const view=normalize(cameraPosition.sub(positionWorld)),n=normalize(normalWorldGeometry);
      const inward=abs(dot(view,n)).max(0.12);
      const tangent=vec3(n.z,0,n.x.negate());
      const rayX=dot(view,tangent).negate().div(inward),rayY=view.y.negate().div(inward);
      const px=u.add(rayX.mul(2.8)),py=y.add(rayY.mul(2.8));
      const detail=float(1).sub(smoothstep(0.04,0.22,max(fw.x,fw.y)));
      const shelves=band(fract(py.div(0.55)),0.05,0.14,fw.y.div(0.55));
      const goods=band(fract(px.div(0.32)),0.13,0.8,fw.x.div(0.32)).mul(band(fract(py.div(0.55)),0.15,0.73,fw.y.div(0.55)));
      const stock=mix(color(0x93623e),color(0x517e72),hash2D(floor(vec2(px.div(0.32),py.div(0.55))).add(seed)));
      const room=mix(color(0x62625a),mix(stock,color(0x302b27),shelves),goods.mul(detail));
      const counter=band(y.add(rayY),0.65,1.03,fw.y).mul(float(1).sub(door));
      const interior=mix(room,color(0x392a21),counter.mul(0.8)).mul(light).mul(0.5);
      const fresnel=pow(float(1).sub(inward).max(0),3);
      const glass=mix(interior,cityUniforms.uSkyHorizonColor,fresnel.mul(0.65).add(0.12));
      const fascia=band(y,2.8,3.5,fw.y);
      const signU=u.div(width.sub(0.2)),signY=y.sub(2.86).div(0.55);
      const signLod=log2(max(fw.x.mul(512).div(width),fw.y.mul(32/.55))).clamp(0,8);
      const ink=texture(signs,vec2(signU.clamp(0,1),float(1).sub(floor(choice.mul(8)).add(float(1).sub(signY.clamp(0,1))).div(8)))).level(signLod).a
        .mul(band(signU,0.03,0.97,fw.x.div(width))).mul(band(signY,0,1,fw.y.div(0.55))).mul(fascia).mul(float(1).sub(smoothstep(3,5,signLod)));
      const handle=band(u,width.sub(0.4),width.sub(0.34),fw.x).mul(band(y,0.85,1.3,fw.y));
      const rgb=mix(mix(paint,glass,glazing),color(0xf1e3c1),max(ink,handle));
      out.assign(vec4(rgb,glazing.mul(0.3).add(ink.mul(0.12))));
    });return out;
  })();
  const mask=shop.select(fade,0);
  mat.colorNode=mix(oldColor,result.rgb,mask);
  mat.emissiveNode=oldEmission.add(result.rgb.mul(result.a).mul(mask).mul(cityUniforms.uInteriorGlow));
  mat.roughnessNode=mix(oldRough,float(0.24),mask.mul(band(y,0.2,2.65,fw.y)));
  mat.seattleTextures=[signs];
  return mat;
}
export function disposeStreetSigns(){atlas?.dispose();atlas=null;}
