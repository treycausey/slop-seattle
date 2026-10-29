const indices = new WeakMap(),
  CELL = 160;
const key = (x, z) => `${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`;

// terrainHeightAt clamps edge distance at 160 m. A segment farther away cannot affect its result.
// Cache references only in cells intersecting that radius, preserving the exact segment calculation.
export function boundaryDistance(water, x, z) {
  let cells = indices.get(water);
  if (!cells) {
    cells = new Map();
    indices.set(water, cells);
    for (const ring of water.rings)
      for (let i = 1; i < ring.length; i++) {
        const a = ring[i - 1],
          b = ring[i],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          length = dx * dx + dz * dz || 1,
          segment = { a, dx, dz, length };
        for (
          let cx = Math.floor((Math.min(a[0], b[0]) - CELL) / CELL);
          cx <= Math.floor((Math.max(a[0], b[0]) + CELL) / CELL);
          cx++
        )
          for (
            let cz = Math.floor((Math.min(a[1], b[1]) - CELL) / CELL);
            cz <= Math.floor((Math.max(a[1], b[1]) + CELL) / CELL);
            cz++
          ) {
            const k = `${cx}:${cz}`;
            if (!cells.has(k)) cells.set(k, []);
            cells.get(k).push(segment);
          }
      }
  }
  let distance = CELL;
  for (const { a, dx, dz, length } of cells.get(key(x, z)) ?? []) {
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / length));
    distance = Math.min(distance, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t));
  }
  return distance;
}
