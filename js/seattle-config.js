import { WATERWAYS } from "./seattle-waterways.js";
export { WATERWAYS };
// Local metric frame: Pike Place Market is the origin, east = +x, south = +z.
export const ORIGIN = { lat: 47.6097, lon: -122.3425 };
export function project(lat, lon) {
  return {
    x: (lon - ORIGIN.lon) * 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180),
    z: (ORIGIN.lat - lat) * 111320,
  };
}
export const CORE_BOUNDS = { minX: -2100, maxX: 2070, minZ: -2520, maxZ: 2300 };
export const landmarkClearance = (id) =>
  ({
    stadium: 160,
    needle: 48,
    market: 65,
    gasworks: 100,
    ballard: 95,
    shepherd: 65,
    locks: 140,
    greenwood: 65,
    phinney: 45,
    gardens: 50,
  })[id] ?? 35;
export const BOUNDS = {
  minX: -5450,
  maxX: 3200,
  minZ: -10600,
  maxZ: 2300,
  sidewalkHeight: 0.18,
};
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
  [47.638, -122.403],
  [47.646, -122.425],
  [47.656, -122.418],
  [47.668, -122.41],
  [47.68, -122.405],
  [47.692, -122.407],
  [47.705, -122.401],
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
export function inRing(ring, x, z) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > z !== b[1] > z &&
      x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
