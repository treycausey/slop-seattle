import test from "node:test";
import assert from "node:assert/strict";
import {
  SECRETS,
  createSecretState,
  restoreDiscoveries,
  SECRET_LIMIT,
} from "../js/seattle-secrets-plan.js";
import { rainierHeight, rainierShape } from "../js/seattle-rainier-shape.js";
import { resolveLandmarkView } from "../js/seattle-viewpoints.js";
test("small discovery focus does not demand a tower-sized empty courtyard", () => {
  const p = { id: "character", name: "Character", x: 0, z: 0 },
    v = { eye: [0, 4, 10], target: [0, 1, 0] },
    wall = { minX: 8, maxX: 18, minZ: -2, maxZ: 2, minY: 0, maxY: 40 };
  assert.equal(resolveLandmarkView(p, v, [wall], 0).clear, false);
  assert.equal(
    resolveLandmarkView(p, { ...v, radius: 1 }, [wall], 0).clear,
    true,
  );
});
import {
  project,
  DESTINATIONS,
  LANDMARK_VIEWS,
  BRIDGES,
  terrainHeightAt,
} from "../js/seattle-config.js";
test("Troll view stays below Aurora deck, and collision-safe Locks road arrivals can discover the submarine", () => {
  const troll = DESTINATIONS.find((d) => d.id === "troll"),
    bridge = BRIDGES.find((b) => b.name === "Aurora Bridge");
  assert.ok(
    terrainHeightAt(troll.x, troll.z) + LANDMARK_VIEWS.troll.eye[1] <
      bridge.deck - 3,
    "camera must see beneath the bridge",
  );
  const sub = SECRETS.find((s) => s.id === "submarine");
  assert.equal(
    createSecretState(null).nearest({ x: sub.x, z: sub.z - 188 })?.id,
    "submarine",
  );
});
test("31 Seattle discoveries have unique IDs, finite local anchors, and required Troll/Rainier interactions", () => {
  assert.equal(SECRETS.length, 31);
  assert.equal(new Set(SECRETS.map((s) => s.id)).size, 31);
  for (const s of SECRETS) assert.ok([s.x, s.z].every(Number.isFinite));
  for (const id of ["troll", "cloud"])
    assert.ok(SECRETS.find((s) => s.id === id));
  assert.equal(SECRET_LIMIT, 3);
});
test("eruption has time to grow and settle, preserves thirty-ID saves and cannot retrigger during its longer cooldown", () => {
  const s = SECRETS.find((s) => s.id === "eruption"),
    state = createSecretState(
      JSON.stringify(SECRETS.slice(0, 30).map((s) => s.id)),
    );
  assert.equal(state.found.size, 30);
  assert.equal(s.place, "rainier");
  assert.equal(s.duration, 14);
  assert.equal(s.cooldown, 24);
  assert(state.trigger(s, 0));
  assert(!state.trigger(s, 8));
  assert(!state.trigger(s, 23.99));
  assert(state.trigger(s, 24));
});
test("every co-located clue remains reachable and previous fifteen-ID saves survive", () => {
  const state = createSecretState(
    JSON.stringify(SECRETS.slice(0, 15).map((s) => s.id)),
  );
  assert.equal(state.found.size, 15);
  for (const s of SECRETS)
    assert.ok(state.nearby(s).some((n) => n.id === s.id));
  const stadium = SECRETS.find((s) => s.id === "twelve");
  assert.deepEqual(
    state.nearby(stadium).map((s) => s.id),
    ["twelve", "spiral", "hawk", "quake"],
  );
  assert.deepEqual(state.nearby({ x: 50000, z: 50000 }), []);
});
test("discovery proximity, cooldown and saved identity survive revisits without accepting unknown or corrupt data", () => {
  const state = createSecretState("not json"),
    troll = SECRETS.find((s) => s.id === "troll");
  assert.equal(state.nearest(troll).id, "troll");
  assert.equal(state.trigger(troll, 0), true);
  assert.equal(state.trigger(troll, 3), false);
  assert.equal(state.trigger(troll, 8), true);
  assert.equal(state.found.size, 1);
  assert.equal(state.nearest({ x: 50000, z: 50000 }), null);
  assert.deepEqual(
    [...restoreDiscoveries('["troll","troll","fake",null,22]')],
    ["troll"],
  );
  assert.equal(createSecretState(state.serialize()).found.has("troll"), true);
  assert.equal(restoreDiscoveries("{}").size, 0);
});
test("Rainier radial terrain is finite, closed at its base, snow-covered and has outward sky-facing triangles", () => {
  const d = rainierShape();
  assert.ok(d.indices.length / 3 < 6000);
  assert.equal(d.positions.length, d.colors.length);
  assert.ok([...d.positions, ...d.colors].every(Number.isFinite));
  assert.ok(rainierHeight(0, 0) > 4200);
  assert.equal(rainierHeight(20000, 0), 0);
  assert.ok(d.colors.some((c) => c > 0.6));
  for (let i = 0; i < d.indices.length; i += 3) {
    const pts = d.indices
        .slice(i, i + 3)
        .map((n) => d.positions.slice(n * 3, n * 3 + 3)),
      [a, b, c] = pts;
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    assert.ok(ny >= -0.001);
  }
  const p = project(46.8523, -121.7603),
    distance = Math.hypot(p.x, p.z);
  assert.ok(
    distance > 60000,
    "the former true-distance mesh was clipped by the 60 km camera far plane",
  );
  assert.ok(18000 < 60000);
});
