import * as THREE from "three/webgpu";
import { smoothstep, positionLocal } from "three/tsl";
import { project } from "./seattle-config.js";
import { rainierShape } from "./seattle-rainier-shape.js";
// Project the real bearing/angular size inside the far plane. Buildings still occlude it.
export function createRainier(parent) {
  const target = project(46.8523, -121.7603),
    shape = rainierShape(),
    group = new THREE.Group(),
    geometry = new THREE.BufferGeometry();
  const triangleCount = shape.indices.length / 3,
    snowVertices = shape.colors.filter((v, i) => i % 3 === 0 && v > 0.5).length;
  group.name = "Mount Rainier";
  group.userData.dynamic = true;
  parent.add(group);
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(shape.positions, 3),
  );
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(shape.colors, 3),
  );
  geometry.setIndex(shape.indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardNodeMaterial({
      vertexColors: true,
      roughness: 1,
      fog: false,
      transparent: true,
      depthWrite: false,
    }),
    mountain = new THREE.Mesh(geometry, material);
  material.opacityNode = smoothstep(180, 1200, positionLocal.y);
  group.add(mountain);
  const cloudMat = new THREE.MeshBasicNodeMaterial({
      color: 0xd5e3e7,
      fog: false,
    }),
    cloudGeo = new THREE.SphereGeometry(1, 24, 10),
    cloud = new THREE.Group();
  group.add(cloud);
  cloud.visible = false;
  cloud.userData.dynamic = true;
  for (const [x, y, s] of [
    [-650, 4800, 1],
    [0, 5000, 1.25],
    [700, 4850, 0.9],
  ]) {
    const m = new THREE.Mesh(cloudGeo, cloudMat);
    m.position.set(x, y, 0);
    m.scale.set(2100 * s, 180 * s, 850 * s);
    cloud.add(m);
  }
  let scale = 1;
  return {
    poseEffect(effect) {
      effect.position.copy(group.position);
      effect.scale.copy(group.scale);
    },
    react(progress) {
      cloud.visible = progress > 0 && progress < 1;
      cloud.rotation.y = progress * 0.7;
      cloud.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.15);
    },
    update(camera) {
      const dx = target.x - camera.x,
        dz = target.z - camera.z;
      scale = 18000 / Math.hypot(dx, dz);
      group.position.set(
        camera.x + dx * scale,
        camera.y * (1 - scale),
        camera.z + dz * scale,
      );
      group.scale.setScalar(scale);
    },
    stats: () => ({
      name: group.name,
      triangles: triangleCount,
      proxyDistance: 18000,
      scale,
      snowVertices,
      bearing: Math.atan2(target.x, target.z),
      cloud: cloud.visible,
    }),
    dispose() {
      group.removeFromParent();
      for (const o of [mountain, ...cloud.children])
        o.dispatchEvent({ type: "dispose" });
      geometry.dispose();
      cloudGeo.dispose();
      material.dispose();
      cloudMat.dispose();
    },
  };
}