const waters = WATERWAYS.map((w) => ({
  ...w,
  minX: Math.min(...w.rings[0].map((p) => p[0])),
  maxX: Math.max(...w.rings[0].map((p) => p[0])),
  minZ: Math.min(...w.rings[0].map((p) => p[1])),
  maxZ: Math.max(...w.rings[0].map((p) => p[1])),
}));
export function waterAt(x, z) {
  return waters.find(
    (w) =>
      x >= w.minX &&
      x <= w.maxX &&
      z >= w.minZ &&
      z <= w.maxZ &&
      inRing(w.rings[0], x, z) &&
      !w.rings.slice(1).some((r) => inRing(r, x, z)),
  );
}
export const BRIDGES = [
  {
    name: "Fremont Bridge",
    ...project(47.6474, -122.34975),
    width: 22,
    length: 290,
    deck: 17,
    angle: 0,
  },
  {
    name: "Ballard Bridge",
    ...project(47.6593, -122.3762),
    width: 24,
    length: 640,
    deck: 23,
    angle: 0,
  },
  {
    name: "Aurora Bridge",
    ...project(47.64725, -122.3473),
    width: 28,
    length: 1100,
    deck: 66,
    angle: 0.01,
  },
  {
    name: "University Bridge",
    ...project(47.65345, -122.31978),
    width: 24,
    length: 600,
    deck: 20,
    angle: -0.48,
  },
];
export function bridgeAt(x, z) {
  for (const b of BRIDGES) {
    const dx = x - b.x,
      dz = z - b.z,
      cs = Math.cos(b.angle),
      sn = Math.sin(b.angle),
      across = dx * cs - dz * sn,
      along = dx * sn + dz * cs;
    if (Math.abs(across) <= b.width / 2 + 2 && Math.abs(along) <= b.length / 2)
      return b;
  }
}
export const isLand = (x, z) => x >= shoreAt(z).westX && !waterAt(x, z);
export function constrainToLand(x, z) {
  const water = waterAt(x, z);
  if (!water || bridgeAt(x, z)) return { x, z };
  let best = Infinity,
    result = { x, z };
  for (const ring of water.rings)
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1],
        b = ring[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      if (!len) continue;
      const t = Math.max(
          0,
          Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (len * len)),
        ),
        px = a[0] + t * dx,
        pz = a[1] + t * dz,
        d = Math.hypot(x - px, z - pz);
      if (d >= best) continue;
      for (const side of [-1, 1]) {
        const qx = px + side * (-dz / len) * 3,
          qz = pz + side * (dx / len) * 3;
        if (!waterAt(qx, qz)) {
          best = d;
          result = { x: qx, z: qz };
          break;
        }
      }
    }
  return result;
}
// Stylized elevations, not a survey. Canal banks ease down to water; Phinney rises above Green Lake.
export function terrainHeightAt(x, z) {
  const inland = Math.max(0, x - shoreAt(z).westX);
  const hill = (cx, cz, h, r) =>
    h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  let h =
    3 +
    Math.min(42, inland * 0.046) +
    hill(1500, 100, 45, 850) +
    hill(-900, -2200, 50, 600);
  if (z < -3400)
    h += hill(-950, -7800, 48, 1450) + hill(-250, -10000, 20, 1500);
  for (const w of waters) {
    if (
      x < w.minX - 160 ||
      x > w.maxX + 160 ||
      z < w.minZ - 160 ||
      z > w.maxZ + 160
    )
      continue;
    if (inRing(w.rings[0], x, z)) return w.level + 0.3;
    let distance = 160;
    for (const ring of w.rings)
      for (let i = 1; i < ring.length; i++) {
        const a = ring[i - 1],
          b = ring[i],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          t = Math.max(
            0,
            Math.min(
              1,
              ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1),
            ),
          );
        distance = Math.min(
          distance,
          Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t),
        );
      }
    h = Math.min(h, w.level + 1 + distance * 0.28);
  }
  return h;
}
export function heightAt(x, z) {
  const b = bridgeAt(x, z);
  if (!b) return terrainHeightAt(x, z);
  const along = Math.abs(
      (x - b.x) * Math.sin(b.angle) + (z - b.z) * Math.cos(b.angle),
    ),
    blend = Math.min(1, (b.length / 2 - along) / 100);
  return terrainHeightAt(x, z) * (1 - blend) + b.deck * blend;
}
const destination = (id, name, area, lat, lon, viewLat, viewLon) => {
  const p = project(lat, lon),
    arrival = project(viewLat, viewLon);
  return {
    id,
    name,
    area,
    ...p,
    arrival: {
      ...arrival,
      heading: Math.atan2(p.x - arrival.x, p.z - arrival.z),
    },
  };
};
export const DESTINATIONS = [
  destination(
    "needle",
    "Space Needle",
    "Seattle Center",
    47.62051,
    -122.3493,
    47.6197,
    -122.3493,
  ),
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
  destination(
    "smith",
    "Smith Tower",
    "Pioneer Square",
    47.6019,
    -122.3318,
    47.6013,
    -122.332,
  ),
  destination(
    "spheres",
    "The Spheres",
    "Denny Triangle",
    47.6157,
    -122.3393,
    47.6151,
    -122.339,
  ),
  destination(
    "stadium",
    "Lumen Field",
    "SoDo",
    47.5952,
    -122.3316,
    47.5969,
    -122.3334,
  ),
  destination(
    "lake",
    "Lake Union",
    "South Lake Union",
    47.6275,
    -122.3375,
    47.6269,
    -122.3375,
  ),
  destination(
    "troll",
    "Fremont Troll",
    "Fremont · Aurora Bridge",
    47.6511,
    -122.3474,
    47.6507,
    -122.3477,
  ),
  destination(
    "rocket",
    "Fremont Rocket",
    "Fremont · N 35th Street",
    47.6512,
    -122.3505,
    47.651,
    -122.3501,
  ),
  destination(
    "gasworks",
    "Gas Works Park",
    "Wallingford · Lake Union",
    47.6457,
    -122.3344,
    47.6473,
    -122.3344,
  ),
  destination(
    "locks",
    "Ballard Locks",
    "Ballard · Salmon Bay",
    47.665718,
    -122.39764,
    47.667,
    -122.3972,
  ),
  destination(
    "ballard",
    "Ballard Avenue",
    "Ballard · Historic District",
    47.6651,
    -122.3824,
    47.6647,
    -122.3822,
  ),
  destination(
    "shepherd",
    "Good Shepherd Center",
    "Wallingford · Meridian Park",
    47.6632,
    -122.3318,
    47.6626,
    -122.3316,
  ),
  destination(
    "greenlake",
    "Green Lake",
    "Green Lake · Bathhouse",
    47.6805,
    -122.345,
    47.681,
    -122.3452,
  ),
  destination(
    "greenwood",
    "Greenwood",
    "Greenwood Avenue · N 85th",
    47.6904,
    -122.3553,
    47.69,
    -122.3553,
  ),
  destination(
    "phinney",
    "Phinney Ridge",
    "Phinney Center · N 67th",
    47.6776,
    -122.354,
    47.6771,
    -122.354,
  ),
  destination(
    "gardens",
    "Golden Gardens",
    "Ballard · Shilshole Bay",
    47.6912,
    -122.4033,
    47.69,
    -122.4026,
  ),
];
export const WORLD = {
  bounds: BOUNDS,
  shoreAt,
  heightAt,
  constrain: constrainToLand,
  isWalkable: (x, z) => isLand(x, z) || !!bridgeAt(x, z),
};
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
  troll: { eye: [-35, 22, 65], target: [0, 5, 0] },
  rocket: { eye: [60, 25, 70], target: [0, 10, 0] },
  gasworks: { eye: [110, 65, 140], target: [0, 14, 0] },
  locks: { eye: [-130, 100, 160], target: [0, 0, 0] },
  ballard: { eye: [-85, 48, 120], target: [0, 10, 0] },
  shepherd: { eye: [100, 65, 135], target: [0, 15, 0] },
  greenlake: { eye: [-90, 65, 120], target: [110, -5, 0] },
  greenwood: { eye: [0, 38, 110], target: [0, 8, 0] },
  phinney: { eye: [-85, 45, 110], target: [0, 12, 0] },
  gardens: { eye: [100, 65, 120], target: [-80, -10, -60] },
};
