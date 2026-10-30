// Compile City of Seattle GIS snapshots into independently compressed 1 km tiles.
// Run fetch-seattle-north.mjs first. Heights are deterministic estimates, not survey data.
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { gzipSync } from "node:zlib";
import {encodeSeattle} from './seattle-encode.mjs';
import { project, BOUNDS, inRing } from "../js/seattle-config.js";
const input = new URL("../tmp/codex-north-source/", import.meta.url);
const output = new URL("../js/seattle-north/", import.meta.url);
mkdirSync(output, { recursive: true });
const read = (k) =>
  JSON.parse(readFileSync(new URL(`${k}.json`, input), "utf8")).features;
const round = (n) => Math.round(n * 10) / 10 || 0;
const point = (p) => {
  const v = project(p[1], p[0]);
  return [round(v.x), round(v.z)];
};
// Remove sub-metre survey noise without replacing the footprint with a box.
function simplify(points, tolerance = 0.35) {
  if (points.length < 4) return points;
  const sq = tolerance * tolerance;
  function segment(a, b) {
    let best = sq,
      index = -1;
    const p = points[a],
      q = points[b],
      dx = q[0] - p[0],
      dz = q[1] - p[1];
    for (let i = a + 1; i < b; i++) {
      const v = points[i],
        t = Math.max(
          0,
          Math.min(
            1,
            ((v[0] - p[0]) * dx + (v[1] - p[1]) * dz) /
              (dx * dx + dz * dz || 1),
          ),
        );
      const d = (v[0] - p[0] - t * dx) ** 2 + (v[1] - p[1] - t * dz) ** 2;
      if (d > best) {
        best = d;
        index = i;
      }
    }
    return index < 0 ? [p] : [...segment(a, index), ...segment(index, b)];
  }
  const result = [...segment(0, points.length - 1), points.at(-1)];
  return result.length >= 4 ? result : points;
}
const tiles = new Map(),
  size = 1000,
  overview = new Map();
const tile = (x, z) => {
  const id = `${Math.floor(x / size)}_${Math.floor(z / size)}`;
  if (!tiles.has(id)) tiles.set(id, { buildings: [], roads: [], parks: [] });
  return tiles.get(id);
};
const center = (ring) => [
  round(ring.reduce((s, p) => s + p[0], 0) / ring.length),
  round(ring.reduce((s, p) => s + p[1], 0) / ring.length),
];
const north = (x, z) =>
  x >= BOUNDS.minX &&
  x <= BOUNDS.maxX &&
  z >= BOUNDS.minZ &&
  z <= BOUNDS.maxZ &&
  (z < -2520 || x < -2100 || x > 2070);
let buildings = 0,
  roads = 0,
  parks = 0;
for (const f of read("buildings"))
  for (const [part, raw] of f.geometry.rings.entries()) {
    if (
      raw.reduce((s, p, i) => {
        const q = raw[(i + 1) % raw.length];
        return s + p[0] * q[1] - q[0] * p[1];
      }, 0) > 0
    )
      continue;
    const ring = simplify(raw.map(point)),
      [x, z] = center(ring),
      id = f.attributes.OBJECTID * 127 + part;
    if (!north(x, z) || ring.length < 4) continue;
    const area = Math.abs(
      ring.reduce((s, p, i) => {
        const q = ring[(i + 1) % ring.length];
        return s + p[0] * q[1] - q[0] * p[1];
      }, 0) / 2,
    );
    if (area < 12) continue; // Tiny sheds add cost without affecting the streetscape.
    const height =
      area < 55
        ? 3.2 + (id % 2) * 0.5
        : area < 220
          ? 5.8 + (id % 3) * 1.4
          : area < 700
            ? 9 + (id % 4) * 2.8
            : 12 + (id % 5) * 3.1;
    const holes = f.geometry.rings
      .filter(
        (r) =>
          r !== raw &&
          r.reduce((s, p, i) => {
            const q = r[(i + 1) % r.length];
            return s + p[0] * q[1] - q[0] * p[1];
          }, 0) > 0 &&
          inRing(ring, ...point(r[0])),
      )
      .map((r) => simplify(r.map(point)));
    tile(x, z).buildings.push({
      id: 1000000000 + id,
      x,
      z,
      height: round(height),
      ring,
      ...(holes.length ? { holes } : {}),
    });
    buildings++;
    const key = `${Math.floor(x / 90)}:${Math.floor(z / 90)}`,
      block = overview.get(key) ?? { x: 0, z: 0, n: 0, height: 0 };
    block.x += x;
    block.z += z;
    block.n++;
    block.height = Math.max(block.height, height);
    overview.set(key, block);
  }
const atlasRoads = [];
for (const f of read("roads"))
  for (const path of f.geometry.paths) {
    const points = simplify(path.map(point)),
      [x, z] = center(points),
      a = f.attributes;
    if (!north(x, z) || points.length < 2) continue;
    const rawWidth = Number(a.SURFACEWIDTH) * 0.3048,
      width = round(Math.max(4, Math.min(24, rawWidth || 9)));
    const name = (a.ONSTREET || a.STNAME_ORD || a.UNITDESC || "Seattle street")
      .trim()
      .replace(/\s+/g, " ");
    const road = { id: a.OBJECTID, name, width, points };
    // Roads crossing a tile boundary belong to each intersected tile; deduplicated at runtime.
    const xs = points.map((p) => p[0]),
      zs = points.map((p) => p[1]);
    for (
      let tx = Math.floor(Math.min(...xs) / size);
      tx <= Math.floor(Math.max(...xs) / size);
      tx++
    )
      for (
        let tz = Math.floor(Math.min(...zs) / size);
        tz <= Math.floor(Math.max(...zs) / size);
        tz++
      )
        tile(tx * size, tz * size).roads.push(road);
    atlasRoads.push(road);
    roads++;
  }
