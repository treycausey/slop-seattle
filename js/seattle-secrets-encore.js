import * as THREE from "three/webgpu";
import { mesh, box, cylinder, beam, tube } from "./seattle-geometry.js";
import { terrainHeightAt } from "./seattle-config.js";

// Built only for an active discovery; the caller batches, animates and disposes it.
export function encoreModel(g, p, s, city) {
  const ball = (m, x, y, z, rx, ry, rz) => {
    const o = mesh(g, new THREE.SphereGeometry(1, 16, 10), m, x, y, z);
    o.scale.set(rx, ry, rz);
    return o;
  };
  const b = (m, x, y, z, w, h, d) => box(g, m, x, y - h / 2, z, w, h, d);
  const ring = (m, x, y, z, r, thickness = 0.2) =>
    mesh(g, new THREE.TorusGeometry(r, thickness, 6, 32), m, x, y, z);
  const line = (m, a, z, width = 0.15) => beam(g, m, a, z, width);
  const wheel = (x, z) => {
    const w = cylinder(g, p.dark, x, 1, z, 1, 1, 0.8, 12);
    w.rotation.z = Math.PI / 2;
    ball(p.steel, x * 1.04, 1, z, 0.45, 0.45, 0.45);
  };
  g.position.x += 18;
  g.position.z += 30;
  // Small scenes need a clear stage, rather than spawning inside a footprint.
  if (s.place !== "stadium") {
    const boxes = city.colliders.filter(
      (b) =>
        b.maxX > s.x - 150 &&
        b.minX < s.x + 150 &&
        b.maxZ > s.z - 150 &&
        b.minZ < s.z + 150,
    );
    let best = null;
    for (let r = 0; r <= 120 && !best; r += 20)
      for (let i = 0; i < 12; i++) {
        const x = s.x + 18 + Math.cos((i * Math.PI) / 6) * r,
          z = s.z + 30 + Math.sin((i * Math.PI) / 6) * r;
        if (
          !boxes.some(
            (b) =>
              x + 10 > b.minX &&
              x - 10 < b.maxX &&
              z + 10 > b.minZ &&
              z - 10 < b.maxZ,
          )
        ) {
          best = { x, z };
          break;
        }
      }
    if (best) {
      g.position.x = best.x;
      g.position.z = best.z;
    }
  }
  g.position.y = terrainHeightAt(g.position.x, g.position.z) + 18;
  let motion = (v, t) => {
    g.rotation.y = Math.sin(t * 1.5) * 0.22;
    g.position.y += Math.sin(v * Math.PI) * 2;
  };
  if (["twelve", "spiral", "hawk", "quake"].includes(s.id)) g.position.y += 65;
  if (s.id === "twelve") {
    cylinder(g, p.steel, -8, 0, 0, 0.25, 0.3, 24, 10);
    ball(p.sun, -8, 24, 0, 0.7, 0.7, 0.7);
    const cloth = new THREE.PlaneGeometry(16, 10, 16, 1);
    const a = cloth.attributes.position;
    for (let i = 0; i < a.count; i++)
      a.setZ(i, Math.sin((a.getX(i) + 8) * 0.55) * 0.6);
    cloth.computeVertexNormals();
    const flag = mesh(g, cloth, p.navy, 0, 18, 0);
    // Two-sided without another material or downloaded typography.
    const back = mesh(g, cloth.clone(), p.navy, 0, 18, -0.03);
    back.rotation.y = Math.PI;
    for (const z of [-0.8, 0.8]) {
      b(p.white, -3, 18, z, 0.8, 6, 0.15);
      for (const [x, y, w, h] of [
        [1, 21, 4, 0.8],
        [2.6, 19.5, 0.8, 3],
        [1, 18, 4, 0.8],
        [-0.6, 16.5, 0.8, 3],
        [1, 15, 4, 0.8],
      ])
        b(p.white, x, y, z, w, h, 0.15);
      b(p.lime, 0, 13.5, z, 16, 0.45, 0.15);
    }
    motion = (v, t) => {
      g.position.y += Math.sin(v * Math.PI) * 7;
      g.rotation.y = Math.sin(t * 3) * 0.16;
    };
  } else if (s.id === "spiral") {
    ball(p.timber, 0, 0, 0, 3, 3, 6);
    for (const z of [-3.8, 3.8]) {
      const r = ring(p.white, 0, 0, z, 2.3, 0.25);
      r.scale.x = 1.05;
    }
    for (let z = -2; z <= 2; z += 0.8)
      line(p.white, [-0.7, 2.9, z], [0.7, 2.9, z], 0.14);
    line(p.white, [0, 3, -2.5], [0, 3, 2.5], 0.12);
    motion = (v, t) => {
      g.position.x += Math.sin(v * Math.PI * 2) * 18;
      g.position.y += Math.sin(v * Math.PI) * 12;
      g.rotation.z = t * 6;
      g.rotation.x = 0.3;
    };
  } else if (s.id === "hawk") {
    ball(p.navy, 0, 0, 0, 2, 2.5, 5);
    ball(p.white, 0, 2.2, 3.8, 2.2, 2, 2.5);
    const beak = mesh(g, new THREE.ConeGeometry(1, 3, 4), p.sun, 0, 1.8, 6.5);
    beak.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      ball(p.lime, side * 1.8, 2.8, 4.6, 0.35, 0.4, 0.2);
      for (let i = 0; i < 5; i++) {
        const feather = b(
          p.navy,
          side * (4 + i * 1.5),
          0.5 - i * 0.25,
          -i * 0.6,
          4,
          0.5,
          4 - i * 0.3,
        );
        feather.rotation.z = side * -0.12;
        b(
          p.steel,
          side * (4 + i * 1.5),
          0.8 - i * 0.25,
          -i * 0.6,
          3.2,
          0.12,
          0.35,
        );
      }
    }
    for (let i = -1; i <= 1; i++) b(p.white, i * 0.9, -0.5, -5.5, 0.7, 0.3, 3);
    motion = (v, t) => {
      g.position.y += Math.sin(t * 2) * 3;
      g.rotation.z = Math.sin(t * 2) * 0.12;
      g.rotation.y = Math.sin(v * Math.PI) * 0.7;
    };
  } else if (s.id === "quake") {
    for (let i = 0; i < 4; i++) {
      const r = ring(
        i % 2 ? p.lime : p.navy,
        0,
        -2 + i * 0.2,
        0,
        5 + i * 5,
        0.5,
      );
      r.rotation.x = -Math.PI / 2;
    }
    const points = [];
    for (let i = 0; i < 25; i++)
      points.push([
        -12 + i,
        4 + Math.sin(i * 2.7) * Math.exp(-Math.abs(i - 12) / 7) * 5,
        0,
      ]);
    tube(g, p.lime, points, 0.3, 48);
    b(p.navy, 0, 0, -1, 28, 0.6, 3);
    motion = (v) => {
      g.scale.setScalar(0.6 + v * 1.5);
      g.position.y += Math.sin(v * Math.PI * 12) * 0.6;
    };
  } else if (s.id === "guitar") {
    ball(p.roof, 0, 3, 0, 3.2, 4, 0.7);
    ball(p.roof, 0, 6, 0, 2.5, 2.7, 0.7);
    ball(p.white, 0.3, 4, 0.68, 1.8, 2.6, 0.1);
    b(p.timber, 0, 10, 0, 1.1, 9, 0.6);
    b(p.timber, 0, 15, 0, 1.7, 2.4, 0.65);
    b(p.steel, 0, 2.5, 0.8, 1.8, 0.35, 0.3);
    for (let i = 0; i < 6; i++)
      line(
        p.steel,
        [-0.38 + i * 0.15, 2.5, 0.85],
        [-0.38 + i * 0.15, 15, 0.45],
        0.035,
      );
    for (let i = 0; i < 8; i++)
      b(p.steel, 0, 7 + i * 0.8, 0.36, 1.2, 0.06, 0.08);
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        ball(p.steel, side * 1.05, 14 + i * 0.6, 0, 0.25, 0.18, 0.2);
    for (let i = 0; i < 2; i++) {
      b(p.dark, 7, 2 + i * 4, 0, 5, 3.7, 3);
      for (const x of [5.8, 8.2]) {
        ball(p.steel, x, 2 + i * 4, 1.55, 0.9, 0.9, 0.1);
        ball(p.dark, x, 2 + i * 4, 1.7, 0.35, 0.35, 0.1);
      }
      b(p.sun, 7, 3.2 + i * 4, 1.6, 3, 0.15, 0.15);
    }
    motion = (v, t) => {
      g.rotation.z = Math.sin(t * 3) * 0.15;
      g.position.y += Math.sin(v * Math.PI) * 4;
    };
  } else if (s.id === "flannel") {
    b(p.roof, 0, 3, 0, 8, 10, 0.9);
    for (const side of [-1, 1]) {
      const arm = b(p.roof, side * 6, 5.5, 0, 5, 3.5, 0.9);
      arm.rotation.z = side * -0.3;
    }
    for (const z of [-0.52, 0.52]) {
      for (let x = -3; x <= 3; x += 2) b(p.navy, x, 3, z, 0.65, 10, 0.1);
      for (let y = -1; y <= 7; y += 2) b(p.navy, 0, y, z, 8, 0.65, 0.1);
      for (let y = 0; y <= 6; y += 1.5)
        ball(p.white, 0, y, z * 1.2, 0.13, 0.13, 0.1);
      b(p.dark, -2, 4.5, z * 1.2, 2, 2, 0.1);
    }
    for (const side of [-1, 1]) {
      const collar = b(p.white, side * 1.3, 7.5, 0.7, 2, 2, 0.2);
      collar.rotation.z = side * 0.4;
    }
    motion = (v, t) => {
      g.rotation.z = Math.sin(t * 2) * 0.2;
      g.rotation.y = Math.sin(t) * 0.5;
      g.position.y += 4 + Math.sin(v * Math.PI) * 3;
    };
  } else if (s.id === "vinyl") {
    const record = cylinder(g, p.dark, 0, 0, 0, 6, 6, 0.35, 40);
    record.rotation.x = Math.PI / 2;
    for (let r = 3; r < 6; r += 0.65) ring(p.steel, 0, 0, 0.2, r, 0.035);
    const label = cylinder(g, p.pink, 0, 0, 0.3, 2.5, 2.5, 0.12, 24);
    label.rotation.x = Math.PI / 2;
    ball(p.dark, 0, 0, 0.45, 0.4, 0.4, 0.1);
    for (const side of [-1, 1])
      b(p.white, side * 1.2, 0.5, 0.45, 0.8, 0.4, 0.1);
    b(p.white, 0, -1, 0.45, 2, 0.4, 0.1);
    motion = (v, t) => {
      g.rotation.z = t * 2;
      g.position.y += 7 + Math.sin(v * Math.PI) * 3;
    };
  } else if (s.id === "spoons") {
    for (const side of [-1, 1]) {
      ball(p.steel, side * 2, 6, 0, 1.6, 2.4, 0.4);
      b(p.steel, side * 2, 0, 0, 0.55, 9, 0.4);
      ball(p.white, side * 2 - 0.4, 6.7, 0.35, 0.3, 1, 0.05);
    }
    motion = (v, t) => {
      g.rotation.z = Math.sin(t * 8) * 0.3;
      g.scale.x = 0.8 + Math.abs(Math.sin(t * 8)) * 0.4;
      g.position.y += 8;
    };
  } else if (s.id === "toe") {
    b(p.pink, 0, 2.6, 0, 5, 3, 9);
    b(p.pink, 0, 4, -2, 5, 2, 4);
    b(p.dark, 0, 4.3, -4.1, 4, 1.1, 0.15);
    b(p.steel, 0, 1.5, -4.8, 5.5, 0.5, 0.5);
    for (const x of [-2.7, 2.7]) for (const z of [-2.8, 2.8]) wheel(x, z);
    ball(p.pink, 0, 6.8, 1, 2.4, 1.6, 4);
    for (let i = 0; i < 5; i++)
      ball(
        p.pink,
        -1.7 + i * 0.85,
        7,
        4.2 - i * 0.22,
        0.55,
        0.7,
        1.2 - i * 0.1,
      );
    motion = (v, t) => {
      g.position.z += Math.sin(v * Math.PI) * 10;
      g.rotation.y = 0.35;
      g.rotation.z = Math.sin(t * 4) * 0.04;
    };
  } else if (s.id === "elephant") {
    ball(p.pink, 0, 4, 0, 4, 3, 5);
    ball(p.pink, 0, 6, 4, 2.6, 2.7, 2.7);
    for (const side of [-1, 1]) {
      ball(p.pink, side * 2.8, 6, 3.5, 2, 0.5, 2.5).rotation.z = side * 0.6;
      ball(p.dark, side * 1.6, 6.8, 6, 0.25, 0.3, 0.15);
      for (const z of [-2.5, 2.5])
        cylinder(g, p.pink, side * 2, 0, z, 0.9, 1, 4, 12);
    }
    tube(
      g,
      p.pink,
      [
        [0, 5, 6],
        [0, 3, 8],
        [0, 6, 10],
        [0, 9, 9],
      ],
      0.7,
      20,
    );
    for (let i = 0; i < 8; i++)
      ball(
        p.white,
        Math.sin(i * 2.4) * 5,
        9 + i * 0.7,
        8 + Math.cos(i * 2.4) * 3,
        0.45,
        0.45,
        0.45,
      );
    motion = (v, t) => {
      g.rotation.y = Math.sin(t * 2) * 0.2;
      g.position.y += Math.sin(v * Math.PI) * 5;
    };
  } else if (s.id === "geoduck") {
    for (const side of [-1, 1]) {
      const shell = ball(p.timber, side * 1.4, 0, 0, 3.4, 1, 4);
      shell.rotation.z = side * 0.25;
      for (let i = 0; i < 6; i++)
        line(
          p.sun,
          [side * 0.5, 0.8, -3],
          [side * (1 + i * 0.6), 1, 2.6],
          0.09,
        );
    }
    tube(
      g,
      p.limestone,
      [
        [0, 0, 1],
        [0, 3, 1],
        [0, 6, 1.5],
        [0, 8, 2.5],
      ],
      1.1,
      20,
    );
    ball(p.dark, 0, 8.1, 2.7, 0.65, 0.2, 0.8);
    motion = (v, t) => {
      g.scale.y = 0.65 + Math.sin(v * Math.PI) * 0.65;
      g.rotation.y = Math.sin(t) * 0.2;
    };
  } else if (s.id === "slug") {
    ball(p.sun, 0, 0, 0, 2, 1.7, 7);
    ball(p.sun, 0, 1, 5, 1.7, 2, 2);
    for (let i = 0; i < 10; i++)
      ball(p.timber, Math.sin(i * 4) * 1.5, 1.4, -4 + i * 0.9, 0.35, 0.12, 0.5);
    for (const side of [-1, 1]) {
      line(p.sun, [side * 0.6, 2, 5], [side * 1.2, 4.2, 6], 0.2);
      ball(p.dark, side * 1.2, 4.2, 6, 0.3, 0.3, 0.3);
    }
    motion = (v) => {
      g.position.z += v * 6;
      g.scale.z = 1 + Math.sin(v * Math.PI * 4) * 0.1;
      g.rotation.y = 0.4;
    };
  } else if (s.id === "pinball") {
    b(p.roof, 0, 2, 0, 7, 4, 11);
    b(p.dark, 0, 4.2, 0, 6.4, 0.4, 10);
    b(p.navy, 0, 7, -5, 7, 6, 1);
    for (const x of [-2.5, 2.5]) {
      b(p.steel, x, 0, 3, 0.3, 4, 0.3);
      b(p.steel, x, 0, -3, 0.3, 4, 0.3);
    }
    for (let i = 0; i < 5; i++) {
      const x = Math.sin(i * 2.4) * 2,
        z = -2 + i;
      ball(i % 2 ? p.lime : p.pink, x, 4.7, z, 0.7, 0.3, 0.7);
    }
    for (const side of [-1, 1]) {
      const f = b(p.sun, side * 1.2, 4.6, 3, 2.4, 0.25, 0.6);
      f.rotation.y = side * 0.35;
    }
    for (let i = 0; i < 3; i++)
      ball(p.steel, Math.sin(i * 2) * 2, 5, -2 + i * 2, 0.4, 0.4, 0.4);
    for (let i = 0; i < 7; i++)
      b(p.lime, -2.4 + i * 0.8, 7 + Math.sin(i) * 1.2, -4.4, 0.4, 0.5, 0.2);
    motion = (v, t) => {
      g.rotation.y = Math.sin(t) * 0.2;
      g.rotation.z = Math.sin(t * 6) * 0.025;
      g.position.y += 3;
    };
  } else if (s.id === "interurban") {
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 4;
      b(p.timber, x, 2.5, 0, 2.5, 4, 1.5);
      ball(p.concrete, x, 5.5, 0, 1, 1.2, 1);
      for (const side of [-1, 1]) {
        b(p.dark, x + side * 0.7, 0, 0, 0.6, 2, 0.7);
        b(p.dark, x + side * 0.7, -0.8, 0.5, 0.7, 0.4, 1.5);
      }
      b(p.roof, x + 1.5, 0.5, 1.5, 1.6, 2, 1);
      const handle = ring(p.dark, x + 1.5, 1.7, 1.5, 0.4, 0.1);
      handle.scale.y = 0.7;
    }
    b(p.steel, 0, 8, -1, 14, 0.25, 5);
    for (const x of [-6, 6]) cylinder(g, p.steel, x, 0, -2, 0.16, 0.16, 8, 8);
    motion = (v, t) => {
      g.rotation.y = 0.2;
      g.position.y += Math.sin(t * 2) * 0.12;
    };
  } else if (s.id === "boots") {
    for (const side of [-1, 1]) {
      b(p.blueRoof, side * 3, 3, 0, 3, 7, 3);
      ball(p.blueRoof, side * 3, 0.5, 2, 1.6, 1, 3);
      b(p.sun, side * 3, 6.5, 0, 3.2, 0.5, 3.2);
      line(p.white, [side * 3 - 1, 2, 1.6], [side * 3, 5, 1.6], 0.15);
      line(p.white, [side * 3, 5, 1.6], [side * 3 + 1, 2, 1.6], 0.15);
    }
    const brim = ball(p.sun, 0, 10, 0, 8, 0.6, 5);
    brim.rotation.z = 0.1;
    ball(p.sun, 0, 12, 0, 4, 2.5, 3);
    b(p.timber, 0, 10.8, 2.8, 7, 0.6, 0.3);
    motion = (v, t) => {
      g.rotation.y = Math.sin(t) * 0.3;
      g.position.y += Math.abs(Math.sin(t * 3)) * 1.5;
    };
  } else throw new Error(`Unknown discovery: ${s.id}`);
  return motion;
}
