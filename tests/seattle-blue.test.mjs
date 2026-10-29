import test from "node:test";
import assert from "node:assert/strict";
import {
  stepBlueFlight,
  BlueSmokeHistory,
  BLUE_OFFSETS,
} from "../js/seattle-blue-flight.js";
const bounds = { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 };
const keys = { forward: 0, backward: 0, left: 0, right: 0, up: 0, down: 0 };
const entity = () => ({
  position: { x: 0, y: 350, z: 0 },
  heading: 0,
  speed: 110,
  bank: 0,
  pitch: 0,
});
test("arcade jet moves forward, accelerates, banks and climbs with bounded speed and altitude", () => {
  const e = entity();
  stepBlueFlight(e, keys, 0.05, bounds, 150);
  assert(e.position.z > 5);
  for (let i = 0; i < 2000; i++)
    stepBlueFlight(
      e,
      { ...keys, forward: 1, right: 1, up: 1 },
      0.05,
      bounds,
      150,
    );
  assert.equal(e.speed, 180);
  assert.equal(e.position.y, 1800);
  assert(e.bank < -0.5);
  assert(e.pitch > 0.25);
  for (let i = 0; i < 2000; i++)
    stepBlueFlight(e, { ...keys, backward: 1, down: 1 }, 0.05, bounds, 440);
  assert.equal(e.speed, 65);
  assert.equal(e.position.y, 440);
  assert(Math.abs(e.bank) < 0.001);
});
test("flight remains within extended bounds, turns back and clamps stalled-tab time", () => {
  const e = entity();
  e.position.z = 4499;
  stepBlueFlight(e, keys, 10, bounds, 150);
  assert.equal(e.position.z, 4500);
  assert(Math.abs(e.heading) > 3);
  const p = entity();
  stepBlueFlight(p, keys, 10, bounds, 150);
  assert(p.position.z <= 5.5);
});
test("four-jet diamond and smoke history use fixed typed buffers after arbitrarily many samples", () => {
  assert.equal(BLUE_OFFSETS.length, 4);
  assert.equal(new Set(BLUE_OFFSETS.map((o) => o.join())).size, 4);
  const h = new BlueSmokeHistory(),
    buffer = h.positions,
    points = new Float32Array(12);
  for (let i = 0; i < 10000; i++) {
    points.fill(i);
    h.record(points);
  }
  assert.equal(h.count, 64);
  assert.equal(h.positions, buffer);
  assert.equal(buffer.byteLength, 3072);
  assert.equal(buffer[h.index(0, 0)], 9999);
  assert.equal(buffer[h.index(63, 3)], 9936);
  h.clear();
  assert.equal(h.count, 0);
});
