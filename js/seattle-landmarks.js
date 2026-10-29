import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  createCurtainWallMaterial,
  createPreWarBuildingMaterial,
} from "./tsl-materials.js";
import { DESTINATIONS, heightAt } from "./seattle-config.js";
import {
  mesh,
  box,
  cylinder,
  beam,
  tube,
  lathe,
  gable,
  sign,
  canvasMaterial,
  batchStatic,
} from "./seattle-geometry.js";

function needle(g, p) {
  const glass = createCurtainWallMaterial({
    glassTint: 0x31525c,
    windowWidth: 1.25,
    floorHeight: 5.4,
  });
  // Three paired, inward-curving legs, a narrow elevator core, and a lenticular saucer.
  for (let i = 0; i < 3; i++)
    for (const side of [-1, 1]) {
      const a = (i * Math.PI * 2) / 3,
        rad = (r, y, s = side * 0.8) => [
          Math.cos(a) * r + Math.sin(a) * s,
          y,
          Math.sin(a) * r - Math.cos(a) * s,
        ];
      tube(
        g,
        p.white,
        [rad(16, 0), rad(9, 53), rad(3.4, 103), rad(6.3, 130), rad(12.5, 149)],
        0.95,
        40,
      );
      beam(g, p.steel, rad(3.4, 100), rad(6.3, 130), 0.18);
    }
  cylinder(g, p.dark, 0, 4, 0, 1.45, 1.8, 143, 12);
  box(g, p.white, 1.8, 2, 0, 1.1, 145, 1.1);
  box(g, p.white, -1.8, 2, 0, 1.1, 145, 1.1);
  cylinder(g, p.copper, 0, 68, 0, 1.9, 1.9, 4, 12);
  lathe(g, p.white, [
    [0, 146.5],
    [8, 146.5],
    [13, 148],
    [18, 151],
    [20.5, 152],
    [21, 153],
    [19, 154],
    [0, 154],
  ]);
  cylinder(g, glass, 0, 153, 0, 18.5, 18.5, 7.2, 64);
  lathe(
    g,
    p.white,
    [
      [0, 160.2],
      [20.4, 160.2],
      [21.4, 161],
      [20.8, 162],
      [17, 164.5],
      [10, 166.7],
      [0, 167.3],
    ],
    64,
  );
  lathe(
    g,
    p.white,
    [
      [0, 166.4],
      [2.3, 166.4],
      [1.4, 173],
      [0.65, 180],
      [0, 184],
    ],
    24,
  );
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24,
      x = Math.cos(a) * 18.8,
      z = Math.sin(a) * 18.8;
    beam(g, p.steel, [x, 153, z], [x, 160.2, z], 0.095);
    beam(
      g,
      p.white,
      [Math.cos(a) * 20.4, 160.4, Math.sin(a) * 20.4],
      [Math.cos(a) * 20.4, 161.6, Math.sin(a) * 20.4],
      0.07,
    );
  }
  cylinder(g, p.concrete, 0, 0, 0, 22, 24, 1, 48);
  cylinder(g, glass, 0, 1, 0, 17, 20, 4.5, 48);
  sign(g, "SPACE NEEDLE", 0, 4, 20.2, 14, "#293c40");
  g.userData.signature = "paired curved legs, glazed observation ring, lenticular saucer";
}

