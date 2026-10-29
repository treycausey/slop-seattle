import { heightAt, DESTINATIONS } from "./seattle-config.js";

export const TILE_SIZE = 160,
  TILE_LIMIT = 9,
  PART_LIMIT = 256;
export const DETAIL_KINDS = ["dark", "white", "timber", "concrete", "leaf", "steel"];
const cell = (v) => Math.floor(v / TILE_SIZE);
export const tileKey = (x, z) => `${x}:${z}`;
const hash = (n) => {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n >>> 0) / 4294967296;
};
function inside(ring, x, z) {
  let yes = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0])
      yes = !yes;
  }
  return yes;
}

// References only: no scene objects or per-building detail is allocated during indexing.
export function detailIndex(data) {
  const grid = new Map();
  const add = (kind, object, minX, minZ, maxX, maxZ) => {
    for (let x = cell(minX); x <= cell(maxX); x++)
      for (let z = cell(minZ); z <= cell(maxZ); z++) {
        const key = tileKey(x, z);
        if (!grid.has(key)) grid.set(key, { roads: [], buildings: [], parks: [] });
        grid.get(key)[kind].push(object);
      }
  };
  for (const b of data.buildings) {
    if (
      DESTINATIONS.some(
        (d) =>
          d.id !== "lake" &&
          Math.hypot(d.x - b.x, d.z - b.z) <
            (d.id === "stadium" ? 160 : d.id === "needle" ? 48 : d.id === "market" ? 65 : 35),
      )
    )
      continue;
    add(
      "buildings",
      b,
      Math.min(...b.ring.map((p) => p[0])) - 3,
      Math.min(...b.ring.map((p) => p[1])) - 3,
      Math.max(...b.ring.map((p) => p[0])) + 3,
      Math.max(...b.ring.map((p) => p[1])) + 3,
    );
  }
  for (const r of data.roads)
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1],
        b = r.points[i],
        pad = r.width / 2 + 4;
      add(
        "roads",
        { a, b, width: r.width, seed: (r.id | 0) + i },
        Math.min(a[0], b[0]) - pad,
        Math.min(a[1], b[1]) - pad,
        Math.max(a[0], b[0]) + pad,
        Math.max(a[1], b[1]) + pad,
      );
    }
  for (const p of data.parks) add("parks", p, p.x - 35, p.z - 35, p.x + 35, p.z + 35);
  return grid;
}

