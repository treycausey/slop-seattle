import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createCurtainWallMaterial, createPreWarBuildingMaterial } from "./tsl-materials.js";
import { BOUNDS, DESTINATIONS, heightAt, project, shoreAt } from "./seattle-config.js";

const material = (color, extra = {}) =>
  new THREE.MeshStandardNodeMaterial({ color, roughness: 0.8, ...extra });
const concrete = material(0xd4d3bd),
  dark = material(0x354147),
  green = material(0x46674a),
  white = material(0xe7ece8);
function mesh(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(parent, mat, x, y, z, w, h, d) {
  return mesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z);
}
function cylinder(parent, mat, x, y, z, rt, rb, h, segments = 24) {
  return mesh(parent, new THREE.CylinderGeometry(rt, rb, h, segments), mat, x, y + h / 2, z);
}
function beam(parent, mat, a, b, r) {
  const av = new THREE.Vector3(...a),
    bv = new THREE.Vector3(...b),
    v = bv.clone().sub(av);
  const m = mesh(parent, new THREE.CylinderGeometry(r, r, v.length(), 8), mat);
  m.position.copy(av.add(bv).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  return m;
}
function sign(parent, text, x, y, z, width, color = "#b22c2a") {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 160;
  const c = canvas.getContext("2d");
  c.fillStyle = color;
  c.fillRect(0, 0, 1024, 160);
  c.fillStyle = "#fff4d6";
  c.font = "bold 86px sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, 512, 84, 1000);
  const m = mesh(
    parent,
    new THREE.PlaneGeometry(width, (width * 160) / 1024),
    new THREE.MeshBasicNodeMaterial({
      map: new THREE.CanvasTexture(canvas),
      side: THREE.DoubleSide,
    }),
    x,
    y,
    z,
  );
  return m;
}
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
      const t = j / steps,
        u = (j + 1) / steps;
      const p = [a[0] + dx * t, a[1] + dz * t],
        q = [a[0] + dx * u, a[1] + dz * u];
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
export function buildSeattle(scene, data) {
  const group = new THREE.Group();
  group.name = "Seattle";
  scene.add(group);
  const colliders = [],
    wheelParts = [],
    ferries = [];
  // Elliott Bay, Lake Union, a sloping mainland, and a distant Olympic silhouette.
  const water = material(0x386574, { metalness: 0.45, roughness: 0.28 });
  const bay = mesh(group, new THREE.PlaneGeometry(70000, 70000), water, 0, -0.5, 0);
  bay.rotation.x = -Math.PI / 2;
  bay.castShadow = false;
  const ground = [];
  for (let z = BOUNDS.minZ; z < BOUNDS.maxZ; z += 36)
    for (let x = -2200; x < BOUNDS.maxX; x += 36) {
      const cx = x + 18,
        cz = z + 18;
      if (cx < shoreAt(cz).westX) continue;
      if (cz < -1930 && cx > -100 && cx < 1150) continue; // south end of Lake Union
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
  mesh(group, terrain, material(0x777c73));
  // Park boundaries and streets come from OSM, projected once at build time.
  for (const park of data.parks) {
    if (park.ring.length < 4) continue;
    const g = extrude(park.ring, 0.15, heightAt(park.x, park.z) + 0.13);
    mesh(group, g, green);
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
    [curbGeo, material(0xa5aaa2)],
    [roadGeo, material(0x353e43, { roughness: 0.58 })],
    [lineGeo, material(0xccb875)],
  ])
    if (geos.length) {
      const m = mesh(group, mergeGeometries(geos), mat);
      m.material.side = THREE.DoubleSide;
      geos.forEach((g) => g.dispose());
    }
  const styles = [
    createCurtainWallMaterial({ glassTint: 0x334f5a }),
    createCurtainWallMaterial({ glassTint: 0x59706b }),
    createPreWarBuildingMaterial({ stoneColor: 0xb6aaa0 }),
    createPreWarBuildingMaterial({ stoneColor: 0x8b7770 }),
  ];
  // Merge nearby footprints into material batches; preserve exact footprint polygons for collisions.
  const batches = new Map();
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
      g = extrude(b.ring, b.height, y),
      style = b.height > 65 ? b.id % 2 : 2 + (b.id % 2);
    const key = `${Math.floor(b.x / 450)}:${Math.floor(b.z / 450)}:${style}`;
    if (!batches.has(key)) batches.set(key, { style, geos: [] });
    batches.get(key).geos.push(g);
    const xs = b.ring.map((p) => p[0]),
      zs = b.ring.map((p) => p[1]);
    colliders.push({
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
      minY: y,
      maxY: y + b.height,
      polygon: { outer: b.ring.map(([x, z]) => ({ x, z })), holes: [] },
    });
    buildingCount++;
  }
  for (const { style, geos } of batches.values()) {
    mesh(group, mergeGeometries(geos), styles[style]);
    geos.forEach((g) => g.dispose());
  }
  // Bespoke silhouettes, each placed at its real latitude and longitude.
  for (const d of DESTINATIONS) {
    const landmark = new THREE.Group();
    landmark.name = d.name;
    landmark.position.set(d.x, heightAt(d.x, d.z), d.z);
    group.add(landmark);
    if (d.id === "needle") {
      const steel = material(0xd9ddd1, { metalness: 0.6, roughness: 0.35 });
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3,
          b = a + 0.7;
        beam(
          landmark,
          steel,
          [Math.cos(a) * 26, 0, Math.sin(a) * 26],
          [Math.cos(b) * 7, 110, Math.sin(b) * 7],
          2.2,
        );
        beam(
          landmark,
          steel,
          [Math.cos(b) * 7, 110, Math.sin(b) * 7],
          [Math.cos(a) * 17, 151, Math.sin(a) * 17],
          1.6,
        );
      }
      cylinder(landmark, steel, 0, 146, 0, 21, 15, 5, 48);
      cylinder(landmark, dark, 0, 151, 0, 20, 20, 6, 48);
      cylinder(landmark, steel, 0, 157, 0, 21, 28, 4, 48);
      cylinder(landmark, concrete, 0, 161, 0, 9, 22, 5, 48);
      cylinder(landmark, steel, 0, 166, 0, 0.45, 3, 18, 24);
      cylinder(landmark, green, 0, 0, 0, 37, 37, 3);
      colliders.push({
        minX: d.x - 9,
        maxX: d.x + 9,
        minZ: d.z - 9,
        maxZ: d.z + 9,
        minY: landmark.position.y,
        maxY: landmark.position.y + 184,
      });
    } else if (d.id === "market") {
      box(landmark, material(0xb4aa97), 0, 0, 0, 100, 16, 34);
      box(landmark, material(0xa14234), 0, 16, 0, 104, 2, 38);
      sign(landmark, "PUBLIC MARKET", 0, 24, 18, 57);
      sign(landmark, "PIKE PLACE", 0, 13, 18, 35, "#335a46");
      for (let x = -42; x < 48; x += 12) box(landmark, material(0x356850), x, 6, 20, 10, 0.7, 5);
      const clock = mesh(landmark, new THREE.CircleGeometry(3.8, 32), white, 43, 23, 18);
      clock.rotation.y = 0;
      box(landmark, dark, 43, 23, 18.1, 0.18, 2.7, 0.12);
      box(landmark, dark, 42, 22.9, 18.15, 2.3, 0.18, 0.1);
    } else if (d.id === "wheel") {
      // Pier 57 projects over the bay; the wheel rotates in its own local frame.
      box(landmark, concrete, 0, -landmark.position.y + 3, 0, 40, 2, 100);
      landmark.position.y = 5;
      for (const x of [-10, 10]) beam(landmark, white, [x, 0, -5], [0, 29, 0], 1.2);
      const spin = new THREE.Group();
      spin.position.y = 29;
      landmark.add(spin);
      wheelParts.push(spin);
      const rim = mesh(spin, new THREE.TorusGeometry(26, 0.45, 8, 64), white);
      rim.rotation.y = 0;
      for (let i = 0; i < 32; i++) {
        const a = (i * Math.PI) / 16,
          x = Math.cos(a) * 26,
          y = Math.sin(a) * 26;
        beam(spin, white, [0, 0, 0], [x, y, 0], 0.13);
        box(spin, dark, x, y - 1.4, 0, 2.5, 2.8, 2.6);
      }
    } else if (d.id === "columbia") {
      const mat = material(0x253c46, { metalness: 0.65, roughness: 0.3 });
      box(landmark, mat, -17, 0, 0, 30, 284, 47);
      box(landmark, mat, 6, 0, 0, 30, 265, 47);
      box(landmark, mat, 28, 0, 0, 20, 245, 47);
    } else if (d.id === "smith") {
      box(landmark, concrete, 0, 0, 0, 35, 24, 35);
      box(landmark, concrete, 0, 24, 0, 24, 105, 24);
      cylinder(landmark, material(0x567b60), 0, 129, 0, 0, 16, 18, 4);
    } else if (d.id === "spheres") {
      for (const [x, r] of [
        [-21, 14],
        [0, 19],
        [24, 13],
      ]) {
        const sphere = mesh(
          landmark,
          new THREE.SphereGeometry(r, 24, 16),
          material(0x7ea6a2, { metalness: 0.4, roughness: 0.24 }),
          x,
          r * 0.68,
          0,
        );
        const lines = new THREE.LineSegments(
          new THREE.WireframeGeometry(sphere.geometry),
          new THREE.LineBasicMaterial({ color: 0xc2d5cc }),
        );
        lines.position.copy(sphere.position);
        landmark.add(lines);
      }
    } else if (d.id === "stadium") {
      box(landmark, green, 0, 0, 0, 90, 1, 170);
      for (const x of [-70, 70]) {
        box(landmark, concrete, x, 0, 0, 40, 30, 210);
        const roof = box(landmark, white, x, 36, 0, 58, 3, 220);
        roof.rotation.z = x > 0 ? 0.18 : -0.18;
      }
      for (const z of [-105, 105]) box(landmark, concrete, 0, 0, z, 100, 22, 25);
      sign(landmark, "LUMEN FIELD", 0, 29, 120, 70, "#234a55");
    }
    // Solid landmark envelopes use the same collision seam as OSM footprints.
    if (!["needle", "wheel", "lake"].includes(d.id)) {
      const w = d.id === "market" ? 53 : d.id === "stadium" ? 95 : d.id === "spheres" ? 39 : 34;
      const depth = d.id === "stadium" ? 120 : d.id === "market" ? 20 : 30;
      colliders.push({
        minX: d.x - w,
        maxX: d.x + w,
        minZ: d.z - depth,
        maxZ: d.z + depth,
        minY: landmark.position.y,
        maxY:
          landmark.position.y +
          (d.id === "columbia" ? 284 : d.id === "smith" ? 147 : d.id === "stadium" ? 40 : 32),
      });
    }
  }
  // Evergreen clusters, kept off roads and lots; one instanced draw for each part.
  const sites = [];
  for (let i = 0; i < 850; i++) {
    const x = -1850 + ((i * 1543.17) % 3700),
      z = -2400 + ((i * 733.51) % 4600);
    if (x < shoreAt(z).westX + 20 || (z < -1930 && x > -100 && x < 1150)) continue;
    if (data.buildings.some((b) => Math.abs(b.x - x) < 30 && Math.abs(b.z - z) < 30)) continue;
    if (data.roads.some((r) => r.points.some((p) => Math.hypot(p[0] - x, p[1] - z) < 22))) continue;
    sites.push([x, heightAt(x, z), z]);
  }
  const tree = new THREE.InstancedMesh(new THREE.ConeGeometry(4, 15, 7), green, sites.length),
    trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.5, 0.7, 6, 6),
      material(0x655a44),
      sites.length,
    ),
    dummy = new THREE.Object3D();
  sites.forEach(([x, y, z], i) => {
    dummy.position.set(x, y + 11, z);
    dummy.updateMatrix();
    tree.setMatrixAt(i, dummy.matrix);
    dummy.position.y = y + 3;
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
  });
  group.add(tree, trunks);
  tree.castShadow = true;
  // Washington State ferry silhouettes moving across Elliott Bay.
  for (let i = 0; i < 2; i++) {
    const f = new THREE.Group();
    group.add(f);
    box(f, green, 0, 0, 0, 22, 4, 90);
    box(f, white, 0, 4, 0, 24, 10, 78);
    box(f, dark, 0, 14, 0, 20, 4, 45);
    box(f, white, 0, 18, 0, 14, 4, 15);
    ferries.push(f);
  }
  // Olympic Mountains to the west and Rainier to the southeast, deliberately stylized.
  for (let i = 0; i < 22; i++)
    mesh(
      group,
      new THREE.ConeGeometry(1700, 800 + ((i * 377) % 1200), 5),
      material(0x778c95),
      -14000 - (i % 3) * 1100,
      250,
      -22000 + i * 2000,
    );
  const rainier = project(46.8523, -121.7603);
  cylinder(group, material(0xb8c7cc), rainier.x, 0, rainier.z, 0, 6500, 4392, 10);
  cylinder(group, white, rainier.x, 2700, rainier.z, 0, 2450, 1692, 10);
  return {
    group,
    colliders,
    buildingCount,
    update(t) {
      wheelParts.forEach((w) => (w.rotation.z = t * 0.025));
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