function market(g, p) {
  const brick = createPreWarBuildingMaterial({
    stoneColor: 0xac8b71,
    windowWidth: 3.2,
    floorHeight: 3.1,
    seed: 84,
  });
  box(g, brick, 0, 0, -3, 96, 11, 25);
  gable(g, p.roof, 0, 11, -3, 100, 4, 30);
  // Open arcade, timber stalls, striped awnings, glazed clerestory and produce crates.
  const awning = canvasMaterial(128, 128, (c, w, h) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? "#e0d5b6" : "#3a634b";
      c.fillRect((i * w) / 8, 0, w / 8, h);
    }
  });
  for (let x = -43; x <= 43; x += 8.6) {
    box(g, p.dark, x, 0, 10, 6.4, 5.2, 0.4);
    box(g, p.limestone, x - 3.5, 0, 11.2, 0.8, 6, 0.9);
    const cover = box(g, awning, x, 5.5, 14.2, 7.8, 0.22, 5);
    cover.rotation.x = 0.12;
    box(g, p.timber, x, 0.7, 13.7, 5, 1.05, 1.6);
    for (let j = 0; j < 3; j++) {
      box(g, p.timber, x - 1.65 + j * 1.65, 1.75, 13.7, 1.5, 0.15, 1.4);
    }
  }
  const neon = canvasMaterial(
    1024,
    400,
    (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = "bold 128px sans-serif";
      for (const [text, y] of [
        ["PUBLIC MARKET", 115],
        ["CENTER", 292],
      ]) {
        c.shadowColor = "#ff3b21";
        c.shadowBlur = 10;
        c.strokeStyle = "#872d24";
        c.lineWidth = 9;
        c.strokeText(text, w / 2, y, w - 30);
        c.shadowBlur = 0;
        c.strokeStyle = "#ff6b45";
        c.lineWidth = 3;
        c.strokeText(text, w / 2, y, w - 30);
      }
    },
    { transparent: true, glow: true },
  );
  const frame = new THREE.Group();
  g.add(frame);
  frame.position.set(12, 17.5, 13.5);
  mesh(frame, new THREE.PlaneGeometry(44, 17.2), neon, 0, 4, 0);
  for (const x of [-24, 24]) {
    beam(frame, p.dark, [x, -6, -0.5], [x, 14, -0.5], 0.15);
    beam(frame, p.dark, [x, -5, -5], [x, 13, -0.5], 0.1);
  }
  for (const y of [-3, 4, 11]) beam(frame, p.dark, [-24, y, -0.5], [24, y, -0.5], 0.13);
  const clock = canvasMaterial(
    512,
    512,
    (c, w, h) => {
      c.fillStyle = "#1e2828";
      c.beginPath();
      c.arc(w / 2, h / 2, 250, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#d84e37";
      c.lineWidth = 16;
      c.beginPath();
      c.arc(w / 2, h / 2, 227, 0, Math.PI * 2);
      c.stroke();
      c.font = "bold 65px sans-serif";
      c.fillStyle = "#f4e4c1";
      c.textAlign = "center";
      c.textBaseline = "middle";
      for (let i = 1; i <= 12; i++) {
        const a = (i * Math.PI) / 6 - Math.PI / 2;
        c.fillText(String(i), 256 + Math.cos(a) * 169, 256 + Math.sin(a) * 169);
      }
      c.strokeStyle = "#ec6a45";
      c.lineCap = "round";
      c.lineWidth = 14;
      c.beginPath();
      c.moveTo(256, 256);
      c.lineTo(185, 183);
      c.moveTo(256, 256);
      c.lineTo(355, 198);
      c.stroke();
    },
    { glow: true },
  );
  mesh(frame, new THREE.CircleGeometry(5.6, 64), clock, 30, 5, 0.15);
  sign(g, "PIKE PLACE MARKET", 8, 8, 11.4, 33, "#304e42");
  // Bronze pig silhouette at the arcade entrance, built from primitives.
  const bronze = new THREE.MeshStandardNodeMaterial({
    color: 0x8b7550,
    metalness: 0.7,
    roughness: 0.42,
  });
  const pig = mesh(g, new THREE.SphereGeometry(0.65, 12, 8), bronze, 11, 1, 16);
  pig.scale.set(1.5, 0.8, 0.7);
  mesh(g, new THREE.SphereGeometry(0.35, 10, 8), bronze, 12, 1.2, 16);
  for (const x of [10.5, 11.5])
    for (const z of [15.7, 16.3]) cylinder(g, bronze, x, 0.1, z, 0.09, 0.1, 0.7, 6);
  g.rotation.y = 0.75;
  g.userData.signature =
    "open arcade, striped stalls, rooftop PUBLIC MARKET CENTER neon and analog clock";
}