const atlasParks = [];
for (const f of read("parks"))
  for (const raw of f.geometry.rings) {
    const signed = raw.reduce((s, p, i) => {
      const q = raw[(i + 1) % raw.length];
      return s + p[0] * q[1] - q[0] * p[1];
    }, 0);
    if (signed > 0 || f.attributes.NAME === "GREEN LAKE") continue; // holes and the lake itself are not lawns.
    const ring = simplify(raw.map(point), 2),
      [x, z] = center(ring);
    if (!north(x, z) || ring.length < 4) continue;
    const holes = f.geometry.rings
      .filter(
        (r) =>
          r !== raw &&
          r.reduce((s, p, i) => {
            const q = r[(i + 1) % r.length];
            return s + p[0] * q[1] - q[0] * p[1];
          }, 0) > 0 &&
          inRing(ring, ...point(r[0])),
      )
      .map((r) => simplify(r.map(point), 2));
    const park = {
      name: f.attributes.NAME || "Park",
      x,
      z,
      ring,
      ...(holes.length ? { holes } : {}),
    };
    const xs = ring.map((p) => p[0]),
      zs = ring.map((p) => p[1]);
    for (
      let tx = Math.max(
        Math.floor(BOUNDS.minX / size),
        Math.floor(Math.min(...xs) / size),
      );
      tx <=
      Math.min(
        Math.floor(BOUNDS.maxX / size),
        Math.floor(Math.max(...xs) / size),
      );
      tx++
    )
      for (
        let tz = Math.max(
          Math.floor(BOUNDS.minZ / size),
          Math.floor(Math.min(...zs) / size),
        );
        tz <= Math.min(-3, Math.floor(Math.max(...zs) / size));
        tz++
      )
        tile(tx * size, tz * size).parks.push(park);
    atlasParks.push(park);
    parks++;
  }
const waterways = read("water")
  .filter((f) => [10, 13, 17, 64].includes(f.attributes.OBJECTID))
  .map((f) => ({
    name:
      f.attributes.OBJECTID === 10
        ? "Lake Union"
        : f.attributes.OBJECTID === 13
          ? "Salmon Bay"
          : "Ship Canal",
    level: 6,
    rings: f.geometry.rings.map((r) => simplify(r.map(point), 5)),
  }));
const shore = read("shore"),
  green = [15, 108].flatMap((id) =>
    shore
      .find((f) => f.attributes.OBJECTID === id)
      .geometry.paths[0].map(point),
  );
waterways.push({
  name: "Green Lake",
  level: 50.3,
  rings: [simplify(green, 4)],
});
writeFileSync(
  new URL("../seattle-waterways.js", output),
  `// City of Seattle Shoreline and Waterlines/Channels, simplified to 4–5 m.\nexport const WATERWAYS = ${JSON.stringify(waterways)};\n`,
);
const manifest = {
  version: 2,
  format: 'SSP1',
  tileSize: size,
  source:
    "City of Seattle GIS: Building Outlines 2023, Seattle Streets, Parks boundaries; heights estimated",
  buildings,
  roads,
  parks,
  tiles: [],
};
for (const [id, data] of [...tiles].sort(([a], [b]) => a.localeCompare(b))) {
  const [tx, tz] = id.split("_").map(Number),
    bytes = gzipSync(encodeSeattle(data), { level: 9 });
  writeFileSync(new URL(`${id}.bin.gz`, output), bytes);
  manifest.tiles.push({
    id,
    x: tx * size,
    z: tz * size,
    bytes: bytes.length,
    buildings: data.buildings.length,
  });
}
const atlas = gzipSync(
  encodeSeattle({ roads: atlasRoads, parks: atlasParks }),
  { level: 9 },
);
writeFileSync(new URL("atlas.bin.gz", output), atlas);
manifest.atlasBytes = atlas.length;
const distant = [...overview.values()].map((b) => [
  round(b.x / b.n),
  round(b.z / b.n),
  round(b.height),
  round(Math.min(65, 16 + Math.sqrt(b.n) * 9)),
]);
const coarse = gzipSync(encodeSeattle(distant), { level: 9 });
writeFileSync(new URL("overview.bin.gz", output), coarse);
manifest.overviewBytes = coarse.length;
manifest.overviewBlocks = distant.length;
const valid = new Set(manifest.tiles.map((t) => `${t.id}.bin.gz`));
for (const name of readdirSync(output))
  if (/^-?\d+_-?\d+\.(?:bin|json)\.gz$/.test(name) && !valid.has(name))
    unlinkSync(new URL(name, output));
writeFileSync(new URL("manifest.json", output), JSON.stringify(manifest));
console.log(
  JSON.stringify({
    ...manifest,
    tiles: manifest.tiles.length,
    totalTileBytes: manifest.tiles.reduce((s, t) => s + t.bytes, 0),
    maxTileBytes: Math.max(...manifest.tiles.map((t) => t.bytes)),
  }),
);
