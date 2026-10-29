import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  detailIndex,
  planDetailTile,
  nearbyTiles,
  TILE_SIZE,
  TILE_LIMIT,
  PART_LIMIT,
  DETAIL_KINDS,
} from "../js/seattle-detail-plan.js";
const data = JSON.parse(readFileSync(new URL("../js/seattle-data.json", import.meta.url)));

test("detail planning is deterministic, local, finite and capped across real neighborhoods", () => {
  const grid = detailIndex(data);
  let total = 0;
  for (const [x, z] of [
    [0, 0],
    [-500, -1200],
    [800, 600],
    [0, -2500],
  ]) {
    const tiles = nearbyTiles(x, z);
    assert.equal(tiles.length, TILE_LIMIT);
    assert.equal(new Set(tiles.map((p) => p.join(":"))).size, TILE_LIMIT);
    for (const [tx, tz] of tiles) {
      const first = planDetailTile(grid, tx, tz);
      assert.deepEqual(first, planDetailTile(grid, tx, tz));
      for (const kind of DETAIL_KINDS) {
        assert.ok(first[kind].length <= PART_LIMIT);
        for (const p of first[kind]) {
          assert.ok(p.every(Number.isFinite));
          assert.ok(p.slice(3, 6).every((v) => v > 0));
          // Components may extend slightly across the edge of their owning tile.
          assert.ok(p[0] > tx * TILE_SIZE - 10 && p[0] < (tx + 1) * TILE_SIZE + 10);
          assert.ok(p[2] > tz * TILE_SIZE - 10 && p[2] < (tz + 1) * TILE_SIZE + 10);
        }
        total += first[kind].length;
      }
    }
  }
  assert.ok(total > 1000, `real nearby detail: ${total}`);
});

test("empty tiles stay empty and negative coordinates use floor ownership", () => {
  assert.deepEqual(
    planDetailTile(new Map(), -1, -1),
    Object.fromEntries(DETAIL_KINDS.map((k) => [k, []])),
  );
  assert.ok(nearbyTiles(-1, -1).some(([x, z]) => x === -1 && z === -1));
});

test("street furniture avoids crossing roads and occupied building footprints", () => {
  const fixture = {
    buildings: [
      {
        id: 1,
        x: 72,
        z: 72,
        height: 20,
        ring: [
          [60, 60],
          [85, 60],
          [85, 85],
          [60, 85],
          [60, 60],
        ],
      },
    ],
    parks: [],
    roads: [
      {
        id: 1,
        width: 10,
        points: [
          [10, 10],
          [150, 10],
        ],
      },
      {
        id: 2,
        width: 10,
        points: [
          [78, -20],
          [78, 150],
        ],
      },
    ],
  };
  const parts = planDetailTile(detailIndex(fixture), 0, 0);
  const lamps = parts.steel.filter((p) => p[4] === 6.7);
  for (const p of lamps) {
    assert.ok(!(p[0] > 60 && p[0] < 85 && p[2] > 60 && p[2] < 85));
    assert.ok(Math.abs(p[2] - 10) >= 5 && Math.abs(p[0] - 78) >= 5);
  }
  assert.ok(Object.values(parts).flat().length > 0);
});
