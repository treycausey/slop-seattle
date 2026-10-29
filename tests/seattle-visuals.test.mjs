import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { DESTINATIONS, LANDMARK_VIEWS } from "../js/seattle-config.js";
import {
  resolveLandmarkView,
  viewSegmentBlocked,
} from "../js/seattle-viewpoints.js";

test("procedural Seattle with depth and distance shading stays below 70 KiB gzip, without texture or model downloads", () => {
  const directory = new URL("../js/", import.meta.url),
    names = readdirSync(directory).filter((n) => /^seattle.*\.js$/.test(n));
  let bytes = 0;
  for (const name of names) {
    const source = readFileSync(new URL(name, directory));
    bytes += gzipSync(source).length;
    assert.doesNotMatch(
      source.toString(),
      /(?:TextureLoader|GLTFLoader|OBJLoader|\.load\(['"]https?:)/,
    );
  }
  assert.ok(
    bytes < 70 * 1024,
    `Seattle JS budget exceeded: ${bytes} compressed bytes`,
  );
  console.log(
    JSON.stringify({
      seattleJavaScriptGzipBytes: bytes,
      baselineGzipBytes: 12400,
      growthBytes: bytes - 12400,
    }),
  );
});

test("architectural views reject neighboring towers and keep the target building visible", () => {
  const place = { id: "spheres", name: "The Spheres", x: 0, z: 0 },
    view = { eye: [65, 85, 125], target: [0, 15, 0] };
  const neighbor = {
    minX: 20,
    maxX: 80,
    minZ: 30,
    maxZ: 110,
    minY: 0,
    maxY: 180,
  };
  assert.equal(
    viewSegmentBlocked(view.eye, view.target, neighbor),
    true,
    "the original preset crosses the tower",
  );
  const own = {
    minX: -40,
    maxX: 40,
    minZ: -30,
    maxZ: 30,
    minY: 0,
    maxY: 40,
    landmark: "The Spheres",
  };
  const resolved = resolveLandmarkView(place, view, [neighbor, own], 0);
  assert.equal(resolved.clear, true);
  assert.notDeepEqual(resolved.eye, view.eye);
  assert.equal(
    viewSegmentBlocked(resolved.eye, resolved.target, neighbor),
    false,
  );
  assert.deepEqual(resolved.target, view.target);
});

test("scenic visibility preserves the open courtyard inside a concave building footprint", () => {
  const courtyard = {
    minX: 0,
    maxX: 10,
    minZ: 0,
    maxZ: 10,
    minY: 0,
    maxY: 30,
    polygon: {
      outer: [
        [0, 0],
        [10, 0],
        [10, 2],
        [2, 2],
        [2, 10],
        [0, 10],
      ].map(([x, z]) => ({ x, z })),
      holes: [],
    },
  };
  assert.equal(
    viewSegmentBlocked([5, 45, 5], [5, 1, 5], courtyard),
    false,
    "a bounding box must not fill the L-shaped courtyard",
  );
  assert.equal(
    viewSegmentBlocked([1, 45, 5], [1, 1, 5], courtyard),
    true,
    "the occupied wing still blocks the view",
  );
  assert.equal(
    viewSegmentBlocked([15, 15, 1], [-5, 15, 1], courtyard),
    true,
    "a segment crossing occupied walls is blocked",
  );
});
test("every destination has a finite architectural camera view clear of its target", () => {
  for (const d of DESTINATIONS) {
    const v = LANDMARK_VIEWS[d.id];
    assert.ok(v, d.name);
    assert.ok([...v.eye, ...v.target].every(Number.isFinite));
    assert.ok(Math.hypot(...v.eye.map((n, i) => n - v.target[i])) > 50, d.name);
  }
});