export function planDetailTile(grid, tx, tz) {
  const parts = Object.fromEntries(DETAIL_KINDS.map((k) => [k, []]));
  const content = grid.get(tileKey(tx, tz));
  if (!content) return parts;
  const owns = (x, z) => cell(x) === tx && cell(z) === tz;
  const put = (kind, x, y, z, w, h, d, yaw = 0) => {
    if (parts[kind].length < PART_LIMIT) parts[kind].push([x, y + h / 2, z, w, h, d, yaw]);
  };
  const occupied = (x, z) => content.buildings.some((b) => inside(b.ring, x, z));
  const onRoad = (x, z, margin = 0) =>
    content.roads.some((r) => {
      const dx = r.b[0] - r.a[0],
        dz = r.b[1] - r.a[1],
        l = dx * dx + dz * dz;
      const t = l ? Math.max(0, Math.min(1, ((x - r.a[0]) * dx + (z - r.a[1]) * dz) / l)) : 0;
      return Math.hypot(x - r.a[0] - t * dx, z - r.a[1] - t * dz) < r.width / 2 + margin;
    });
  const tree = (x, z, s = 1) => {
    const y = heightAt(x, z) + 0.2;
    put("timber", x, y, z, 0.26 * s, 3 * s, 0.26 * s);
    for (let j = 0; j < 3; j++)
      put(
        "leaf",
        x,
        y + (2 + j * 1.25) * s,
        z,
        (3.6 - j * 0.8) * s,
        3 * s,
        (3.6 - j * 0.8) * s,
        j * 0.8,
      );
  };
  for (const r of content.roads) {
    const dx = r.b[0] - r.a[0],
      dz = r.b[1] - r.a[1],
      len = Math.hypot(dx, dz);
    if (len < 12 || r.width < 5 || r.width > 24) continue;
    const ux = dx / len,
      uz = dz / len,
      yaw = Math.atan2(ux, uz);
    // Skip samples outside this tile before testing footprints or intersections.
    const cx = (tx + 0.5) * TILE_SIZE,
      cz = (tz + 0.5) * TILE_SIZE;
    const along = (cx - r.a[0]) * ux + (cz - r.a[1]) * uz;
    for (
      let j = Math.max(0, Math.floor((along - 130) / 28));
      j * 28 + 12 < Math.min(len - 8, along + 130);
      j++
    ) {
      const dist = j * 28 + 12;
      for (const side of [-1, 1]) {
        const x = r.a[0] + ux * dist - uz * (r.width / 2 + 1.4) * side,
          z = r.a[1] + uz * dist + ux * (r.width / 2 + 1.4) * side;
        if (!owns(x, z) || occupied(x, z) || onRoad(x, z, 0.6)) continue;
        const seed = (r.seed + j * 71 + side * 19) | 0,
          pick = Math.floor(hash(seed) * 5),
          y = heightAt(x, z) + 0.25;
        const local = (kind, ox, oy, oz, w, h, d) =>
          put(
            kind,
            x + ox * Math.cos(yaw) + oz * Math.sin(yaw),
            y + oy,
            z - ox * Math.sin(yaw) + oz * Math.cos(yaw),
            w,
            h,
            d,
            yaw,
          );
        if (pick === 0) {
          // Slatted bench, back, two feet.
          for (let slat = 0; slat < 4; slat++)
            local("timber", slat * 0.15 - 0.23, 0.5, 0, 0.12, 0.09, 1.8);
          local("timber", 0.29, 0.65, 0, 0.1, 0.5, 1.8);
          for (const end of [-0.65, 0.65]) local("dark", 0, 0, end, 0.45, 0.5, 0.09);
        } else if (pick === 1) {
          // Planter and layered tree canopy.
          local("concrete", 0, 0, 0, 1.1, 0.6, 1.1);
          tree(x, z, 0.8 + hash(seed + 3) * 0.3);
        } else if (pick === 2) {
          // Street lamp; reused white material avoids a new shader family.
          local("steel", 0, 0, 0, 0.14, 6.7, 0.14);
          local("dark", -0.45, 6.6, 0, 1, 0.14, 0.3);
          local("white", -0.8, 6.55, 0, 0.45, 0.12, 0.32);
        } else if (pick === 3) {
          // Paired inverted-U cycle stands.
          for (const end of [-0.65, 0.65]) {
            for (const foot of [-0.35, 0.35]) local("steel", foot, 0, end, 0.07, 0.85, 0.07);
            local("steel", 0, 0.8, end, 0.75, 0.07, 0.07);
          }
        } else {
          local("dark", 0, 0, 0, 0.6, 0.9, 0.6);
          local("steel", 0, 0.87, 0, 0.66, 0.08, 0.66);
        }
        // A few curbside cars, kept clear of junctions and footprints.
        if (hash(seed + 91) < 0.18 && r.width >= 9) {
          const px = x + uz * side * 2.8,
            pz = z - ux * side * 2.8;
          if (
            !occupied(px, pz) &&
            !content.roads.some(
              (other) =>
                other !== r &&
                Math.abs((other.b[0] - other.a[0]) * uz - (other.b[1] - other.a[1]) * ux) > 3 &&
                Math.hypot(other.a[0] - px, other.a[1] - pz) < 10,
            )
          ) {
            const py = heightAt(px, pz) + 0.27;
            put("white", px, py + 0.25, pz, 1.7, 0.65, 3.9, yaw);
            put("dark", px, py + 0.9, pz, 1.5, 0.6, 2.1, yaw);
            for (const ex of [-0.82, 0.82])
              for (const ez of [-1.2, 1.2])
                put(
                  "dark",
                  px + ex * Math.cos(yaw) + ez * Math.sin(yaw),
                  py,
                  pz - ex * Math.sin(yaw) + ez * Math.cos(yaw),
                  0.18,
                  0.6,
                  0.65,
                  yaw,
                );
          }
        }
      }
    }
  }
  for (const b of content.buildings) {
    const roof = heightAt(b.x, b.z) + b.height;
    for (let i = 1; i < b.ring.length; i++) {
      const a = b.ring[i - 1],
        c = b.ring[i],
        dx = c[0] - a[0],
        dz = c[1] - a[1],
        len = Math.hypot(dx, dz);
      if (len < 5) continue;
      const yaw = Math.atan2(dx, dz),
        mx = (a[0] + c[0]) / 2,
        mz = (a[1] + c[1]) / 2;
      if (!owns(mx, mz)) continue;
      // Edge trim follows real footprints; no bounding-box parapets across courtyards.
      put("concrete", mx, roof, mz, 0.28, 0.55, len, yaw);
      const nx = -dz / len,
        nz = dx / len,
        side = inside(b.ring, mx + nx, mz + nz) ? -1 : 1;
      const x = mx + nx * 0.25 * side,
        z = mz + nz * 0.25 * side,
        y = heightAt(b.x, b.z);
      if (b.height < 65 && !onRoad(x, z)) {
        put("dark", x, y + 0.2, z, 0.2, 2.7, 1.5, yaw);
        put("steel", x, y + 2.9, z, 0.8, 0.12, 2.2, yaw);
        if ((b.id + i) % 3 === 0)
          put(
            "timber",
            x + nx * 0.6 * side,
            y + 3,
            z + nz * 0.6 * side,
            1.6,
            0.18,
            Math.min(6, len - 1),
            yaw,
          );
      }
    }
    if (owns(b.x, b.z) && inside(b.ring, b.x, b.z) && b.height > 6) {
      // Compact rooftop vents, fins and ducts, only when their corners fit the roof.
      if (
        [
          [-2, -2],
          [-2, 2],
          [2, 2],
          [2, -2],
        ].every(([x, z]) => inside(b.ring, b.x + x, b.z + z))
      ) {
        put("steel", b.x, roof + 0.1, b.z, 2.8, 1.2, 2.4);
        for (let j = 0; j < 5; j++) put("dark", b.x - 1 + j * 0.5, roof + 1.3, b.z, 0.12, 0.1, 2.2);
        put("concrete", b.x + 1.5, roof, b.z + 1.5, 0.45, 2, 0.45);
      }
    }
  }
  for (const p of content.parks)
    for (let i = 0; i < 18; i++) {
      const x = p.x + (hash(i + Math.round(p.x) * 31) - 0.5) * 60,
        z = p.z + (hash(i + Math.round(p.z) * 71) - 0.5) * 60;
      if (owns(x, z) && inside(p.ring, x, z) && !occupied(x, z) && !onRoad(x, z, 2))
        tree(x, z, 0.8 + hash(i + 7) * 0.7);
    }
  return parts;
}

export function nearbyTiles(x, z) {
  const tx = cell(x),
    tz = cell(z),
    out = [];
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) out.push([tx + dx, tz + dz]);
  return out.sort(
    (a, b) =>
      Math.hypot((a[0] + 0.5) * TILE_SIZE - x, (a[1] + 0.5) * TILE_SIZE - z) -
      Math.hypot((b[0] + 0.5) * TILE_SIZE - x, (b[1] + 0.5) * TILE_SIZE - z),
  );
}
