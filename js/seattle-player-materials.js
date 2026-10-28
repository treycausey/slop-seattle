import * as THREE from "three/webgpu";
import { uniformArray } from "three/tsl";
import { createPersonMaterial } from "./pedestrians.js";

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
        sync.push(() => vectors.forEach((v, i) => v.fromArray(lod.pose.value.array, i * 4)));
      }
    }
  }
  // The upstream SSR pipeline has normal and metalRough attachments. Seattle
  // renders a single color attachment, so those decal overrides must be removed.
  scene.traverse((object) => {
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material?.mrtNode) material.mrtNode = null;
    }
  });
  const update = () => sync.forEach((fn) => fn());
  update();
  return update;
}
