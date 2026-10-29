import { BOUNDS, DESTINATIONS, coast, WATERWAYS } from "./seattle-config.js";

const roadIndexes = new WeakMap();
export function nearestRoad(data, x, z) {
  let cells = roadIndexes.get(data.roads);
  if (!cells) {
    cells = new Map();
    for (const r of data.roads)
      for (let i = 1; i < r.points.length; i++) {
        const a = r.points[i - 1],
          b = r.points[i];
        for (
          let gx = Math.floor(Math.min(a[0], b[0]) / 300);
          gx <= Math.floor(Math.max(a[0], b[0]) / 300);
          gx++
        )
          for (
            let gz = Math.floor(Math.min(a[1], b[1]) / 300);
            gz <= Math.floor(Math.max(a[1], b[1]) / 300);
            gz++
          ) {
            const key = `${gx}:${gz}`;
            if (!cells.has(key)) cells.set(key, []);
            cells.get(key).push({ r, a, b });
          }
      }
    roadIndexes.set(data.roads, cells);
  }
  const near = [];
  for (let gx = Math.floor(x / 300) - 1; gx <= Math.floor(x / 300) + 1; gx++)
    for (let gz = Math.floor(z / 300) - 1; gz <= Math.floor(z / 300) + 1; gz++)
      near.push(...(cells.get(`${gx}:${gz}`) ?? []));
  let best = { x, z, distance: Infinity, name: "Seattle" };
  const test = ({ r, a, b }) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1),
      ),
    );
    const px = a[0] + dx * t,
      pz = a[1] + dz * t,
      distance = Math.hypot(px - x, pz - z);
    if (distance < best.distance)
      best = {
        x: px,
        z: pz,
        distance,
        name: r.name || "Seattle",
        heading: Math.atan2(dx, dz),
      };
  };
  near.forEach(test);
  // Outside the indexed neighbourhood (usually flight over the Sound), retain exact nearest-road semantics.
  if (best.distance > 300)
    for (const r of data.roads)
      for (let i = 1; i < r.points.length; i++)
        test({ r, a: r.points[i - 1], b: r.points[i] });
  return best;
}
export class SeattleMap {
  constructor(
    data,
    controllers,
    onTeleport,
    loadAtlas = async () => ({ roads: [], parks: [] }),
  ) {
    this.data = data;
    this.controllers = controllers;
    this.onTeleport = onTeleport;
    this.loadAtlas = loadAtlas;
    this.query = "";
    this.dialog = document.getElementById("atlas");
    this.radar = document.getElementById("radar");
    this.canvas = document.getElementById("atlas-map");
    this.mapView = {
      x: (BOUNDS.minX + BOUNDS.maxX) / 2,
      z: (BOUNDS.minZ + BOUNDS.maxZ) / 2,
      scale: Math.min(
        this.canvas.width / (BOUNDS.maxX - BOUNDS.minX + 400),
        this.canvas.height / (BOUNDS.maxZ - BOUNDS.minZ + 400),
      ),
    };
    document.getElementById("map-search").addEventListener("input", (e) => {
      this.query = e.target.value.trim().toLowerCase();
      this.draw();
      const hits = [
        ...DESTINATIONS,
        ...data.roads,
        ...(this.atlas?.roads ?? []),
      ].filter((d) => d.name.toLowerCase().includes(this.query));
      document.getElementById("map-status").textContent = this.query
        ? `${hits.length} matching places and street segments`
        : "Click a street or landmark to travel there.";
    });
    this.canvas.addEventListener("click", async (e) => {
      const r = this.canvas.getBoundingClientRect(),
        v = this.mapView;
      const x =
        (((e.clientX - r.left) / r.width) * this.canvas.width -
          this.canvas.width / 2) /
          v.scale +
        v.x;
      const z =
        (((e.clientY - r.top) / r.height) * this.canvas.height -
          this.canvas.height / 2) /
          v.scale +
        v.z;
      const landmark = DESTINATIONS.find(
        (d) => Math.hypot(d.x - x, d.z - z) < 90,
      );
      const p = landmark
        ? landmark.arrival
        : nearestRoad(
            { roads: [...this.data.roads, ...(this.atlas?.roads ?? [])] },
            x,
            z,
          );
      const status = document.getElementById("map-status");
      status.textContent = "Loading neighborhood…";
      if ((await this.onTeleport(p.x, p.z, p.heading)) !== false)
        this.dialog.close();
      else
        status.textContent =
          "Neighborhood could not load. Click the map to retry.";
    });
  }
  async open() {
    this.controllers.resetInput();
    this.dialog.showModal();
    this.draw();
    try {
      this.atlas = await this.loadAtlas();
      this.draw();
      if (!this.query)
        document.getElementById("map-status").textContent =
          "Click a street or landmark to travel there.";
    } catch (error) {
      document.getElementById("map-status").textContent = error.message;
    }
  }
  drawMap(canvas, view, labels) {
    const c = canvas.getContext("2d"),
      w = canvas.width,
      h = canvas.height,
      s = view.scale;
    c.fillStyle = "#17323d";
    c.fillRect(0, 0, w, h);
    c.save();
    c.translate(w / 2, h / 2);
    c.scale(s, s);
    c.translate(-view.x, -view.z);
    c.beginPath();
    coast.forEach((p, i) => (i ? c.lineTo(p.x, p.z) : c.moveTo(p.x, p.z)));
    c.lineTo(BOUNDS.maxX, BOUNDS.maxZ);
    c.lineTo(BOUNDS.maxX, BOUNDS.minZ);
    c.closePath();
    c.fillStyle = "#263b3c";
    c.fill();
    c.fillStyle = "#17323d";
    for (const water of WATERWAYS) {
      c.beginPath();
      for (const ring of water.rings) {
        ring.forEach(([x, z], i) => (i ? c.lineTo(x, z) : c.moveTo(x, z)));
        c.closePath();
      }
      c.fill("evenodd");
    }
    c.fillStyle = "#354a44";
    const visible = (x, z, r = 100) =>
      Math.abs(x - view.x) < w / (2 * s) + r &&
      Math.abs(z - view.z) < h / (2 * s) + r;
    for (const p of labels && this.atlas
      ? [...this.data.parks, ...this.atlas.parks]
      : this.data.parks) {
      if (!labels && !visible(p.x, p.z, 600)) continue;
      c.beginPath();
      p.ring.forEach(([x, z], i) => (i ? c.lineTo(x, z) : c.moveTo(x, z)));
      c.closePath();
      for (const ring of p.holes ?? []) {
        ring.forEach(([x, z], i) => (i ? c.lineTo(x, z) : c.moveTo(x, z)));
        c.closePath();
      }
      c.fill("evenodd");
    }
    for (const r of labels && this.atlas
      ? [...this.data.roads, ...this.atlas.roads]
      : this.data.roads) {
      if (!labels && !r.points.some(([x, z]) => visible(x, z, 200))) continue;
      const match = this.query && r.name.toLowerCase().includes(this.query);
      c.strokeStyle = match ? "#e6d393" : "#607573";
      c.lineWidth = match ? 9 : Math.max(r.width, 1.4 / s);
      c.beginPath();
      r.points.forEach(([x, z], i) => (i ? c.lineTo(x, z) : c.moveTo(x, z)));
      c.stroke();
    }
    c.fillStyle = "#3d5353";
    for (const b of this.data.buildings) {
      if (!visible(b.x, b.z, 100)) continue;
      c.beginPath();
      b.ring.forEach(([x, z], i) => (i ? c.lineTo(x, z) : c.moveTo(x, z)));
      c.closePath();
      c.fill();
    }
    const labelBoxes = [];
    for (const d of DESTINATIONS) {
      const match = !this.query || d.name.toLowerCase().includes(this.query);
      c.fillStyle = match ? "#b9edac" : "#77918a";
      c.beginPath();
      c.arc(d.x, d.z, labels ? 6 / s : 3 / s, 0, Math.PI * 2);
      c.fill();
      if (labels) {
        c.font = `${24 / s}px sans-serif`;
        const width = c.measureText(d.name).width,
          height = 30 / s;
        const candidates = [
          [d.x + 12 / s, d.z - 10 / s],
          [d.x + 12 / s, d.z + 30 / s],
          [d.x - width - 12 / s, d.z - 10 / s],
          [d.x + 12 / s, d.z - 42 / s],
          [d.x - width - 12 / s, d.z + 30 / s],
        ];
        const spot = candidates.find(
          ([x, y]) =>
            !labelBoxes.some(
              (b) =>
                x < b.x + b.w &&
                x + width > b.x &&
                y - height < b.y &&
                y > b.y - b.h,
            ),
        );
        if (spot && (!this.query || match)) {
          c.fillText(d.name, ...spot);
          labelBoxes.push({ x: spot[0], y: spot[1], w: width, h: height });
        }
      }
    }
    const p = this.controllers.getActiveEntity();
    c.save();
    c.translate(p.position.x, p.position.z);
    c.rotate(-p.heading);
    c.fillStyle = "#fff3c6";
    c.beginPath();
    c.moveTo(0, 10 / s);
    c.lineTo(-6 / s, -7 / s);
    c.lineTo(6 / s, -7 / s);
    c.closePath();
    c.fill();
    c.restore();
    c.restore();
    c.fillStyle = "#a8c4c2";
    c.font = "16px sans-serif";
    c.fillText("N ↑", 18, 26);
  }
  draw() {
    const p = this.controllers.getActiveEntity().position;
    this.drawMap(this.radar, { x: p.x, z: p.z, scale: 0.28 }, false);
    if (this.dialog.open) this.drawMap(this.canvas, this.mapView, true);
  }
}
