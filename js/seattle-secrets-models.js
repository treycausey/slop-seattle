import * as THREE from "three/webgpu";
import {
  mesh,
  box,
  cylinder,
  beam,
  tube,
  batchStatic,
} from "./seattle-geometry.js";
import { terrainHeightAt } from "./seattle-config.js";

const ball = (g, m, x, y, z, rx, ry, rz) => {
  const b = mesh(g, new THREE.SphereGeometry(1, 16, 10), m, x, y, z);
  b.scale.set(rx, ry, rz);
  return b;
};
export function secretModel(s, p, city) {
  const g = new THREE.Group();
  g.userData.dynamic = true;
  g.name = `Secret: ${s.id}`;
  g.position.set(s.x, terrainHeightAt(s.x, s.z), s.z);
  const bob = (t) => (g.position.y += Math.sin(t * 5) * 0.08);
  let motion = (v, t) => {
      g.rotation.y = Math.sin(t * 2) * 0.12;
      bob(t);
    },
    reset = () => {};
  if (s.id === "troll") {
    const troll = city.landmarks.find((l) => l.userData.trollEye),
      eye = troll?.userData.trollEye,
      pupil = troll?.userData.trollPupil;
    reset = () => {
      if (eye) eye.scale.y = 1;
      if (pupil) pupil.position.x = 0;
    };
    motion = (v, t) => {
      if (eye) eye.scale.y = 0.15 + 0.85 * Math.abs(Math.cos(v * Math.PI * 3));
      if (pupil) pupil.position.x = Math.sin(v * Math.PI * 4) * 0.24;
    };
  } else if (s.id === "rocket") {
    const rocket = city.landmarks.find((l) => l.name === "Fremont Rocket"),
      baseY = rocket?.position.y;
    reset = () => {
      if (rocket) rocket.position.y = baseY;
    };
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const flame = mesh(
        g,
        new THREE.ConeGeometry(0.9, 5 + (i % 3), 8),
        i % 2 ? p.sun : p.roof,
        Math.cos(a) * 2,
        3,
        Math.sin(a) * 2,
      );
      flame.rotation.z = Math.PI;
    }
    for (let i = 0; i < 8; i++)
      ball(
        g,
        p.white,
        Math.sin(i * 3) * 5,
        1,
        Math.cos(i * 3) * 5,
        1.6,
        1,
        1.6,
      );
    motion = (v, t) => {
      if (rocket) rocket.position.y = baseY + Math.sin(v * Math.PI) * 5;
      g.scale.setScalar(0.6 + Math.sin(v * Math.PI) * 1.5);
      g.rotation.y = t;
    };
  } else if (s.id === "fish") {
    ball(g, p.copper, 0, 0, 0, 4.5, 1.5, 1.1);
    ball(g, p.white, 0.1, -0.6, 0, 3.7, 0.6, 0.9);
    for (const z of [-1, 1]) {
      ball(g, p.white, 3, 0.4, z, 0.45, 0.5, 0.12);
      ball(g, p.dark, 3.15, 0.4, z * 1.1, 0.2, 0.25, 0.1);
    }
    const tail = mesh(g, new THREE.ConeGeometry(2, 3, 3), p.roof, -5, 0, 0);
    tail.rotation.z = Math.PI / 2;
    const fin = mesh(g, new THREE.ConeGeometry(1, 2, 3), p.copper, 0, 1.7, 0);
    fin.rotation.y = Math.PI / 2;
    motion = (v) => {
      g.position.x += -15 + v * 30;
      g.position.y += 20 + Math.sin(v * Math.PI) * 14;
      g.rotation.z = -0.3 + v * Math.PI * 2;
    };
  } else if (s.id === "ufo") {
    ball(g, p.steel, 0, 0, 0, 12, 2, 12);
    ball(g, p.copper, 0, 3, 0, 6, 4, 6);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ball(
        g,
        i % 2 ? p.sun : p.white,
        Math.cos(a) * 9,
        -1,
        Math.sin(a) * 9,
        0.7,
        0.5,
        0.7,
      );
    }
    motion = (v, t) => {
      g.position.x += 35 + Math.sin(t) * 12;
      g.position.y += 191 + Math.sin(v * Math.PI) * 8;
      g.rotation.y = t;
    };
  } else if (s.id === "orca") {
    ball(g, p.dark, 0, 0, 0, 3.5, 3, 9);
    ball(g, p.white, 0, -1.8, 1, 2.8, 1, 6);
    for (const x of [-3.2, 3.2]) {
      ball(g, p.white, x, 1, 4, 0.35, 0.9, 1.6);
      ball(g, p.dark, x * 1.03, 1.3, 5.3, 0.2, 0.2, 0.2);
      ball(g, p.dark, x * 1.5, -0.5, -1, 2, 0.4, 3);
    }
    const fin = mesh(g, new THREE.ConeGeometry(1.6, 6, 3), p.dark, 0, 4, -2);
    fin.rotation.y = Math.PI / 2;
    for (const x of [-2.5, 2.5]) ball(g, p.dark, x, 0, -8, 3, 0.5, 1.5);
    motion = (v) => {
      g.position.set(
        s.x + 90,
        6 + Math.sin(v * Math.PI) * 16,
        s.z - 170 + v * 35,
      );
      g.rotation.x = -0.9 + v * 1.8;
    };
  } else if (s.id === "duck") {
    ball(g, p.sun, 0, 3, 0, 5, 3.7, 6);
    ball(g, p.sun, 0, 7, 4, 3, 3, 3);
    ball(g, p.roof, 0, 6.6, 6.8, 2.1, 0.6, 1.7);
    for (const x of [-2.4, 2.4]) {
      ball(g, p.dark, x, 7.4, 5.1, 0.35, 0.4, 0.25);
      ball(g, p.sun, x * 1.8, 3, 0, 0.8, 2.2, 3);
    }
    motion = (v, t) => {
      g.position.set(s.x + 100, 50.5 + Math.sin(t * 2) * 0.4, s.z + 10);
      g.rotation.y = Math.sin(v * Math.PI * 2) * 0.5;
    };
  } else if (s.id === "submarine") {
    ball(g, p.sun, 0, 0, 0, 10, 3, 3);
    box(g, p.sun, 0, 1, 0, 6, 3, 4);
    for (let x = -6; x <= 6; x += 3) {
      ball(g, p.steel, x, 0.5, 2.7, 0.9, 0.9, 0.2);
      ball(g, p.dark, x, 0.5, 2.92, 0.6, 0.6, 0.1);
    }
    cylinder(g, p.steel, 0, 3, 0, 0.4, 0.4, 5, 12);
    beam(g, p.steel, [0, 8, 0], [0, 8, 2], 0.5);
    motion = (v, t) => {
      g.position.y = 6 + Math.sin(v * Math.PI) * 2;
      g.position.z = s.z + 18;
      g.rotation.y = 0.3 + v * 0.6;
      g.position.x += Math.sin(t) * 5;
    };
  } else if (s.id === "sasquatch") {
    ball(g, p.timber, 0, 4, 0, 2.4, 3, 1.6);
    ball(g, p.timber, 0, 7.6, 0.3, 1.6, 1.8, 1.3);
    ball(g, p.dark, 0, 7, 1.25, 1, 0.7, 0.3);
    for (const side of [-1, 1]) {
      ball(g, p.timber, side * 2.4, 3.5, 0, 0.8, 3, 0.8);
      ball(g, p.timber, side, 1, 0, 0.9, 2, 0.9);
      ball(g, p.timber, side, 0.2, 1, 1.2, 0.4, 1.8);
      ball(g, p.white, side * 0.55, 8, 1.25, 0.3, 0.25, 0.2);
      ball(g, p.dark, side * 0.55, 8, 1.44, 0.12, 0.15, 0.08);
    }
    motion = (v, t) => {
      g.position.x -= 12;
      g.position.z += 30;
      g.rotation.y = Math.sin(v * Math.PI * 3) * 0.4;
      g.position.y =
        terrainHeightAt(g.position.x, g.position.z) +
        Math.abs(Math.sin(t * 2)) * 0.3;
    };
  } else if (s.id === "garden") {
    box(g, p.timber, 0, 0, 0, 15, 1.5, 13);
    box(g, p.dark, 0, 1, 0, 14, 0.6, 12);
    for (let i = 0; i < 7; i++) {
      const x = ((i % 3) - 1) * 4,
        z = (Math.floor(i / 3) - 1) * 4;
      cylinder(g, p.leaf, x, 1, z, 0.15, 0.2, 5 + (i % 2), 8);
      ball(g, p.leaf, x + 1, 3, z, 1.4, 0.3, 0.7);
      ball(g, p.sun, x, 6 + (i % 2), z, 1.2, 1.2, 0.4);
      ball(g, p.timber, x, 6 + (i % 2), z + 0.35, 0.5, 0.5, 0.15);
    }
    motion = (v) => {
      g.position.x += 25;
      g.position.z += 25;
      g.position.y += 35;
      g.scale.y = 0.1 + 0.9 * Math.sin(v * Math.PI);
    };
  } else if (s.id === "coffee") {
    mesh(
      g,
      new THREE.CylinderGeometry(5, 3.8, 10, 24, 1, true),
      p.white,
      0,
      5,
      0,
    );
    cylinder(g, p.timber, 0, 9.8, 0, 4.6, 4.6, 0.1, 24);
    cylinder(g, p.copper, 0, 3, 0, 4.7, 4.7, 3, 24);
    mesh(g, new THREE.TorusGeometry(3, 0.8, 8, 24), p.white, 5.5, 5, 0);
    for (let i = 0; i < 3; i++)
      tube(
        g,
        p.white,
        [
          [i * 2 - 2, 11, 0],
          [i * 2 - 3, 13, 1],
          [i * 2 - 1, 15, 0],
          [i * 2 - 2, 18, -1],
        ],
        0.2,
        12,
      );
    motion = (v, t) => {
      g.position.y += 14 + Math.sin(t * 3);
      g.rotation.z = Math.sin(v * Math.PI * 4) * 0.12;
    };
  } else if (s.id === "octopus") {
    ball(g, p.roof, 0, 7, 0, 4.5, 5, 4.5);
    for (const x of [-1.8, 1.8]) {
      ball(g, p.white, x, 8, 4, 1, 1.2, 0.45);
      ball(g, p.dark, x, 8, 4.4, 0.45, 0.65, 0.2);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      tube(
        g,
        p.roof,
        [
          [Math.cos(a) * 2, 4, Math.sin(a) * 2],
          [Math.cos(a) * 5, 2, Math.sin(a) * 5],
          [Math.cos(a) * 9, 1, Math.sin(a) * 9],
          [Math.cos(a) * 11, 3, Math.sin(a) * 11],
        ],
        0.65,
        16,
      );
    }
    motion = (v, t) => {
      g.position.x -= 35;
      g.position.z += 30;
      g.position.y = 5 + Math.sin(v * Math.PI) * 3;
      g.scale.y = 1 + Math.sin(t * 4) * 0.08;
    };
  } else if (s.id === "hats") {
    cylinder(g, p.dark, 0, 0, 0, 14, 14, 1.3, 32);
    cylinder(g, p.dark, 0, 1, 0, 8, 8, 11, 24);
    cylinder(g, p.white, 0, 2, 0, 8.1, 8.1, 2, 24);
    motion = (v) => {
      g.position.y += 147 + Math.sin(v * Math.PI) * 5;
      g.rotation.z = Math.sin(v * Math.PI * 2) * 0.15;
    };
  } else if (s.id === "fireflies") {
    for (let i = 0; i < 24; i++) {
      const a = i * 2.4,
        r = 5 + Math.sqrt(i) * 2;
      ball(
        g,
        p.glow,
        Math.cos(a) * r,
        4 + i * 0.5,
        Math.sin(a) * r,
        0.32,
        0.32,
        0.32,
      );
    }
    motion = (v, t) => {
      g.position.y += 8 + Math.sin(t) * 2;
      g.rotation.y = t * 0.35;
      g.scale.setScalar(0.7 + Math.sin(v * Math.PI) * 0.5);
    };
  } else if (s.id === "cloud") {
    motion = (v) => city.rainier.react(v);
    reset = () => city.rainier.react(0);
  } else if (s.id === "sheep") {
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 6;
      ball(g, p.white, x, 2, 0, 2.5, 2, 3);
      for (let j = 0; j < 8; j++)
        ball(
          g,
          p.white,
          x + Math.sin(j * 2.4) * 1.8,
          2.4 + (j % 2) * 0.7,
          Math.cos(j * 2.4) * 2,
          0.9,
          0.9,
          0.9,
        );
      ball(g, p.dark, x, 2.7, 2.5, 1.1, 1.3, 1.1);
      for (const dx of [-1, 1])
        for (const z of [-1.8, 1.8])
          cylinder(g, p.dark, x + dx, 0.1, z, 0.25, 0.3, 1.2, 8);
      for (const dx of [-0.5, 0.5])
        ball(g, p.white, x + dx, 3, 3.4, 0.2, 0.22, 0.15);
    }
    motion = (v, t) => {
      g.position.z += 40;
      g.position.y += Math.abs(Math.sin(t * 3)) * 0.5;
      g.rotation.y = Math.sin(v * Math.PI * 2) * 0.1;
    };
  }
  batchStatic(g);
  const origin = g.position.clone();
  return {
    group: g,
    update(v, t) {
      g.position.copy(origin);
      g.rotation.set(0, 0, 0);
      g.scale.setScalar(1);
      motion(v, t);
    },
    dispose() {
      reset();
      g.removeFromParent();
      const geometries = new Set();
      g.traverse((o) => {
        if (o.isMesh) {
          o.dispatchEvent({ type: "dispose" });
          geometries.add(o.geometry);
        }
      });
      geometries.forEach((g) => g.dispose());
      g.clear();
    },
  };
}
