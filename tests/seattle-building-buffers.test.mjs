import test from "node:test";
import assert from "node:assert/strict";
import { buildingBuffers } from "../js/seattle-building-buffers.js";
const outer = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ],
  hole = [
    [3, 3],
    [7, 3],
    [7, 7],
    [3, 7],
    [3, 3],
  ];
const donut = [
  [0, 1, 5],
  [0, 5, 4],
  [1, 2, 6],
  [1, 6, 5],
  [2, 3, 7],
  [2, 7, 6],
  [3, 0, 4],
  [3, 4, 7],
];
test("indexed building caps preserve courtyards, height and outward winding while sharing vertices", () => {
  const { walls, roof } = buildingBuffers(outer, [hole], 20, 7, () => donut);
  assert.equal(walls.positions.length / 3, 32);
  assert.equal(roof.positions.length / 3, 16);
  let area = 0;
  for (let i = 0; i < roof.indices.length; i += 3) {
    const [a, b, c] = roof.indices
      .slice(i, i + 3)
      .map((v) => roof.positions.slice(v * 3, v * 3 + 3));
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    assert.equal(Math.sign(ny), a[1] === 27 ? 1 : -1);
    if (a[1] === 27) area += ny / 2;
    const x = (a[0] + b[0] + c[0]) / 3,
      z = (a[2] + b[2] + c[2]) / 3;
    assert.ok(!(x > 3 && x < 7 && z > 3 && z < 7), "courtyard remains open");
  }
  assert.equal(area, 84);
  assert.equal(Math.min(...walls.positions.filter((_, i) => i % 3 === 1)), 7);
  assert.equal(Math.max(...walls.positions.filter((_, i) => i % 3 === 1)), 27);
  for (let i = 0; i < walls.indices.length; i += 3) {
    const [a, b, c] = walls.indices
        .slice(i, i + 3)
        .map((v) => walls.positions.slice(v * 3, v * 3 + 3)),
      n = walls.normals.slice(walls.indices[i] * 3, walls.indices[i] * 3 + 3);
    const cross = [
      (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
      0,
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
    ];
    assert.ok(cross[0] * n[0] + cross[2] * n[2] > 0);
  }
});
test("clockwise rings keep outward normals and caps without duplicated closing vertices", () => {
  const { walls, roof } = buildingBuffers([...outer].reverse(), [], 10, 0, () => [
    [0, 1, 2],
    [0, 2, 3],
  ]);
  assert.equal(walls.positions.length / 3, 16);
  assert.equal(roof.positions.length / 3, 8);
  assert.ok(walls.indices.every((i) => i < 16));
  assert.ok(roof.indices.every((i) => i < 8));
  for(let i=0;i<walls.positions.length;i+=12){
    const x=(walls.positions[i]+walls.positions[i+3])/2,
      z=(walls.positions[i+2]+walls.positions[i+5])/2;
    assert.ok((x-5)*walls.normals[i]+(z-5)*walls.normals[i+2]>0,"clockwise wall faces outward");
  }
});
