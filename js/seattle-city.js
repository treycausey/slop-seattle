import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { BOUNDS, DESTINATIONS, heightAt, project, shoreAt } from "./seattle-config.js";
import { polygonContains } from "./building-collision.js";
import { createSeattlePalette, createSeattleFacades, surface } from "./seattle-materials.js";
import { mesh, box, cylinder, batchStatic } from "./seattle-geometry.js";
import { buildSeattleLandmarks } from "./seattle-landmarks.js";

function extrude(ring, height, base = 0) {
  const shape = new THREE.Shape(ring.map((p) => new THREE.Vector2(p[0], -p[1])));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, base, 0);
  return geo;
}
function ribbon(points, width, offset = 0.1) {
  const positions = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    if (len < 0.1) continue;
    const nx = ((-dz / len) * width) / 2,
      nz = ((dx / len) * width) / 2,
      steps = Math.ceil(len / 18);
    for (let j = 0; j < steps; j++) {
      const p = [a[0] + (dx * j) / steps, a[1] + (dz * j) / steps],
        q = [a[0] + (dx * (j + 1)) / steps, a[1] + (dz * (j + 1)) / steps];
      const corners = [
        [p[0] - nx, p[1] - nz],
        [p[0] + nx, p[1] + nz],
        [q[0] + nx, q[1] + nz],
        [q[0] - nx, q[1] - nz],
      ];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const [x, z] = corners[k];
        positions.push(x, heightAt(x, z) + offset, z);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}
function architecturalColliders(landmarks) {
  const out = [];
  const add = (g, x, z, w, d, y, h) => {
    const cs = Math.cos(g.rotation.y),
      sn = Math.sin(g.rotation.y),
      cx = g.position.x + x * cs + z * sn,
      cz = g.position.z - x * sn + z * cs,
      hx = w / 2,
      hz = d / 2;
    const ex = Math.abs(cs) * hx + Math.abs(sn) * hz,
      ez = Math.abs(sn) * hx + Math.abs(cs) * hz;
    out.push({
      minX: cx - ex,
      maxX: cx + ex,
      minZ: cz - ez,
      maxZ: cz + ez,
      minY: g.position.y + y,
      maxY: g.position.y + y + h,
      obb: { cx, cz, hx, hz, cs, sn },
      landmark: g.name,
    });
  };
  for (const g of landmarks) {
    const id = DESTINATIONS.find((d) => d.name === g.name).id;
    if (id === "needle") {
      add(g, 0, 0, 39, 39, 0, 5);
      add(g, 0, 0, 6, 6, 5, 141);
      add(g, 0, 0, 42, 42, 146, 22);
      add(g, 0, 0, 4, 4, 168, 16);
    }
    if (id === "market") add(g, 0, -3, 96, 25, 0, 15);
    if (id === "columbia")
      for (const [x, z, w, d, h] of [
        [-19, 3, 31, 48, 284],
        [4, 0, 31, 48, 273],
        [25, -3, 24, 48, 258],
      ])
        add(g, x, z, w, d, 0, h);
    if (id === "smith") {
      add(g, 0, 0, 39, 35, 0, 34);
      add(g, 0, 0, 27, 28, 34, 108);
    }
    if (id === "spheres")
      for (const [x, r] of [
        [-24, 15],
        [0, 20],
        [25, 14],
      ])
        add(g, x, 0, r * 1.8, r * 1.8, 0, r * 1.64);
    if (id === "stadium")
      for (const side of [-1, 1]) {
        add(g, side * 62, 0, 58, 190, 0, 25);
        add(g, 0, side * 108, 60, 30, 0, 20);
      }
  }
  return out;
}
export function buildSeattle(scene, data) {
  const group = new THREE.Group();
  group.name = "Seattle";
  scene.add(group);
  const p = createSeattlePalette(),
    styles = createSeattleFacades(),
    colliders = [],
    ferries = [];
  const bay = mesh(group, new THREE.PlaneGeometry(70000, 70000), p.water, 0, -0.5, 0);
  bay.name = "Elliott Bay";
  bay.rotation.x = -Math.PI / 2;
  bay.castShadow = false;
  const ground = [];
  for (let z = BOUNDS.minZ; z < BOUNDS.maxZ; z += 36)
    for (let x = -2200; x < BOUNDS.maxX; x += 36) {
      const cx = x + 18,
        cz = z + 18;
      if (cx < shoreAt(cz).westX || (cz < -1930 && cx > -100 && cx < 1150)) continue;
      for (const [dx, dz] of [
        [0, 0],
        [0, 36],
        [36, 36],
        [0, 0],
        [36, 36],
        [36, 0],
      ])
        ground.push(x + dx, heightAt(x + dx, z + dz), z + dz);
    }
  const terrain = new THREE.BufferGeometry();
  terrain.setAttribute("position", new THREE.Float32BufferAttribute(ground, 3));
  terrain.computeVertexNormals();
  mesh(group, terrain, p.ground);
  for (const park of data.parks) {
    if (park.ring.length < 4) continue;
    mesh(group, extrude(park.ring, 0.15, heightAt(park.x, park.z) + 0.13), p.grass);
  }
  const roadGeo = [],
    curbGeo = [],
    lineGeo = [];
  for (const road of data.roads) {
    curbGeo.push(ribbon(road.points, road.width + 5, 0.19));
    roadGeo.push(ribbon(road.points, road.width, 0.23));
    if (road.width >= 9) lineGeo.push(ribbon(road.points, 0.18, 0.27));
  }
  for (const [geos, mat] of [
    [curbGeo, p.paving],
    [roadGeo, p.asphalt],
    [lineGeo, surface("metal", 0xd3bd80)],
  ])
    if (geos.length) {
      const m = mesh(group, mergeGeometries(geos), mat);
      m.material.side = THREE.DoubleSide;
      geos.forEach((g) => g.dispose());
    }
  const batches = new Map(),
    roofParts = [];
  let buildingCount = 0;
  for (const b of data.buildings) {
    if (b.ring.length < 4) continue;
    if (
      DESTINATIONS.some(
        (d) =>
          d.id !== "lake" &&
          Math.hypot(d.x - b.x, d.z - b.z) <
            (d.id === "stadium" ? 160 : d.id === "needle" ? 48 : d.id === "market" ? 65 : 35),
      )
    )
      continue;
    const y = heightAt(b.x, b.z),
      footingY = Math.min(y, ...b.ring.map(([x, z]) => heightAt(x, z))),
      g = extrude(b.ring, b.height + y - footingY, footingY),
      style = b.height > 65 ? b.id % 3 : 3 + (b.id % 5);
    const key = `${Math.floor(b.x / 600)}:${Math.floor(b.z / 600)}:${style}`;
    if (!batches.has(key)) batches.set(key, { style, geos: [] });
    batches.get(key).geos.push(g);
    const xs = b.ring.map((p) => p[0]),
      zs = b.ring.map((p) => p[1]),
      minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minZ = Math.min(...zs),
      maxZ = Math.max(...zs);
    const polygon = { outer: b.ring.map(([x, z]) => ({ x, z })), holes: [] };
    colliders.push({ minX, maxX, minZ, maxZ, minY: footingY, maxY: y + b.height, polygon });
    buildingCount++;
    // Deterministic rooftop plant is cheap batched geometry, never a downloaded model.
    if (b.id % 3 === 0 && b.height > 9 && maxX - minX > 14 && maxZ - minZ > 14) {
      const w = Math.min(9, (maxX - minX) * 0.22),
        d = Math.min(7, (maxZ - minZ) * 0.22);
      if (
        [
          [-w, -d],
          [w, -d],
          [w, d],
          [-w, d],
        ].every(([x, z]) => polygonContains(polygon, b.x + x, b.z + z))
      ) {
        const penthouse = new THREE.BoxGeometry(w * 1.8, 2.2, d * 1.6);
        penthouse.translate(b.x, y + b.height + 1.1, b.z);
        roofParts.push(penthouse);
        const vent = new THREE.BoxGeometry(w, 0.5, d);
        vent.translate(b.x, y + b.height + 2.45, b.z);
        roofParts.push(vent);
      }
    }
  }
  for (const { style, geos } of batches.values()) {
    mesh(group, mergeGeometries(geos), styles[style]);
    geos.forEach((g) => g.dispose());
  }
  if (roofParts.length) {
    mesh(group, mergeGeometries(roofParts), p.steel);
    roofParts.forEach((g) => g.dispose());
  }
  const landmarks = buildSeattleLandmarks(group, p);
  colliders.push(...architecturalColliders(landmarks.landmarks));
  // Four tapered branch tiers per tree, with one foliage and one trunk draw for the entire city.
  const sites = [];
  for (let i = 0; i < 850; i++) {
    const x = -1850 + ((i * 1543.17) % 3700),
      z = -2400 + ((i * 733.51) % 4600);
    if (x < shoreAt(z).westX + 20 || (z < -1930 && x > -100 && x < 1150)) continue;
    if (
      DESTINATIONS.some((d) =>
        d.id === "stadium"
          ? Math.abs(d.x - x) < 100 && Math.abs(d.z - z) < 135
          : d.id !== "needle" && d.id !== "lake" && Math.hypot(d.x - x, d.z - z) < 55,
      )
    )
      continue;
    if (data.buildings.some((b) => Math.abs(b.x - x) < 30 && Math.abs(b.z - z) < 30)) continue;
    if (data.roads.some((r) => r.points.some((q) => Math.hypot(q[0] - x, q[1] - z) < 22))) continue;
    sites.push([x, heightAt(x, z), z]);
  }
  const tiers = [];
  for (let j = 0; j < 4; j++) {
    const geo = new THREE.ConeGeometry(4.2 - j * 0.8, 6.5 - j * 0.5, 9);
    geo.translate(0, 5 + j * 2.7, 0);
    tiers.push(geo);
  }
  const tree = new THREE.InstancedMesh(mergeGeometries(tiers), p.leaf, sites.length),
    trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.45, 0.7, 7, 6),
      p.timber,
      sites.length,
    ),
    dummy = new THREE.Object3D();
  tiers.forEach((g) => g.dispose());
  sites.forEach(([x, y, z], i) => {
    const s = 0.75 + (i % 7) * 0.07;
    dummy.position.set(x, y, z);
    dummy.scale.set(s, s * (0.9 + (i % 4) * 0.08), s);
    dummy.rotation.y = i * 2.4;
    dummy.updateMatrix();
    tree.setMatrixAt(i, dummy.matrix);
    dummy.position.y = y + 3;
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
  });
  group.add(tree, trunks);
  tree.castShadow = true;
  for (let i = 0; i < 2; i++) {
    const f = new THREE.Group();
    group.add(f);
    box(f, p.dark, 0, 0, 0, 21, 3, 88);
    box(f, p.limestone, 0, 3, 0, 23, 3, 82);
    box(f, p.copper, 0, 6, 0, 23.2, 1.4, 82.2);
    box(f, styles[0], 0, 7.4, 0, 21, 7, 72);
    box(f, p.white, 0, 14.4, 0, 23, 1, 76);
    for (const z of [-24, 24]) {
      box(f, p.white, 0, 15.4, z, 12, 5, 13);
      box(f, styles[0], 0, 17, z, 12.2, 2.5, 13.2);
      box(f, p.dark, 0, 20, z, 5, 3, 4);
    }
    batchStatic(f);
    ferries.push(f);
  }
  for (let i = 0; i < 22; i++)
    mesh(
      group,
      new THREE.ConeGeometry(1700, 800 + ((i * 377) % 1200), 5),
      surface("stone", 0x778c95),
      -14000 - (i % 3) * 1100,
      250,
      -22000 + i * 2000,
    );
  const rainier = project(46.8523, -121.7603);
  cylinder(group, surface("stone", 0xb8c7cc), rainier.x, 0, rainier.z, 0, 6500, 4392, 10);
  cylinder(group, p.white, rainier.x, 2700, rainier.z, 0, 2450, 1692, 10);
  return {
    group,
    colliders,
    buildingCount,
    visualStats() {
      let meshes = 0,
        triangles = 0;
      const textures = new Set(),
        materials = new Set();
      group.traverse((o) => {
        if (!o.isMesh) return;
        meshes++;
        triangles +=
          ((o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3) *
          (o.isInstancedMesh ? o.count : 1);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          materials.add(m);
          if (m.map) textures.add(m.map);
        }
      });
      const wheel = landmarks.landmarks.find((g) => g.name === "Seattle Great Wheel"),
        matrix = new THREE.Matrix4(),
        q = new THREE.Quaternion(),
        v = new THREE.Vector3(),
        s = new THREE.Vector3();
      wheel.userData.cabinMesh.getMatrixAt(0, matrix);
      matrix.decompose(v, q, s);
      return {
        meshes,
        triangles,
        materials: materials.size,
        generatedTextures: textures.size,
        wheelCabins: wheel.userData.cabinCount,
        wheelCabinRoll: new THREE.Euler().setFromQuaternion(q).z,
        landmarks: landmarks.landmarks.map((g) => ({
          name: g.name,
          signature: g.userData.signature,
        })),
      };
    },
    update(t) {
      landmarks.update(t);
      ferries.forEach((f, i) => {
        f.position.set(
          -1100 - i * 1100 + Math.sin(t * 0.008 + i * 2) * 650,
          0,
          900 + Math.cos(t * 0.008 + i * 2) * 1100,
        );
        f.rotation.y = t * 0.008 + i * 2;
      });
    },
  };
}