function wheel(g, p, animations) {
  g.position.y = 4;
  box(g, p.timber, 55, -1, 0, 150, 2, 38);
  for (const z of [-14, 14])
    for (let x = -15; x < 125; x += 15) cylinder(g, p.timber, x, -5, z, 0.6, 0.75, 5, 8);
  for (const z of [-4, 4])
    for (const x of [-14, 14]) beam(g, p.white, [x, 0, z * 2], [0, 28, z], 0.72);
  const rotor = new THREE.Group();
  rotor.position.y = 28;
  rotor.userData.dynamic = true;
  g.add(rotor);
  for (const z of [-2.1, 2.1]) {
    mesh(rotor, new THREE.TorusGeometry(25, 0.25, 6, 96), p.white, 0, 0, z);
    for (let i = 0; i < 42; i++) {
      const a = (i * Math.PI * 2) / 42;
      beam(rotor, p.white, [0, 0, z], [Math.cos(a) * 25, Math.sin(a) * 25, z], 0.09);
    }
  }
  cylinder(g, p.white, 0, 25, 0, 1.3, 1.3, 6, 16).rotation.x = Math.PI / 2;
  // One instanced draw per cabin layer; translation follows the wheel but cabins stay upright.
  const shell = new THREE.InstancedMesh(new THREE.BoxGeometry(2.5, 2.6, 2.8), p.white, 42);
  const glass = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.54, 1.45, 2.84),
    new THREE.MeshStandardNodeMaterial({ color: 0x345363, metalness: 0.55, roughness: 0.22 }),
    42,
  );
  shell.userData.dynamic = glass.userData.dynamic = true;
  g.add(shell, glass);
  const dummy = new THREE.Object3D();
  const update = (t) => {
    const turn = t * 0.025;
    rotor.rotation.z = turn;
    for (let i = 0; i < 42; i++) {
      const a = (i * Math.PI * 2) / 42 + turn;
      dummy.position.set(Math.cos(a) * 25, 28 + Math.sin(a) * 25 - 1.5, 0);
      dummy.updateMatrix();
      shell.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.2;
      dummy.updateMatrix();
      glass.setMatrixAt(i, dummy.matrix);
    }
    shell.instanceMatrix.needsUpdate = glass.instanceMatrix.needsUpdate = true;
  };
  update(0);
  animations.push(update);
  batchStatic(rotor);
  g.userData.signature = "twin rim, 42 upright enclosed gondolas, timber pier";
  g.userData.cabinCount = 42;
  g.userData.cabinMesh = shell;
}

function roundedTower(g, mat, x, z, w, d, height, r = 6) {
  const s = new THREE.Shape(),
    a = -w / 2,
    b = -d / 2;
  s.moveTo(a + r, b);
  s.lineTo(a + w - r, b);
  s.quadraticCurveTo(a + w, b, a + w, b + r);
  s.lineTo(a + w, b + d - r);
  s.quadraticCurveTo(a + w, b + d, a + w - r, b + d);
  s.lineTo(a + r, b + d);
  s.quadraticCurveTo(a, b + d, a, b + d - r);
  s.lineTo(a, b + r);
  s.quadraticCurveTo(a, b, a + r, b);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 6,
  });
  geo.rotateX(-Math.PI / 2);
  return mesh(g, geo, mat, x, 0, z);
}
function columbia(g, p) {
  const glass = createCurtainWallMaterial({
    glassTint: 0x172c37,
    frameTint: 0x161c22,
    windowWidth: 2.35,
    floorHeight: 3.7,
    spandrelRatio: 0.25,
    reflectivity: 0.86,
    seed: 172,
  });
  for (const [x, z, w, d, h] of [
    [-19, 3, 31, 48, 284],
    [4, 0, 31, 48, 273],
    [25, -3, 24, 48, 258],
  ]) {
    roundedTower(g, glass, x, z, w, d, h, 8);
    box(g, p.dark, x, h, z, w - 3, 1.5, d - 3);
    for (let y = 15; y < h - 4; y += 3.7)
      roundedTower(g, p.dark, x, z, w + 0.08, d + 0.08, 0.13, 8).position.y = y;
  }
  box(g, p.dark, 1, 0, 0, 78, 14, 60);
  sign(g, "COLUMBIA CENTER", -5, 7, 30.2, 28, "#263334");
  g.userData.signature = "three curved dark-glass lobes with stepped crowns and fine floor bands";
}
function smith(g, p) {
  const terra = createPreWarBuildingMaterial({
    stoneColor: 0xe3ddc7,
    trimColor: 0xbdb49c,
    windowWidth: 2.3,
    floorHeight: 3.2,
    windowRatioX: 0.46,
    seed: 108,
  });
  box(g, p.concrete, 0, 0, 0, 39, 6, 35);
  box(g, terra, 0, 6, 0, 39, 28, 35);
  box(g, terra, 0, 34, 0, 24, 82, 25);
  for (const y of [6, 31.5, 34, 110, 115.5, 119])
    box(g, p.limestone, 0, y, 0, y < 35 ? 41 : 27, 1.4, y < 35 ? 37 : 28);
  box(g, p.dark, 0, 117, 0, 21, 6, 22);
  for (const x of [-12.5, 12.5])
    for (let z = -11; z <= 11; z += 4.4) box(g, p.limestone, x, 116, z, 0.85, 7.5, 0.85);
  for (const z of [-13, 13])
    for (let x = -10; x <= 10; x += 4) box(g, p.limestone, x, 116, z, 0.85, 7.5, 0.85);
  box(g, p.limestone, 0, 123, 0, 27, 1.5, 28);
  const roof = cylinder(g, p.copper, 0, 124, 0, 0.6, 17.7, 15, 4);
  roof.rotation.y = Math.PI / 4;
  cylinder(g, p.limestone, 0, 138, 0, 1.2, 1.6, 2, 8);
  cylinder(g, p.copper, 0, 140, 0, 0, 1.4, 2, 8);
  sign(g, "SMITH TOWER", 0, 5.4, 17.8, 21, "#71624d");
  g.userData.signature =
    "ivory terra-cotta shaft, open observation arcade, oxidized copper pyramid";
}

