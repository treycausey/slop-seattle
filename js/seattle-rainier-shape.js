// Stylized radial terrain, not a DEM. Three summit shoulders and radial glacier valleys.
export function rainierHeight(x, z) {
  const r = Math.hypot(x / 1.13, z),
    a = Math.atan2(z, x),
    flank = 3500 * Math.max(0, 1 - r / 14000) ** 1.65;
  if (r >= 14000) return 0;
  const summit = 4200 * Math.exp(-((r / 5300) ** 2));
  const shoulder = (cx, cz, h, w) =>
    h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (w * w));
  const crest = Math.max(
    summit + shoulder(350, -150, 192, 600),
    shoulder(-1750, -500, 3950, 3100),
    shoulder(1300, 1000, 4000, 2900),
  );
  const ridges =
    Math.sin(a * 13 + r * 0.0005) *
    Math.sin(a * 7 - r * 0.00025) *
    Math.min(210, r * 0.06) *
    Math.max(0, 1 - r / 14000);
  return Math.max(0, Math.min(4392, Math.max(flank, crest) + ridges));
}
export function rainierShape(sectors = 72, rings = 32) {
  const positions = [],
    colors = [],
    indices = [];
  for (let j = 0; j <= rings; j++)
    for (let i = 0; i <= sectors; i++) {
      const a = (i / sectors) * Math.PI * 2,
        r = (j / rings) * 14000,
        x = Math.cos(a) * r * 1.13,
        z = Math.sin(a) * r,
        h = rainierHeight(x, z);
      positions.push(x, h, z);
      const glacier = Math.cos(a * 9 + r * 0.00012),
        snow = h > 2250 + 500 * Math.sin(a * 5) - 650 * Math.max(0, glacier),
        grain = 0.94 + 0.06 * Math.sin(h * 0.035 + a * 17);
      colors.push(
        ...(snow
          ? [0.69 * grain, 0.79 * grain, 0.85 * grain]
          : [0.25 * grain, 0.36 * grain, 0.44 * grain]),
      );
      if (j < rings && i < sectors) {
        const p = j * (sectors + 1) + i,
          q = p + sectors + 1;
        indices.push(p, q + 1, q, p, p + 1, q + 1);
      }
    }
  return { positions, colors, indices };
}
