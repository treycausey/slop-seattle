// Arcade formation flight, in metres/seconds. No aircraft-simulation claim.
export const BLUE_OFFSETS = [
  [0, 0, 0],
  [-18, -1, -25],
  [18, -1, -25],
  [0, -2, -50],
];
export function stepBlueFlight(e, keys, dt, bounds, floor) {
  dt = Math.max(0, Math.min(0.05, dt));
  const turn = Number(keys.right) - Number(keys.left),
    climb = Number(keys.up) - Number(keys.down);
  e.speed = Math.max(
    65,
    Math.min(
      180,
      e.speed + (Number(keys.forward) - Number(keys.backward)) * 45 * dt,
    ),
  );
  e.heading += turn * 0.65 * dt;
  e.bank += (-turn * 0.55 - e.bank) * (1 - Math.exp(-dt * 5));
  e.pitch += (climb * 0.28 - e.pitch) * (1 - Math.exp(-dt * 4));
  e.position.x += Math.sin(e.heading) * e.speed * dt;
  e.position.z += Math.cos(e.heading) * e.speed * dt;
  e.position.y = Math.max(
    floor,
    Math.min(1800, e.position.y + climb * 65 * dt),
  );
  const margin = 3500;
  const x = Math.max(
    bounds.minX - margin,
    Math.min(bounds.maxX + margin, e.position.x),
  );
  const z = Math.max(
    bounds.minZ - margin,
    Math.min(bounds.maxZ + margin, e.position.z),
  );
  if (x !== e.position.x || z !== e.position.z) {
    e.position.x = x;
    e.position.z = z;
    e.heading = Math.atan2(
      (bounds.minX + bounds.maxX) / 2 - x,
      (bounds.minZ + bounds.maxZ) / 2 - z,
    );
  }
}
export class BlueSmokeHistory {
  constructor() {
    this.capacity = 64;
    this.positions = new Float32Array(64 * 4 * 3);
    this.clear();
  }
  clear() {
    this.head = 0;
    this.count = 0;
  }
  record(positions) {
    this.positions.set(positions, this.head * 12);
    this.head = (this.head + 1) % 64;
    this.count = Math.min(64, this.count + 1);
  }
  index(age, jet) {
    return (((this.head - 1 - age + 64) % 64) * 4 + jet) * 3;
  }
}