function spheres(g, p) {
  const glass = new THREE.MeshStandardNodeMaterial({
    color: 0x759e98,
    metalness: 0.42,
    roughness: 0.19,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  const plants = [];
  for (const [x, r] of [
    [-24, 15],
    [0, 20],
    [25, 14],
  ]) {
    const geometry = new THREE.IcosahedronGeometry(r, 3);
    mesh(g, geometry, glass, x, r * 0.64, 0);
    const lattice = mesh(g, new THREE.IcosahedronGeometry(r + 0.12, 2), p.white, x, r * 0.64, 0);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(lattice.geometry, 1),
      new THREE.LineBasicMaterial({ color: 0xd0ded2 }),
    );
    edges.position.copy(lattice.position);
    g.add(edges);
    lattice.visible = false;
    // Pentagonal rosettes give the framework its distinctive organic character.
    const nodes = new THREE.IcosahedronGeometry(1, 0).attributes.position,
      seen = new Set();
    for (let i = 0; i < nodes.count; i++) {
      const n = new THREE.Vector3().fromBufferAttribute(nodes, i).normalize(),
        key = n
          .toArray()
          .map((v) => v.toFixed(2))
          .join(":");
      if (seen.has(key) || n.y < -0.4) continue;
      seen.add(key);
      const tangent = new THREE.Vector3(0, 1, 0).cross(n).normalize();
      if (tangent.length() < 0.1) tangent.set(1, 0, 0);
      const bitangent = n.clone().cross(tangent);
      const pts = [];
      for (let j = 0; j <= 5; j++) {
        const a = (j * Math.PI * 2) / 5;
        pts.push(
          n
            .clone()
            .multiplyScalar(0.96)
            .addScaledVector(tangent, Math.cos(a) * 0.25)
            .addScaledVector(bitangent, Math.sin(a) * 0.25)
            .normalize()
            .multiplyScalar(r + 0.18)
            .add(new THREE.Vector3(x, r * 0.64, 0))
            .toArray(),
        );
      }
      for (let j = 1; j < pts.length; j++) beam(g, p.white, pts[j - 1], pts[j], 0.09);
    }
    for (let j = 0; j < 12; j++) {
      const a = j * 2.4,
        rad = (j % 4) * r * 0.17,
        y = 2 + (j % 3) * 2.5;
      const leaf = new THREE.SphereGeometry(r * 0.22, 7, 5);
      leaf.translate(x + Math.cos(a) * rad, y + 3, Math.sin(a) * rad);
      plants.push(leaf);
    }
    box(g, p.concrete, x, 0, 0, r * 1.6, 1.5, r * 1.5);
  }
  mesh(g, mergeGeometries(plants), p.leaf);
  plants.forEach((g) => g.dispose());
  sign(g, "THE SPHERES", 0, 2, 16, 14, "#425f4f");
  g.userData.signature =
    "three overlapping glass conservatories, pentagonal rosettes, visible indoor foliage";
}

function stadium(g, p) {
  const field = canvasMaterial(512, 1024, (c, w, h) => {
    for (let i = 0; i < 12; i++) {
      c.fillStyle = i % 2 ? "#355f3d" : "#3b6a42";
      c.fillRect(0, (i * h) / 12, w, h / 12);
    }
    c.fillStyle = "#173c55";
    c.fillRect(0, 0, w, 85);
    c.fillRect(0, h - 85, w, 85);
    c.strokeStyle = "#e3e4ce";
    c.lineWidth = 3;
    c.strokeRect(15, 14, w - 30, h - 28);
    for (let i = 1; i < 12; i++) {
      const y = (i * h) / 12;
      c.beginPath();
      c.moveTo(15, y);
      c.lineTo(w - 15, y);
      c.stroke();
    }
    c.fillStyle = "#e3e4ce";
    c.textAlign = "center";
    c.font = "bold 36px sans-serif";
    for (let i = 2; i < 11; i++) {
      const y = (i * h) / 12 + 13,
        n = String(Math.min(i - 1, 11 - i) * 10);
      c.fillText(n, 75, y);
      c.fillText(n, w - 75, y);
    }
    c.font = "bold 54px sans-serif";
    c.fillText("SEATTLE", w / 2, 60);
    c.fillText("SEAHAWKS", w / 2, h - 27);
    for (let i = 1; i < 98; i++)
      for (const x of [w * 0.42, w * 0.58]) c.fillRect(x, (i * h) / 100, 10, 2);
  });
  const pitch = mesh(g, new THREE.PlaneGeometry(49, 110), field, 0, 1, 0);
  pitch.rotation.x = -Math.PI / 2;
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 8; tier++)
      box(
        g,
        tier % 2 ? p.blueRoof : p.dark,
        side * (30 + tier * 4.2),
        2 + tier * 2.9,
        0,
        4.4,
        1.5,
        145 + tier * 5,
      );
    const rows = [];
    for (let j = 0; j <= 20; j++) {
      const z = -118 + (j * 236) / 20,
        y = 37 + 21 * Math.sin((Math.PI * j) / 20);
      rows.push([side * 66, y, z]);
    }
    for (const offset of [-2.5, 2.5])
      tube(
        g,
        p.white,
        rows.map(([x, y, z]) => [x + offset, y, z]),
        0.65,
        40,
      );
    for (let j = 1; j < rows.length; j++) {
      const [x, y, z] = rows[j],
        prev = rows[j - 1];
      beam(g, p.white, [x - 2.5, y, z], [x + 2.5, prev[1], prev[2]], 0.16);
      beam(g, p.white, [x - 2.5, y, z], [x + 2.5, y, z], 0.2);
      const roof = box(
        g,
        p.blueRoof,
        x,
        32 + 8 * Math.sin((Math.PI * j) / 20),
        z - 5.9,
        44,
        1,
        12.1,
      );
      roof.rotation.z = side * 0.1;
    }
    for (const z of [-92, -45, 0, 45, 92])
      beam(g, p.concrete, [side * 86, 0, z], [side * 86, 36, z], 1.3);
  }
  for (const z of [-100, 100]) {
    for (let i = 0; i < 5; i++)
      box(g, i % 2 ? p.dark : p.blueRoof, 0, 2 + i * 3, z + Math.sign(z) * i * 4, 60, 1.5, 5);
    box(g, p.dark, 0, 25, z, 48, 15, 2);
    sign(g, "SEATTLE", 0, 32, z + Math.sign(z) * 1.1, 38, "#163a51");
  }
  sign(g, "LUMEN FIELD", 0, 25, 123, 60, "#234a55");
  g.userData.signature =
    "paired white arch trusses, cantilevered roofs, stepped seating, marked football field";
}

export function buildSeattleLandmarks(parent, palette) {
  const animations = [],
    landmarks = [];
  const builders = { needle, market, wheel, columbia, smith, spheres, stadium };
  for (const d of DESTINATIONS) {
    if (!builders[d.id]) continue;
    const g = new THREE.Group();
    g.name = d.name;
    g.position.set(d.x, heightAt(d.x, d.z), d.z);
    parent.add(g);
    builders[d.id](g, palette, animations);
    batchStatic(g);
    landmarks.push(g);
  }
  return { landmarks, update: (t) => animations.forEach((fn) => fn(t)) };
}
