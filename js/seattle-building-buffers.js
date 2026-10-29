// Indexed footprint extrusion, with separate roof/wall attributes. UVs are unnecessary:
// Seattle facades use stable world coordinates, and roofs use world-space surface detail.
export function buildingBuffers(ring, holes, height, base, triangulate) {
  const clean = (r) =>
    r.length > 1 && r[0][0] === r.at(-1)[0] && r[0][1] === r.at(-1)[1] ? r.slice(0, -1) : r;
  const rings = [ring, ...holes].map(clean),
    points = rings.flat(),
    n = points.length;
  const roof = { positions: [], normals: [], indices: [] },
    walls = { positions: [], normals: [], indices: [] };
  for (const y of [base + height, base])
    for (const [x, z] of points) {
      roof.positions.push(x, y, z);
      roof.normals.push(0, y === base ? -1 : 1, 0);
    }
  for (const face of triangulate(rings[0], rings.slice(1))) {
    let [a, b, c] = face;
    const p = points[a],
      q = points[b],
      r = points[c],
      up = (q[1] - p[1]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[1] - p[1]);
    if (up < 0) [b, c] = [c, b];
    roof.indices.push(a, b, c, a + n, c + n, b + n);
  }
  rings.forEach((r, index) => {
    let area = 0;
    for (let i = 0; i < r.length; i++) {
      const a = r[i],
        b = r[(i + 1) % r.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    const side = (area >= 0 ? 1 : -1) * (index === 0 ? 1 : -1);
    for (let i = 0; i < r.length; i++) {
      const a = r[i],
        b = r[(i + 1) % r.length],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      if (len < 1e-8) continue;
      const v = walls.positions.length / 3;
      walls.positions.push(
        a[0],
        base,
        a[1],
        b[0],
        base,
        b[1],
        b[0],
        base + height,
        b[1],
        a[0],
        base + height,
        a[1],
      );
      for (let j = 0; j < 4; j++) walls.normals.push((side * dz) / len, 0, (-side * dx) / len);
      if (side > 0) walls.indices.push(v, v + 2, v + 1, v, v + 3, v + 2);
      else walls.indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
    }
  });
  return { walls, roof };
}
