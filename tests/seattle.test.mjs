import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {decodeSeattle} from '../js/seattle-codec.js';
import {
  DESTINATIONS,
  project,
  BOUNDS,
  heightAt,
  shoreAt,
} from "../js/seattle-config.js";
import { nearestRoad } from "../js/seattle-map.js";
const data = JSON.parse(
  readFileSync(new URL("../tools/data/seattle-core.json", import.meta.url), "utf8"),
);
test("Seattle projection uses a metric east/south frame at Pike Place", () => {
  assert.deepEqual(project(47.6097, -122.3425), { x: 0, z: 0 });
  assert.ok(project(47.6197, -122.3425).z < -1100);
  assert.ok(project(47.6097, -122.3325).x > 740);
});
test("offline Seattle snapshot has real footprints, named roads, finite heights and provenance", () => {
  assert.ok(data.buildings.length > 4000);
  assert.ok(data.roads.length > 2000);
  assert.ok(data.parks.length > 40);
  assert.match(data.source, /OpenStreetMap/);
  assert.ok(data.roads.some((r) => r.name === "Pike Street"));
  for (const b of data.buildings) {
    assert.ok(b.ring.length >= 4);
    assert.ok(b.height >= 3 && b.height <= 300);
    for (const p of b.ring) assert.ok(p.every(Number.isFinite));
  }
});
test("every Seattle destination can reach a real road inside the playable coast", () => {
  assert.equal(new Set(DESTINATIONS.map((d) => d.id)).size, 95);
  const north = decodeSeattle(
    gunzipSync(
      readFileSync(
        new URL("../js/seattle-north/atlas.bin.gz", import.meta.url),
      ),
    ),
  );
  for (const d of DESTINATIONS) {
    assert.ok(d.x > BOUNDS.minX && d.x < BOUNDS.maxX);
    assert.ok(d.z > BOUNDS.minZ && d.z < BOUNDS.maxZ);
    const p = nearestRoad(
      { roads: [...data.roads, ...north.roads] },
      d.arrival.x,
      d.arrival.z,
    );
    assert.ok(p.distance < 150, `${d.name}: a nearby real street`);
    assert.ok(p.x > shoreAt(p.z).westX + 8, `${d.name}: on land`);
    assert.ok(Number.isFinite(p.heading));
    assert.ok(Number.isFinite(heightAt(p.x, p.z)));
  }
});
test("Seattle entry loads Seattle assets and uses a distinct save slot", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const entry = readFileSync(
    new URL("../js/seattle.js", import.meta.url),
    "utf8",
  );
  assert.match(html, /<title>Slop Seattle<\/title>/);
  assert.match(html, /src="\.\/js\/seattle.js"/);
  assert.doesNotMatch(html, /src="\.\/js\/main.js"/);
  assert.match(entry, /slop-seattle-player-v1/);
});
