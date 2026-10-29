// Local metric frame: Pike Place Market is the origin, east = +x, south = +z.
export const ORIGIN = { lat: 47.6097, lon: -122.3425 };
export function project(lat, lon) {
  return {
    x: (lon - ORIGIN.lon) * 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180),
    z: (ORIGIN.lat - lat) * 111320,
  };
}
export const BOUNDS = { minX: -2100, maxX: 2070, minZ: -2520, maxZ: 2300, sidewalkHeight: 0.18 };
// Simplified Elliott Bay bulkhead, sampled south to north from the working waterfront.
const COAST = [
  [47.589, -122.3508],
  [47.594, -122.3455],
  [47.6, -122.3394],
  // Downtown bulkhead follows the Alaskan Way snapshot, offset 30 m toward the bay.
  [47.603, -122.33771],
  [47.606, -122.34047],
  [47.609, -122.345],
  [47.612, -122.35002],
  [47.615, -122.35527],
  [47.621, -122.365],
  [47.627, -122.375],
  [47.634, -122.38],
]
  .map(([lat, lon]) => project(lat, lon))
  .sort((a, b) => a.z - b.z);
export function shoreAt(z) {
  let a = COAST[0],
    b = COAST[1];
  for (let i = 1; i < COAST.length; i++) {
    a = COAST[i - 1];
    b = COAST[i];
    if (z <= b.z) break;
  }
  const t = Math.max(0, Math.min(1, (z - a.z) / (b.z - a.z)));
  return { westX: a.x + (b.x - a.x) * t, eastX: BOUNDS.maxX };
}
// Stylized elevations, not a survey: rise inland from the waterfront into First Hill and Queen Anne.
export function heightAt(x, z) {
  const inland = Math.max(0, x - shoreAt(z).westX);
  const hill = (cx, cz, h, r) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  return 3 + Math.min(42, inland * 0.046) + hill(1500, 100, 45, 850) + hill(-900, -2200, 50, 600);
}
const destination = (id, name, area, lat, lon, viewLat, viewLon) => {
  const p = project(lat, lon),
    arrival = project(viewLat, viewLon);
  return {
    id,
    name,
    area,
    ...p,
    arrival: { ...arrival, heading: Math.atan2(p.x - arrival.x, p.z - arrival.z) },
  };
};
export const DESTINATIONS = [
  destination("needle", "Space Needle", "Seattle Center", 47.62051, -122.3493, 47.6197, -122.3493),
  destination(
    "market",
    "Pike Place Market",
    "Pike Place · Downtown",
    47.6093,
    -122.3424,
    47.6091,
    -122.3415,
  ),
  destination(
    "wheel",
    "Seattle Great Wheel",
    "Pier 57 · Elliott Bay",
    47.6059,
    -122.3425,
    47.6061,
    -122.3404,
  ),
  destination(
    "columbia",
    "Columbia Center",
    "5th Avenue · Downtown",
    47.6046,
    -122.3306,
    47.6038,
    -122.3304,
  ),
  destination("smith", "Smith Tower", "Pioneer Square", 47.6019, -122.3318, 47.6013, -122.332),
  destination("spheres", "The Spheres", "Denny Triangle", 47.6157, -122.3393, 47.6151, -122.339),
  destination("stadium", "Lumen Field", "SoDo", 47.5952, -122.3316, 47.5969, -122.3334),
  destination("lake", "Lake Union", "South Lake Union", 47.6275, -122.3375, 47.6269, -122.3375),
];
export const WORLD = { bounds: BOUNDS, shoreAt, heightAt };
export const coast = COAST;

// Hand-composed architectural views, in metres relative to each landmark.
export const LANDMARK_VIEWS = {
  needle: { eye: [-120, 108, 210], target: [0, 103, 0] },
  market: { eye: [88, 35, 105], target: [6, 14, 0] },
  wheel: { eye: [-95, 42, 110], target: [0, 28, 0] },
  columbia: { eye: [-230, 185, 300], target: [0, 145, 0] },
  smith: { eye: [-90, 78, 135], target: [0, 76, 0] },
  spheres: { eye: [65, 85, 125], target: [0, 15, 0] },
  stadium: { eye: [175, 155, 210], target: [0, 32, 0] },
  lake: { eye: [-150, 60, 100], target: [100, -40, -220] },
};
