import * as THREE from "three/webgpu";
import {
  DESTINATIONS,
  BRIDGES,
  heightAt,
  terrainHeightAt,
} from "./seattle-config.js";
import {
  mesh,
  box,
  cylinder,
  beam,
  gable,
  sign,
  batchStatic,
} from "./seattle-geometry.js";

const sphere = (g, m, x, y, z, rx, ry, rz) => {
  const s = mesh(g, new THREE.SphereGeometry(1, 20, 12), m, x, y, z);
  s.scale.set(rx, ry, rz);
  return s;
};
function troll(g, p) {
  sphere(g, p.concrete, 0, 4, -1, 6, 5, 4);
  sphere(g, p.concrete, -4, 2, 4, 4, 2.6, 5);
  sphere(g, p.concrete, 4, 2, 3, 4, 2.5, 4);
  sphere(g, p.concrete, 0, 5.4, 2, 4.4, 3.8, 3.4);
  sphere(g, p.concrete, -0.4, 4.5, 5.6, 1.5, 2.4, 1.7);
  sphere(g, p.dark, -1.9, 6, 4.4, 0.9, 0.55, 0.5);
  sphere(g, p.steel, 1.6, 6, 4.4, 0.85, 0.7, 0.6);
  for (const x of [-2.5, -1.2, 0.1, 1.4])
    sphere(g, p.concrete, x, 0.6, 7, 0.7, 0.6, 2.2);
  sphere(g, p.copper, 4.9, 0.8, 5.4, 1.3, 0.9, 2.5);
  sphere(g, p.dark, 4.9, 1.4, 5.2, 1, 0.6, 1.3);
  for (const x of [3.6, 6.2])
    for (const z of [4.1, 6.8]) {
      const w = cylinder(g, p.dark, x, 0, z, 0.5, 0.5, 0.25, 12);
      w.rotation.z = Math.PI / 2;
    }
  // The real sculpture sits under the north approach, away from the canal's high central span.
  box(g, p.concrete, 0, 19, -2, 29, 2, 65);
  for (const x of [-11, 11])
    for (const z of [-23, 22]) box(g, p.concrete, x, 0, z, 2.5, 19, 3);
  g.userData.signature =
    "one-eyed concrete troll, broad hand, crushed green Volkswagen under Aurora Bridge";
}
function rocket(g, p) {
  cylinder(g, p.white, 0, 3, 0, 1.9, 2.8, 12, 24);
  cylinder(g, p.copper, 0, 15, 0, 0, 1.9, 6, 24);
  for (let i = 0; i < 4; i++) {
    const fin = box(g, p.roof, 0, 0, 0, 0.4, 8, 4);
    fin.position.set(
      Math.cos((i * Math.PI) / 2) * 2,
      3,
      Math.sin((i * Math.PI) / 2) * 2,
    );
    fin.rotation.y = (-i * Math.PI) / 2;
  }
  cylinder(g, p.dark, 0, 1, 0, 2, 2, 2, 20);
  sign(g, "FREMONT", 0, 7, 2.8, 6, "#29534c");
  g.userData.signature =
    "silver fuselage, red tail fins, pointed turquoise nose and Fremont lettering";
}
function gasworks(g, p) {
  for (const [x, z, r, h] of [
    [-19, -5, 8, 25],
    [1, -8, 10, 29],
    [20, 7, 7, 22],
  ]) {
    cylinder(g, p.copper, x, 0, z, r, r, h, 24);
    cylinder(g, p.roof, x, h, z, r * 0.86, r, 2, 24);
    for (const y of [6, 13, 20]) {
      const ring = mesh(
        g,
        new THREE.TorusGeometry(r + 0.2, 0.3, 6, 32),
        p.dark,
        x,
        y,
        z,
      );
      ring.rotation.x = Math.PI / 2;
    }
    for (let j = 0; j < 6; j++) {
      const a = (j * Math.PI) / 3;
      beam(
        g,
        p.dark,
        [x + Math.cos(a) * r, 0, z + Math.sin(a) * r],
        [x + Math.cos(a) * r, h, z + Math.sin(a) * r],
        0.22,
      );
    }
    cylinder(g, p.roof, x + 3, h, z, 0.8, 0.8, 10, 12);
  }
  for (const z of [-26, 27]) {
    box(g, p.dark, 0, 7, z, 65, 1, 4);
    for (const x of [-28, 0, 28]) beam(g, p.roof, [x, 0, z], [x, 18, z], 0.6);
  }
  beam(g, p.copper, [-28, 13, 0], [28, 13, 0], 1.3);
  box(g, p.roof, 5, 0, 35, 38, 7, 16);
  gable(g, p.copper, 5, 7, 35, 40, 5, 18);
  g.userData.signature =
    "rusted cylindrical gasification towers, catwalk rings, exposed pipework and boiler shed";
}
function locks(g, p) {
  g.rotation.y = Math.PI / 2;
  // Two navigable chambers, miter gates, a spillway and fish ladder. Water remains visible between walls.
  for (const [x, w, l] of [
    [-18, 24, 250],
    [39, 12, 130],
  ]) {
    for (const side of [-1, 1])
      box(g, p.concrete, x + side * (w / 2 + 3), -1, 0, 6, 7, l);
    for (const z of [-l / 2, l / 2])
      for (const side of [-1, 1]) {
        const gate = box(
          g,
          p.dark,
          x + (side * w) / 4,
          0,
          z,
          w / 2 + 1,
          5,
          1.8,
        );
        gate.rotation.y = side * 0.23;
      }
    for (const z of [-l / 2 + 10, l / 2 - 10])
      box(g, p.limestone, x + w / 2 + 7, 4, z, 7, 5, 7);
  }
  for (let i = 0; i < 8; i++) {
    box(g, p.concrete, 80, 0, -95 + i * 25, 25, 8, 3);
    box(g, p.white, 80, 1, -84 + i * 25, 22, 0.3, 20);
  }
  for (let i = 0; i < 15; i++) {
    box(g, p.concrete, -50, 0, -105 + i * 8, 12, 1.2 + i * 0.13, 1);
  }
  sign(g, "HIRAM M. CHITTENDEN LOCKS", 20, 11, 120, 56, "#284b40");
  g.userData.signature =
    "parallel large and small lock chambers, paired miter gates, spillway and stepped fish ladder";
}
function avenue(g, p) {
  g.rotation.y = -0.56;
  for (const side of [-1, 1])
    for (let i = 0; i < 5; i++) {
      const x = side * 25,
        z = (i - 2) * 23,
        h = 9 + (i % 3) * 3,
        m = i % 2 ? p.roof : p.limestone;
      box(g, m, x, 0, z, 22, h, 21);
      box(g, p.white, x, h, z, 23, 0.8, 22);
      for (const offset of [-7, 0, 7]) {
        box(g, p.dark, x - side * 11.1, 1, z + offset, 0.15, 4, 4);
        box(g, p.dark, x - side * 11.1, 7, z + offset, 0.15, 2.8, 2);
      }
      const awning = box(g, p.copper, x - side * 12, 4.5, z, 3, 0.4, 18);
      awning.rotation.z = side * 0.15;
    }
  sign(g, "BALLARD AVENUE", 0, 5, 58, 32, "#4a392b");
  g.userData.signature =
    "diagonal brick commercial street, stepped cornices, narrow storefronts and green awnings";
}
function shepherd(g, p) {
  box(g, p.roof, 0, 0, 0, 88, 16, 28);
  box(g, p.roof, 0, 0, 14, 20, 21, 16);
  gable(g, p.dark, 0, 16, 0, 90, 8, 30);
  gable(g, p.dark, 0, 21, 14, 22, 7, 18);
  cylinder(g, p.copper, 0, 27, 14, 0, 4, 7, 4);
  for (const x of [-36, -24, -12, 12, 24, 36])
    for (const y of [3, 8, 13]) box(g, p.dark, x, y, 14.1, 3, 3.4, 0.2);
  for (const x of [-7, 0, 7]) box(g, p.limestone, x, 0, 23, 1, 8, 1);
  sign(g, "GOOD SHEPHERD CENTER", 0, 6, 23.2, 19, "#604037");
  g.userData.signature =
    "long red-brick former convent, steep slate roof, projecting central gable and copper cupola";
}
function bathhouse(g, p) {
  box(g, p.limestone, 0, 0, 0, 35, 5, 16);
  gable(g, p.roof, 0, 5, 0, 38, 5, 19);
  for (const x of [-13, -7, 0, 7, 13]) {
    box(g, p.dark, x, 1, 8.1, 3, 3, 0.2);
    cylinder(g, p.timber, x, 0, 11, 0.15, 0.15, 4, 8);
  }
  sign(g, "GREEN LAKE BATHHOUSE", 0, 5.2, 9, 27, "#36564c");
  for (let i = 0; i < 8; i++) {
    const hull = sphere(
      g,
      i % 2 ? p.copper : p.roof,
      20 + i * 3,
      0.7,
      12,
      0.8,
      0.5,
      3,
    );
    hull.rotation.y = 0.2;
  }
  g.userData.signature =
    "lakeside low bathhouse with terracotta gable, timber porch, rowing boats and shoreline";
}
function greenwood(g, p) {
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const x = side * 23,
        z = (i - 1) * 28;
      box(g, i % 2 ? p.limestone : p.roof, x, 0, z, 25, 8 + i * 2, 25);
      for (const d of [-8, 0, 8])
        box(g, p.dark, x - side * 12.6, 1, z + d, 0.2, 4, 5);
      box(g, p.copper, x - side * 14, 4, z, 3, 0.4, 23);
    }
  sign(g, "GREENWOOD", -22, 9, 14, 23, "#5b392c");
  sign(g, "TAPROOT THEATRE", 22, 10, 14, 23, "#304d44");
  for (const z of [-40, 40])
    for (let x = -15; x < 16; x += 5) box(g, p.white, x, 0.3, z, 2.8, 0.04, 5);
  g.userData.signature =
    "Greenwood Avenue storefronts, Taproot Theatre marquee, awnings and zebra crossings at 85th";
}
function phinney(g, p) {
  box(g, p.blueRoof, 0, 0, 0, 40, 12, 24);
  gable(g, p.dark, 0, 12, 0, 42, 8, 27);
  box(g, p.white, 0, 0, 14, 12, 9, 7);
  gable(g, p.dark, 0, 9, 14, 14, 5, 8);
  for (const x of [-15, -8, 8, 15])
    for (const y of [2, 7]) box(g, p.white, x, y, 12.2, 3, 3, 0.25);
  sign(g, "PHINNEY CENTER", 0, 8, 18, 22, "#314d63");
  g.userData.signature =
    "blue former schoolhouse on Phinney Ridge, white trim, steep gables and projecting porch";
}
function gardens(g, p) {
  box(g, p.roof, 0, 0, 0, 34, 7, 20);
  gable(g, p.dark, 0, 7, 0, 37, 5, 23);
  for (const x of [-12, -6, 0, 6, 12]) box(g, p.dark, x, 1, 10.2, 3, 3.8, 0.2);
  for (let i = 0; i < 12; i++) {
    const log = cylinder(
      g,
      p.timber,
      -35 - i * 5,
      0,
      -25 + (i % 4) * 15,
      0.6,
      0.8,
      8 + (i % 3),
      8,
    );
    log.rotation.z = Math.PI / 2;
    log.rotation.y = i * 0.7;
  }
  sign(g, "GOLDEN GARDENS", 0, 7.5, 11, 28, "#594b34");
  g.userData.signature =
    "red-brick beach bathhouse, dark gabled roof, driftwood logs and open Shilshole shoreline";
}
export function buildNorthLandmarks(parent, p) {
  const landmarks = [],
    builders = {
      troll,
      rocket,
      gasworks,
      locks,
      ballard: avenue,
      shepherd,
      greenlake: bathhouse,
      greenwood,
      phinney,
      gardens,
    };
  for (const d of DESTINATIONS) {
    if (!builders[d.id]) continue;
    const g = new THREE.Group();
    g.name = d.name;
    g.position.set(d.x, terrainHeightAt(d.x, d.z), d.z);
    builders[d.id](g, p);
    batchStatic(g);
    parent.add(g);
    landmarks.push(g);
  }
  for (const b of BRIDGES) {
    const g = new THREE.Group();
    g.name = b.name;
    g.position.set(b.x, 0, b.z);
    g.rotation.y = b.angle;
    parent.add(g);
    const points = [],
      positions = [];
    for (let z = -b.length / 2; z <= b.length / 2; z += 10) points.push(z);
    points.push(b.length / 2);
    for (let i = 1; i < points.length; i++)
      for (const [x, z] of [
        [-b.width / 2, points[i - 1]],
        [b.width / 2, points[i - 1]],
        [b.width / 2, points[i]],
        [-b.width / 2, points[i - 1]],
        [b.width / 2, points[i]],
        [-b.width / 2, points[i]],
      ]) {
        const wx = b.x + x * Math.cos(b.angle) + z * Math.sin(b.angle),
          wz = b.z - x * Math.sin(b.angle) + z * Math.cos(b.angle);
        positions.push(x, heightAt(wx, wz) + 0.25, z);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.computeVertexNormals();
    const deck = mesh(g, geo, p.asphalt);
    deck.material.side = THREE.DoubleSide;
    for (const side of [-1, 1]) {
      for (let z = -b.length / 2 + 10; z < b.length / 2; z += 20) {
        const wx = b.x + z * Math.sin(b.angle),
          wz = b.z + z * Math.cos(b.angle),
          y = heightAt(wx, wz);
        beam(
          g,
          p.copper,
          [side * (b.width / 2 - 1), y + 1.2, z],
          [side * (b.width / 2 - 1), y + 1.2, Math.min(z + 20, b.length / 2)],
          0.22,
        );
        if (Math.abs(z) < b.length / 2 - 100) {
          beam(
            g,
            p.copper,
            [side * (b.width / 2 - 1), y - 3, z],
            [side * (b.width / 2 - 1), y + 4, z + 20],
            0.35,
          );
        }
      }
      for (const z of [-b.length / 4, b.length / 4]) {
        const wx = b.x + z * Math.sin(b.angle),
          wz = b.z + z * Math.cos(b.angle),
          y = heightAt(wx, wz);
        box(g, p.concrete, side * (b.width / 2 - 2), 5, z, 3, y - 6, 5);
      }
    }
    if (b.name !== "Aurora Bridge")
      for (const side of [-1, 1]) {
        box(g, p.copper, side * (b.width / 2 + 3), b.deck, 0, 6, 9, 7);
        gable(g, p.roof, side * (b.width / 2 + 3), b.deck + 9, 0, 7, 4, 8);
      }
    batchStatic(g);
  }
  return landmarks;
}
