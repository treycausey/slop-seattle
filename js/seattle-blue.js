import * as THREE from "three/webgpu";
import { mesh, box, cylinder, batchStatic } from "./seattle-geometry.js";
import { terrainHeightAt, BOUNDS } from "./seattle-config.js";
import {
  BLUE_OFFSETS,
  stepBlueFlight,
  BlueSmokeHistory,
} from "./seattle-blue-flight.js";

function jetModel() {
  const g = new THREE.Group();
  const navy = new THREE.MeshStandardNodeMaterial({
      color: 0x074994,
      roughness: 0.32,
      metalness: 0.45,
    }),
    gold = new THREE.MeshStandardNodeMaterial({
      color: 0xffd12c,
      roughness: 0.4,
      metalness: 0.3,
    }),
    glass = new THREE.MeshStandardNodeMaterial({
      color: 0x18313e,
      roughness: 0.12,
      metalness: 0.7,
    }),
    dark = new THREE.MeshStandardNodeMaterial({
      color: 0x20252c,
      roughness: 0.65,
    });
  const rings = [
      [-8, 0.8],
      [-5, 1.3],
      [0, 1.2],
      [4, 0.8],
      [9, 0.025],
    ],
    positions = [],
    indices = [];
  for (const [z, r] of rings)
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      positions.push(Math.cos(a) * r, Math.sin(a) * r * 0.7, z);
    }
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < 16; i++) {
      const a = j * 17 + i,
        b = a + 17;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  hull.setIndex(indices);
  hull.computeVertexNormals();
  mesh(g, hull, navy);
  const patch = (points, material, y) => {
    const shape = new THREE.Shape(
      points.map(([x, z]) => new THREE.Vector2(x, z)),
    );
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: false,
    });
    geo.rotateX(Math.PI / 2);
    return mesh(g, geo, material, 0, y, 0);
  };
  for (const side of [-1, 1]) {
    patch(
      [
        [side * 1, 3],
        [side * 7, -2],
        [side * 7, -4.5],
        [side * 1, -3],
      ],
      navy,
      0,
    );
    patch(
      [
        [side * 2, 1],
        [side * 6, -2.1],
        [side * 6, -2.7],
        [side * 2, 0],
      ],
      gold,
      0.2,
    );
    patch(
      [
        [side * 0.8, -5],
        [side * 4, -6.6],
        [side * 4, -8],
        [side * 0.8, -7],
      ],
      navy,
      0.25,
    );
    const fin = new THREE.Shape([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.3, 3.3),
      new THREE.Vector2(-2.1, 2.7),
      new THREE.Vector2(-3, 0),
    ]);
    const geo = new THREE.ExtrudeGeometry(fin, {
      depth: 0.18,
      bevelEnabled: false,
    });
    geo.rotateY(-Math.PI / 2);
    const tail = mesh(g, geo, navy, side * 1.1, 0.4, -5.5);
    tail.rotation.z = -side * 0.2;
    box(g, gold, side * 1.1, 2.8, -4.5, 0.3, 0.2, 2);
    box(g, gold, side * 1.07, 0.25, 1, 0.12, 0.18, 7);
    box(g, navy, side * 1.1, -0.8, -1, 1.1, 1.1, 5);
    const nozzle = cylinder(
      g,
      dark,
      side * 0.65,
      -0.65,
      -7.6,
      0.6,
      0.7,
      1.5,
      16,
    );
    nozzle.rotation.x = Math.PI / 2;
  }
  const canopy = mesh(g, new THREE.SphereGeometry(1, 20, 10), glass, 0, 1, 2.4);
  canopy.scale.set(0.65, 0.65, 2.6);
  box(g, gold, 0, 0.1, 6, 0.18, 0.12, 4);
  batchStatic(g);
  return g;
}
export function createBlueAngels(scene, controller) {
  const e = controller.entities.helicopter,
    root = new THREE.Group(),
    source = jetModel(),
    draws = [];
  root.name = "Blue Angels diamond";
  root.userData.dynamic = true;
  scene.add(root);
  for (const part of source.children) {
    const draw = new THREE.InstancedMesh(part.geometry, part.material, 4);
    draw.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    draw.frustumCulled = false;
    draws.push(draw);
    root.add(draw);
  }
  source.clear();
  const history = new BlueSmokeHistory(),
    positions = new Float32Array(4 * 64 * 2 * 3),
    indices = [];
  for (let jet = 0; jet < 4; jet++)
    for (let i = 0; i < 63; i++) {
      const a = (jet * 64 + i) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  smokeGeo.setIndex(indices);
  const smokeMat = new THREE.MeshBasicNodeMaterial({
    color: 0xf5f6f3,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const smoke = new THREE.Mesh(smokeGeo, smokeMat);
  smoke.userData.dynamic = true;
  smoke.frustumCulled = false;
  scene.add(smoke);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    matrix = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    rotation = new THREE.Euler(),
    point = new THREE.Vector3(),
    offset = new THREE.Vector3(),
    scale = new THREE.Vector3(1, 1, 1),
    samples = new Float32Array(12),
    desired = new THREE.Vector3(),
    target = new THREE.Vector3();
  let smokeOn = !reduced.matches,
    clock = 0,
    lastSample = 0,
    disposed = false,
    floorAt = -Infinity,
    cachedFloor = 150;
  e.bank = e.pitch = 0;
  e.speed = 110;
  e.mesh.visible = false;
  function floor() {
    const x = e.position.x + Math.sin(e.heading) * 200,
      z = e.position.z + Math.cos(e.heading) * 200;
    let y = Math.max(terrainHeightAt(x, z) + 140, 150);
    for (const c of controller.nearColliders(x, z, 350))
      y = Math.max(y, c.maxY + 90);
    return y;
  }
  function render(pov = false) {
    q.setFromEuler(
      rotation.set(-e.pitch, e.heading, reduced.matches ? 0 : e.bank, "YXZ"),
    );
    for (let i = 0; i < 4; i++) {
      offset.fromArray(BLUE_OFFSETS[i]).applyQuaternion(q);
      point.copy(e.position).add(offset);
      samples[i * 3] = point.x - Math.sin(e.heading) * 8;
      samples[i * 3 + 1] = point.y;
      samples[i * 3 + 2] = point.z - Math.cos(e.heading) * 8;
      scale.setScalar(i === 0 && pov ? 0 : 1);
      matrix.compose(point, q, scale);
      for (const draw of draws) draw.setMatrixAt(i, matrix);
    }
    for (const draw of draws) draw.instanceMatrix.needsUpdate = true;
  }
  function reset() {
    history.clear();
    clock = lastSample = 0;
    cachedFloor = floor();
    floorAt = 0;
    e.position.y = Math.max(350, e.position.y, cachedFloor);
    e.bank = e.pitch = 0;
    e.speed = 110;
    smoke.visible = false;
    render();
  }
  reset();
  return {
    reset,
    toggleSmoke() {
      smokeOn = !smokeOn;
      history.clear();
      smoke.visible = false;
      return smokeOn;
    },
    update(dt, keys) {
      clock += dt;
      if (clock - floorAt >= 0.2) {
        cachedFloor = floor();
        floorAt = clock;
      }
      stepBlueFlight(e, keys, dt, BOUNDS, cachedFloor);
      render();
      if (smokeOn && clock - lastSample >= 0.1) {
        history.record(samples);
        lastSample = clock;
      }
    },
    camera(camera, kind, dt) {
      const pov = kind === "pov",
        action = kind === "action";
      render(pov);
      if (!["chase", "action", "pov"].includes(kind)) return;
      const yaw = e.heading + camera.orbitYawOffset,
        dist = (pov ? 0 : action ? 65 : 140) * camera.zoomMultiplier;
      desired.set(
        e.position.x - Math.sin(yaw) * dist + (action ? Math.cos(yaw) * 50 : 0),
        e.position.y +
          (pov ? 1.4 : action ? 12 : 60) +
          camera.orbitPitchOffset * dist,
        e.position.z - Math.cos(yaw) * dist - (action ? Math.sin(yaw) * 50 : 0),
      );
      target.set(
        e.position.x + Math.sin(yaw) * (pov ? 180 : action ? 15 : -25),
        e.position.y - (pov || action ? 0 : 1) + e.pitch * 25,
        e.position.z + Math.cos(yaw) * (pov ? 180 : action ? 15 : -25),
      );
      camera.currentPos.copy(desired);
      camera.camera.position.copy(desired);
      camera.camera.lookAt(target);
      smoke.visible = smokeOn && history.count > 1;
      if (smoke.visible) {
        const rightX = Math.cos(yaw),
          rightZ = -Math.sin(yaw);
        for (let jet = 0; jet < 4; jet++)
          for (let age = 0; age < 64; age++) {
            const at = history.index(Math.min(age, history.count - 1), jet),
              w = age < history.count ? (1.2 + age * 0.12) * (1 - age / 64) : 0;
            const n = (jet * 64 + age) * 6;
            positions[n] = history.positions[at] - rightX * w;
            positions[n + 1] = history.positions[at + 1];
            positions[n + 2] = history.positions[at + 2] - rightZ * w;
            positions[n + 3] = history.positions[at] + rightX * w;
            positions[n + 4] = history.positions[at + 1];
            positions[n + 5] = history.positions[at + 2] + rightZ * w;
          }
        smokeGeo.attributes.position.needsUpdate = true;
      }
    },
    stats: () => ({
      active: true,
      jets: 4,
      draws: draws.length + 1,
      smoke: smokeOn,
      smokeSamples: history.count,
      smokeCapacity: history.capacity,
      smokeBytes:
        history.positions.byteLength +
        positions.byteLength +
        smokeGeo.index.array.byteLength,
      speed: e.speed,
      bank: e.bank,
      pitch: e.pitch,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      smoke.removeFromParent();
      for (const draw of draws) {
        draw.dispose();
        draw.geometry.dispose();
        draw.material.dispose();
      }
      smoke.dispatchEvent({ type: "dispose" });
      smokeGeo.dispose();
      smokeMat.dispose();
      history.clear();
      e.mesh.visible = true;
      e.speed = 0;
    },
  };
}
