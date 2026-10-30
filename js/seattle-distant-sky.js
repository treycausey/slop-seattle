import * as THREE from "three/webgpu";
import { cubeTexture, positionWorld, cameraPosition, normalize, dot, smoothstep, float, color, fwidth, Fn, If, floor, fract, sin, vec2 } from "three/tsl";
import { noise2D } from './tsl-materials.js';

// Reuse the physical sky already baked for environment lighting. Nearby geometry stays full resolution.
// Distant clouds refresh with the lighting preset; the sun disc remains sharp at the drawing resolution.
export function createSeattleDistantSky(scene, lighting) {
  const sky=lighting.sky, material=new THREE.MeshBasicNodeMaterial({side:THREE.BackSide,depthWrite:false,fog:false});
  const direction=normalize(positionWorld.sub(cameraPosition));
  const angle=dot(direction,sky.sunPosition),edge=fwidth(angle).max(0.000001);
  material.vertexNode=sky.material.vertexNode;
  const daylight=cubeTexture(lighting.envRenderTarget.texture,direction).rgb.add(
    color(0xffedcb).mul(smoothstep(float(0.999956).sub(edge),float(0.999956).add(edge),angle))
      .mul(float(1).sub(smoothstep(0.3,0.7,lighting.uNightFactor)))
      .mul(float(1).sub(smoothstep(0.45,0.8,sky.cloudCoverage))).mul(12),
  );
  // Static, filtered stars and a cratered moon share the existing sky draw.
  // The uniform branch skips all night detail during daytime; no textures or geometry are added.
  material.colorNode=Fn(()=>{
    const result=daylight.toVar();
    If(lighting.uNightFactor.greaterThan(0.4),()=>{
      const grid=direction.xz.div(direction.y.add(1).max(0.1)).mul(180),cell=floor(grid);
      const seed=fract(sin(dot(cell,vec2(127.1,311.7))).mul(43758.5453));
      const distance=fract(grid).sub(0.5).length(),pixel=fwidth(grid).length().max(0.001);
      const stars=float(1).sub(smoothstep(float(0.065).sub(pixel),float(0.065).add(pixel),distance))
        .mul(smoothstep(0.985,0.999,seed)).mul(smoothstep(0.12,0.4,direction.y))
        .mul(float(0.008).div(pixel.mul(pixel)).min(1));
      // The night lighting preset already positions this source as moonlight.
      const moonAngle=angle,moonEdge=fwidth(moonAngle).max(0.000001);
      const moon=smoothstep(float(0.999965).sub(moonEdge),float(0.999965).add(moonEdge),moonAngle);
      const craters=noise2D(direction.xz.mul(1100)).mul(0.35).add(0.65);
      const haze=float(1).sub(smoothstep(0.2,0.65,sky.cloudCoverage));
      result.addAssign(color(0xc5d6ee).mul(stars.mul(1.8)).add(color(0xe4e8d5).mul(moon).mul(craters).mul(3)).mul(haze).mul(lighting.uNightFactor));
    });
    return result;
  })();
  const display=new THREE.Mesh(sky.geometry,material);display.scale.copy(sky.scale);display.renderOrder=2;scene.add(display);sky.removeFromParent();
  return {update(){if(sky.parent===scene)sky.removeFromParent();}};
}
