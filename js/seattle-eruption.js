import * as THREE from "three/webgpu";
import { tube, mesh, batchStatic } from "./seattle-geometry.js";
import { rainierHeight } from "./seattle-rainier-shape.js";

// All distances are mountain-local; Rainier projects the whole effect into the horizon.
export function createRainierEruption(rainier) {
  const group = new THREE.Group();
  group.name = "Rainier eruption";
  group.userData.dynamic = true;
  const ashMat = new THREE.MeshStandardNodeMaterial({
    color: 0x6b6865,
    roughness: 1,
    fog: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const emberMat = new THREE.MeshBasicNodeMaterial({
    color: 0xffc15b,
    fog: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const lavaMat = new THREE.MeshBasicNodeMaterial({
    color: 0xe44916,
    fog: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const coreMat = new THREE.MeshBasicNodeMaterial({
    color: 0xffb62d,
    fog: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const ash = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 14, 10),
      ashMat,
      28,
    ),
    embers = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      emberMat,
      18,
    );
  ash.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  embers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ash.frustumCulled = embers.frustumCulled = false;
  group.add(ash, embers);
  for (let i = 0; i < 6; i++) {
    const points = [];
    for (let j = 0; j < 15; j++) {
      const r = 100 + j * 420,
        a = -2.65 + i * 0.25 + Math.sin(j * 0.8 + i) * 0.035;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      points.push([x, rainierHeight(x, z) + 70, z]);
    }
    tube(group, lavaMat, points, 110, 40);
    tube(group, coreMat, points, 45, 40);
  }
  const vent = mesh(
    group,
    new THREE.TorusGeometry(220, 85, 8, 24),
    coreMat,
    0,
    4380,
    0,
  );
  vent.rotation.x = Math.PI / 2;
  batchStatic(group);
  const dummy = new THREE.Object3D();
  let progress = 0;
  return {
    group,
    update(p) {
      progress = p;
      rainier.poseEffect(group);
      const growth = Math.min(1, p / 0.23),
        fade = Math.max(0, Math.min(1, p / 0.1, (1 - p) / 0.22));
      ashMat.opacity = 0.8 * fade;
      emberMat.opacity = fade;
      lavaMat.opacity = 0.95 * fade;
      coreMat.opacity = fade;
      for (let i = 0; i < 28; i++) {
        const layer = (i % 7) / 6,
          a = i * 2.39996,
          r = (40 + layer * layer * 1600) * growth;
        dummy.position.set(
          Math.cos(a) * r + layer * layer * p * 1400,
          4740 + layer * 6500 * growth,
          Math.sin(a) * r,
        );
        const size =
          (420 + layer * 1500) * growth * (0.9 + 0.1 * Math.sin(p * 8 + i));
        dummy.scale.set(size * (1 + layer * 0.4), size * 1.15, size);
        dummy.rotation.set(i * 0.3, p * 0.3, i * 0.2);
        dummy.updateMatrix();
        ash.setMatrixAt(i, dummy.matrix);
      }
      for (let i = 0; i < 18; i++) {
        const phase = (p * 3 + i / 18) % 1,
          a = i * 2.39996,
          r = phase * 1800;
        dummy.position.set(
          Math.cos(a) * r,
          4392 + Math.sin(phase * Math.PI) * 1700 - phase * 600,
          Math.sin(a) * r,
        );
        dummy.scale.setScalar(25 + Math.sin(phase * Math.PI) * 45);
        dummy.updateMatrix();
        embers.setMatrixAt(i, dummy.matrix);
      }
      ash.instanceMatrix.needsUpdate = embers.instanceMatrix.needsUpdate = true;
    },
    stats: () => ({
      progress,
      ashPuffs: 28,
      embers: 18,
      draws: 4,
      proxyScale: group.scale.x,
    }),
    dispose() {
      group.removeFromParent();
      const geometries = new Set();
      group.traverse((o) => {
        if (o.isMesh) {
          if (o.isInstancedMesh) o.dispose();
          else o.dispatchEvent({ type: "dispose" });
          geometries.add(o.geometry);
        }
      });
      for (const g of geometries) g.dispose();
      for (const m of [ashMat, emberMat, lavaMat, coreMat]) m.dispose();
      group.clear();
    },
  };
}
