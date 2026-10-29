import { CORE_BOUNDS } from "./seattle-config.js";
export const REGION_LIMIT = 4;
export function regionDistance(tile, x, z, size = 1000) {
  return Math.hypot(
    Math.max(tile.x - x, 0, x - tile.x - size),
    Math.max(tile.z - z, 0, z - tile.z - size),
  );
}
// A fixed four-tile neighbourhood. Distance to the rectangle avoids gaps at tile corners.
export function wantedRegions(manifest, x, z) {
  if (
    z > CORE_BOUNDS.minZ + 770 &&
    x > CORE_BOUNDS.minX + 200 &&
    x < CORE_BOUNDS.maxX - 120
  )
    return [];
  return manifest.tiles
    .filter((t) => regionDistance(t, x, z, manifest.tileSize) < 1050)
    .sort(
      (a, b) =>
        regionDistance(a, x, z, manifest.tileSize) -
          regionDistance(b, x, z, manifest.tileSize) ||
        Math.hypot(a.x + 500 - x, a.z + 500 - z) -
          Math.hypot(b.x + 500 - x, b.z + 500 - z),
    )
    .slice(0, REGION_LIMIT);
}
export function combineRegions(core, regions) {
  const roads = new Map(core.roads.map((r) => [r.id, r])),
    parks = new Map(core.parks.map((p) => [JSON.stringify(p.ring), p]));
  const buildings = [...core.buildings],
    colliders = [];
  for (const region of regions) {
    buildings.push(...region.data.buildings);
    for (const r of region.data.roads) roads.set(r.id + ":north", r);
    for (const p of region.data.parks) parks.set(JSON.stringify(p.ring), p);
    colliders.push(...region.city.colliders);
  }
  return {
    buildings,
    roads: [...roads.values()],
    parks: [...parks.values()],
    colliders,
  };
}
