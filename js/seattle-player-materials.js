import * as THREE from "three/webgpu";
import { uniformArray } from "three/tsl";
import { createPersonMaterial } from "./pedestrians.js";
import { createSeattleAvatar } from "./seattle-avatar.js";
import { cityUniforms } from './tsl-materials.js';

export function preparePlayerMaterials(scene, controllers, renderer) {
  const sync = [];
  if (!renderer.backend.isWebGPUBackend) {
    // WebGL treats the upstream storage pose as a short vertex attribute, causing
    // GL_INVALID_OPERATION on a 2,189-vertex character. Our single-player crowds
    // fit in ordinary uniform arrays and can use the same geometry and skinning.
    for (const crowd of [
      controllers.entities.person.crowd,
      controllers.entities.cyclist.riderCrowd,
    ]) {
      for (const lod of crowd.lods) {
        const vectors = Array.from(
          { length: lod.pose.value.array.length / 4 },
          () => new THREE.Vector4(),
        );
        const uniforms = uniformArray(vectors, "vec4");
        lod.mesh.material.dispose();
        lod.mesh.material = createPersonMaterial(uniforms);
        sync.push(() =>
          { if(lod.mesh.visible) vectors.forEach((v, i) => v.fromArray(lod.pose.value.array, i * 4)); },
        );
      }
    }
  }
  // The upstream SSR pipeline has normal and metalRough attachments. Seattle
  // renders a single color attachment, so those decal overrides must be removed.
  scene.traverse((object) => {
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      if (material?.mrtNode) material.mrtNode = null;
    }
  });
  const avatar = createSeattleAvatar(scene, controllers);
  const culledMeshes=new Set();
  const update = (focus, hideHelicopter=false) => {
    // Zero-output daytime lamps need no shader nodes. At night retain a stable
    // light set regardless of vehicle range, including the inactive bicycle.
    const lampsOn=cityUniforms.uInteriorGlow.value>.6;
    for(const light of [...controllers.entities.car.headLights,controllers.entities.cyclist.headLight])light.visible=lampsOn;
    if(focus)for(const [mode,e]of Object.entries(controllers.entities)){
      const visible=mode===controllers.activeMode || e.position.distanceToSquared(focus)<350**2;
      // Keep the light hierarchy stable. Removing parked vehicle lights changes the
      // lighting shader key and recompiles the whole visible city on the next frame.
      if(mode!==controllers.activeMode||e.presentationVisible===false)e.mesh.visible=true;
      e.mesh.traverse(o=>{
        if(!o.isMesh)return;
        if(!visible&&o.visible){culledMeshes.add(o);o.visible=false;}
        else if(visible&&culledMeshes.delete(o))o.visible=true;
      });
      e.presentationVisible=visible;
      if(mode==='helicopter'&&hideHelicopter)e.mesh.visible=false;
      for(const crowd of [e.crowd,e.riderCrowd])if(crowd)
        for(const lod of crowd.lods)lod.mesh.visible=visible&&lod.mesh.count>0;
    }
    sync.forEach((fn) => fn());
    avatar.update();
  };
  update.avatarStats = avatar.stats;
  update.frameAvatar = avatar.frame;
  update();
  return update;
}
