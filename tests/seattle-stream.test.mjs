import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  wantedRegions,
  combineRegions,
  REGION_LIMIT,
} from "../js/seattle-stream-plan.js";
import {
  DESTINATIONS,
  BOUNDS,
  WORLD,
  waterAt,
  project,
  constrainToLand,
  BRIDGES,
  heightAt,
  isLand,
} from "../js/seattle-config.js";
import { nearestRoad } from "../js/seattle-map.js";
import { pitchedRoofPositions } from "../js/seattle-roofs.js";
const base = new URL("../js/seattle-north/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", base)));
const core = JSON.parse(
  readFileSync(new URL("../js/seattle-data.json", import.meta.url)),
);
const unzip = (name) =>
  JSON.parse(gunzipSync(readFileSync(new URL(name, base))));
test("pitched house roofs face the sky and their gable ends face outward", () => {
  const values = pitchedRoofPositions(-5, 5, -8, 8, 6, 9),
    normals = [];
  for (let i = 0; i < values.length; i += 9) {
    const a = values.slice(i, i + 3),
      b = values.slice(i + 3, i + 6).map((v, j) => v - a[j]),
      c = values.slice(i + 6, i + 9).map((v, j) => v - a[j]);
    normals.push([
      b[1] * c[2] - b[2] * c[1],
      b[2] * c[0] - b[0] * c[2],
      b[0] * c[1] - b[1] * c[0],
    ]);
  }
  for (const n of normals.slice(0, 4))
    assert.ok(
      n[1] > 0,
      "front-face culling must preserve the roof viewed from above",
    );
  assert.ok(normals[4][2] < 0);
  assert.ok(normals[5][2] > 0);
});
test("north survey snapshot is independently loadable, bounded and fully covered by the tile manifest", () => {
  assert.ok(manifest.buildings > 80000);
  assert.ok(manifest.roads > 8000);
  assert.match(manifest.source, /City of Seattle.*estimated/);
  let buildings = 0,
    bytes = 0;
  const ids = new Set();
  for (const t of manifest.tiles) {
    const raw = readFileSync(new URL(`${t.id}.json.gz`, base));
    assert.equal(raw.length, t.bytes);
    assert.ok(raw.length < 128 * 1024);
    bytes += raw.length;
    const data = JSON.parse(gunzipSync(raw));
    buildings += data.buildings.length;
    for (const b of data.buildings) {
      assert.ok(!ids.has(b.id), `duplicate ${b.id}`);
      ids.add(b.id);
      assert.ok(
        b.x >= t.x && b.x < t.x + 1000 && b.z >= t.z && b.z < t.z + 1000,
      );
      assert.ok(b.ring.length >= 4);
      assert.ok(b.height >= 3 && b.height < 35);
    }
  }
  assert.equal(buildings, manifest.buildings);
  assert.ok(bytes < 5 * 1024 * 1024);
  assert.ok(manifest.atlasBytes < 250 * 1024);
  assert.ok(manifest.overviewBytes < 60 * 1024);
});
test("neighborhood planner retains at most four full tiles at every destination and releases distant regions", () => {
  assert.equal(REGION_LIMIT, 4);
  for (const d of DESTINATIONS) {
    const tiles = wantedRegions(manifest, d.arrival.x, d.arrival.z);
    assert.ok(tiles.length <= 4);
    if (d.z < -2520)
      assert.ok(
        tiles.some(
          (t) =>
            d.arrival.x >= t.x &&
            d.arrival.x < t.x + 1000 &&
            d.arrival.z >= t.z &&
            d.arrival.z < t.z + 1000,
        ),
        d.name,
      );
  }
  const a = wantedRegions(manifest, ...Object.values(project(47.69, -122.355))),
    b = wantedRegions(manifest, ...Object.values(project(47.65, -122.35)));
  assert.equal(
    a.some((t) => b.some((r) => r.id === t.id)),
    false,
  );
  assert.deepEqual(wantedRegions(manifest, 0, 1000), []);
});
test("region aggregation deduplicates cross-boundary streets and discards all evicted data references", () => {
  const road = {
      id: 1,
      name: "Canal Street",
      points: [
        [0, 0],
        [1, 1],
      ],
      width: 9,
    },
    park = {
      ring: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    };
  const region = {
    data: { roads: [road], parks: [park], buildings: [{ id: 2 }] },
    city: { colliders: [{ minX: 1 }] },
  };
  const combined = combineRegions({ roads: [], parks: [], buildings: [] }, [
    region,
    region,
  ]);
  assert.equal(combined.roads.length, 1);
  assert.equal(combined.parks.length, 1);
  const cleared = combineRegions(core, []);
  assert.equal(cleared.buildings.length, core.buildings.length);
  assert.deepEqual(cleared.colliders, []);
  assert.ok(!cleared.roads.includes(road));
});
test("Ship Canal and Green Lake are water; bank constraints and bridge decks keep ground travel on land", () => {
  for (const [lat, lon, name] of [
    [47.636, -122.335, "Lake Union"],
    [47.6535, -122.362, "Ship Canal"],
    [47.677, -122.338, "Green Lake"],
  ]) {
    const p = project(lat, lon);
    assert.equal(waterAt(p.x, p.z)?.name, name);
    assert.equal(WORLD.isWalkable(p.x, p.z), false);
    const bank = constrainToLand(p.x, p.z);
    assert.ok(isLand(bank.x, bank.z));
  }
  for (const b of BRIDGES) {
    assert.equal(WORLD.isWalkable(b.x, b.z), true, b.name);
    assert.ok(Math.abs(heightAt(b.x, b.z) - b.deck) < 0.01);
    assert.deepEqual(constrainToLand(b.x, b.z), { x: b.x, z: b.z });
  }
});
test("bridge decks align with the City survey street centerlines", () => {
  const atlas = unzip("atlas.json.gz");
  for (const b of BRIDGES) {
    const p = nearestRoad(atlas, b.x, b.z);
    assert.ok(p.distance < 20, `${b.name}: centerline distance ${p.distance}`);
    assert.ok(
      Math.abs(heightAt(p.x, p.z) - b.deck) < 0.5,
      `${b.name}: continuous road deck`,
    );
  }
});
test("real north destinations snap to local streets in the streamed survey and Green Lake park preserves the lake hole", () => {
  const atlas = unzip("atlas.json.gz");
  for (const d of DESTINATIONS.filter((d) => d.z < -2520)) {
    const data = combineRegions(
      core,
      wantedRegions(manifest, d.arrival.x, d.arrival.z).map((t) => ({
        data: unzip(`${t.id}.json.gz`),
        city: { colliders: [] },
      })),
    );
    const p = nearestRoad(data, d.arrival.x, d.arrival.z);
    assert.ok(p.distance < 120, `${d.name}: ${p.distance}`);
    assert.ok(p.x >= BOUNDS.minX && p.z >= BOUNDS.minZ);
  }
  assert.ok(
    atlas.parks.find((p) => p.name === "GREEN LAKE PARK" && p.holes?.length),
  );
});
