import test from "node:test";
import assert from "node:assert/strict";
import { boundaryDistance } from "../js/seattle-boundary-index.js";
import { WATERWAYS } from "../js/seattle-waterways.js";

function brute(w, x, z) {
  let distance = 160;
  for (const ring of w.rings)
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1],
        b = ring[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        t = Math.max(
          0,
          Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)),
        );
      distance = Math.min(distance, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
    }
  return distance;
}
test("indexed bank distances equal the original segment scan at coast vertices, cell edges and deterministic samples", () => {
  for (const w of [
    ...WATERWAYS,
    {
      rings: [
        [
          [0, 0],
          [0, 0],
          [1000, 0],
          [0, 1000],
          [0, 0],
        ],
      ],
    },
  ]) {
    const points = w.rings.flat();
    for (let i = 0; i < points.length; i += Math.max(1, Math.floor(points.length / 80))) {
      const [x, z] = points[i];
      for (const [dx, dz] of [
        [0, 0],
        [159.999, -159.999],
        [-160, 160],
        [321, -321],
      ])
        assert.equal(boundaryDistance(w, x + dx, z + dz), brute(w, x + dx, z + dz));
    }
    for (let i = 0; i < 500; i++) {
      const a = points[i % points.length],
        x = a[0] + Math.sin(i * 37) * 250,
        z = a[1] + Math.cos(i * 73) * 250;
      assert.equal(boundaryDistance(w, x, z), brute(w, x, z));
    }
  }
});
