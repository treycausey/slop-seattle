// Transform a saved Overpass `out geom` response into the offline city snapshot.
// Usage: bun run tools/build-seattle.mjs tmp/seattle-osm.json
import { readFileSync, writeFileSync } from "node:fs";
import { project, BOUNDS, shoreAt } from "../js/seattle-config.js";
const input = process.argv[2];
if (!input) throw new Error("Supply a saved Overpass JSON response");
const source = JSON.parse(readFileSync(input, "utf8"));
if (source.remark || !Array.isArray(source.elements))
  throw new Error("Incomplete Overpass response");
const data = {
  source: "© OpenStreetMap contributors, ODbL",
  generatedAt: new Date().toISOString(),
  bounds: BOUNDS,
  buildings: [],
  roads: [],
  parks: [],
};
const round = (n) => Math.round(n * 10) / 10;
for (const e of source.elements) {
  if (!e.geometry?.length) continue;
  const points = e.geometry
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map((p) => {
      const v = project(p.lat, p.lon);
      return [round(v.x), round(v.z)];
    });
  if (points.length < 2) continue;
  const x = points.reduce((a, p) => a + p[0], 0) / points.length,
    z = points.reduce((a, p) => a + p[1], 0) / points.length;
  if (z < BOUNDS.minZ || z > BOUNDS.maxZ || x > BOUNDS.maxX || x < shoreAt(z).westX - 80) continue;
  const t = e.tags ?? {};
  if (t.building && t.building !== "no" && points.length >= 4) {
    const raw = parseFloat(t.height),
      levels = parseFloat(t["building:levels"]);
    const height = Number.isFinite(raw)
      ? raw * (/ft/.test(t.height) ? 0.3048 : 1)
      : Number.isFinite(levels)
        ? levels * 3.4
        : 9 + (e.id % 5) * 3;
    data.buildings.push({
      id: e.id,
      name: t.name ?? "",
      x: round(x),
      z: round(z),
      height: round(Math.max(3, Math.min(300, height))),
      ring: points,
    });
  } else if (t.highway) {
    const width =
      parseFloat(t.width) ||
      ({ motorway: 22, trunk: 20, primary: 16, secondary: 14, tertiary: 12, pedestrian: 7 }[
        t.highway
      ] ??
        9);
    data.roads.push({
      id: e.id,
      name: t.name ?? "",
      width: Math.max(4, Math.min(28, width)),
      points,
    });
  } else if (t.leisure === "park")
    data.parks.push({ name: t.name ?? "", x: round(x), z: round(z), ring: points });
}
if (data.buildings.length < 500 || data.roads.length < 100)
  throw new Error("Seattle snapshot is unexpectedly sparse");
writeFileSync(new URL("../js/seattle-data.json", import.meta.url), JSON.stringify(data));
console.log(
  JSON.stringify({
    buildings: data.buildings.length,
    roads: data.roads.length,
    parks: data.parks.length,
  }),
);
