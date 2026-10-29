import { polygonContains } from "./building-collision.js";

// Clip altitude and broad bounds, then test the actual footprint so courtyards remain open.
export function viewSegmentBlocked(eye, target, box, margin = 1.5) {
  let near = 0,
    far = 1;
  for (const [axis, low, high] of [
    [0, "minX", "maxX"],
    [1, "minY", "maxY"],
    [2, "minZ", "maxZ"],
  ]) {
    const a = (box[low] ?? 0) - margin,
      b = box[high] + margin,
      d = target[axis] - eye[axis];
    if (Math.abs(d) < 1e-8) {
      if (eye[axis] < a || eye[axis] > b) return false;
      continue;
    }
    const ta = (a - eye[axis]) / d,
      tb = (b - eye[axis]) / d;
    near = Math.max(near, Math.min(ta, tb));
    far = Math.min(far, Math.max(ta, tb));
    if (near > far) return false;
  }
  if (!(near < 0.995 && far > 0.001)) return false;
  if (!box.polygon) return true;
  const low = Math.max(0.001, near),
    high = Math.min(0.995, far),
    dx = target[0] - eye[0],
    dz = target[2] - eye[2];
  const inside = (t) =>
    polygonContains(box.polygon, eye[0] + dx * t, eye[2] + dz * t);
  if (inside(low) || inside(high)) return true;
  for (const ring of [box.polygon.outer, ...box.polygon.holes])
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j],
        b = ring[i],
        ex = b.x - a.x,
        ez = b.z - a.z,
        det = dx * ez - dz * ex;
      if (Math.abs(det) < 1e-9) continue;
      const ax = a.x - eye[0],
        az = a.z - eye[2],
        t = (ax * ez - az * ex) / det,
        u = (ax * dz - az * dx) / det;
      if (t >= low && t <= high && u >= 0 && u <= 1) return true;
    }
  return false;
}
export function resolveLandmarkView(place, view, colliders, baseHeight) {
  const target = [
    place.x + view.target[0],
    baseHeight + view.target[1],
    place.z + view.target[2],
  ];
  const blockers = colliders.filter((c) => c.landmark !== place.name);
  const radius =
    view.radius ??
    (place.id === "spheres" ? 30 : place.id === "market" ? 27 : 12);
  const anchors = [
    [0, 0, 0],
    [-radius, 0, 0],
    [radius, 0, 0],
    [0, 0, -radius],
    [0, 0, radius],
  ].map((p) => p.map((v, i) => v + target[i]));
  const clear = (eye) =>
    anchors.every((t) => !blockers.some((b) => viewSegmentBlocked(eye, t, b)));
  for (const rise of [0, 35, 80, 140, 220, 340])
    for (const angle of [0, -0.55, 0.55, -1.1, 1.1, -1.65, 1.65, Math.PI]) {
      const cs = Math.cos(angle),
        sn = Math.sin(angle);
      const eye = [
        place.x + view.eye[0] * cs - view.eye[2] * sn,
        baseHeight + view.eye[1] + rise,
        place.z + view.eye[0] * sn + view.eye[2] * cs,
      ];
      if (clear(eye)) return { eye, target, clear: true };
    }
  // A vertical view is the deterministic final option for an enclosed urban courtyard.
  const eye = [
    target[0] + 0.1,
    Math.max(baseHeight + 600, ...blockers.map((b) => b.maxY + 80)),
    target[2] + 0.1,
  ];
  return { eye, target, clear: clear(eye) };
}
