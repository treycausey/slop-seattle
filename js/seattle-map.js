import { BOUNDS, DESTINATIONS, coast } from "./seattle-config.js";

export function nearestRoad(data, x, z) {
  let best = { x, z, distance: Infinity, name: "Seattle" };
  for (const r of data.roads)
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1],
        b = r.points[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1];
      const t = Math.max(
        0,
        Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)),
      );
      const px = a[0] + dx * t,
        pz = a[1] + dz * t,
        distance = Math.hypot(px - x, pz - z);
      if (distance < best.distance)
        best = { x: px, z: pz, distance, name: r.name || "Seattle", heading: Math.atan2(dx, dz) };
    }
  return best;
}
export class SeattleMap {
  constructor(data, controllers, onTeleport) {
    this.data = data;
    this.controllers = controllers;
    this.onTeleport = onTeleport;
    this.query = "";
    this.dialog = document.getElementById("atlas");
    this.radar = document.getElementById("radar");
    this.canvas = document.getElementById("atlas-map");
    this.mapView = {
      x: -100,
      z: -100,
      scale: Math.min(this.canvas.width / 4700, this.canvas.height / 5400),
    };
    document.getElementById("map-search").addEventListener("input", (e) => {
      this.query = e.target.value.trim().toLowerCase();
      this.draw();
      const hits = [...DESTINATIONS, ...data.roads].filter((d) =>
        d.name.toLowerCase().includes(this.query),
      );
      document.getElementById("map-status").textContent = this.query
        ? `${hits.length} matching places and street segments`
        : "Click a street or landmark to travel there.";
    });
    this.canvas.addEventListener("click", (e) => {
      const r = this.canvas.getBoundingClientRect(),
        v = this.mapView;
      const x =
        (((e.clientX - r.left) / r.width) * this.canvas.width - this.canvas.width / 2) / v.scale +
        v.x;
      const z =
        (((e.clientY - r.top) / r.height) * this.canvas.height - this.canvas.height / 2) / v.scale +
        v.z;
      const landmark = DESTINATIONS.find((d) => Math.hypot(d.x - x, d.z - z) < 90);
      const p = landmark ? landmark.arrival : nearestRoad(this.data, x, z);
      this.onTeleport(p.x, p.z, p.heading);
      this.dialog.close();
    });
  }
  open() {
    this.controllers.resetInput();
    this.dialog.showModal();
    this.draw();
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
    c.fillRect(-100, BOUNDS.minZ, 1250, 590);
    c.fillStyle = "#354a44";
    for (const p of this.data.parks) {
      c.beginPath();
      p.ring.forEach(([x, z], i) => (i ? c.lineTo(x, z) : c.moveTo(x, z)));
      c.closePath();
      c.fill();
    }
    for (const r of this.data.roads) {
      const match = this.query && r.name.toLowerCase().includes(this.query);
      c.strokeStyle = match ? "#e6d393" : "#607573";
      c.lineWidth = match ? 9 : Math.max(r.width, 1.4 / s);
      c.beginPath();
      r.points.forEach(([x, z], i) => (i ? c.lineTo(x, z) : c.moveTo(x, z)));
      c.stroke();
    }
    c.fillStyle = "#3d5353";
    for (const b of this.data.buildings) {
      c.beginPath();
      b.ring.forEach(([x, z], i) => (i ? c.lineTo(x, z) : c.moveTo(x, z)));
      c.closePath();
      c.fill();
    }
    for (const d of DESTINATIONS) {
      const match = !this.query || d.name.toLowerCase().includes(this.query);
      c.fillStyle = match ? "#b9edac" : "#77918a";
      c.beginPath();
      c.arc(d.x, d.z, labels ? 6 / s : 3 / s, 0, Math.PI * 2);
      c.fill();
      if (labels) {
        c.font = `${16 / s}px sans-serif`;
        c.fillText(d.name, d.x + 10 / s, d.z - 7 / s);
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
