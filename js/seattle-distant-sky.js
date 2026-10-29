import * as THREE from "three/webgpu";
import { cubeTexture, positionWorld, cameraPosition, normalize, dot, smoothstep, float, color, fwidth } from "three/tsl";

// Reuse the physical sky already baked for environment lighting. Nearby geometry stays full resolution.
// Distant clouds refresh with the lighting preset; the sun disc remains sharp at the drawing resolution.
export function createSeattleDistantSky(scene, lighting) {
  const sky=lighting.sky, material=new THREE.MeshBasicNodeMaterial({side:THREE.BackSide,depthWrite:false,fog:false});
  const direction=normalize(positionWorld.sub(cameraPosition));
  const angle=dot(direction,sky.sunPosition),edge=fwidth(angle).max(0.000001);
  material.vertexNode=sky.material.vertexNode;
  material.colorNode=cubeTexture(lighting.envRenderTarget.texture,direction).rgb.add(
    color(0xffedcb).mul(smoothstep(float(0.999956).sub(edge),float(0.999956).add(edge),angle))
      .mul(float(1).sub(lighting.uNightFactor))
      .mul(float(1).sub(smoothstep(0.45,0.8,sky.cloudCoverage))).mul(12),
  );
  const display=new THREE.Mesh(sky.geometry,material);display.scale.copy(sky.scale);display.renderOrder=2;scene.add(display);sky.removeFromParent();
  return {update(){if(sky.parent===scene)sky.removeFromParent();}};
}
