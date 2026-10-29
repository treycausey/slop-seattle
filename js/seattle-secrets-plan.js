import { DESTINATIONS } from "./seattle-config.js";
export const SECRET_LIMIT = 3,
  SECRET_DURATION = 6,
  SECRET_COOLDOWN = 8;
const rows = [
  [
    "troll",
    "troll",
    "A silver eye is watching…",
    "The Troll is awake",
    "It would like its car back.",
  ],
  [
    "rocket",
    "rocket",
    "Is that a launch button?",
    "Fremont, we have liftoff",
    "The center of the universe has a space program.",
  ],
  [
    "fish",
    "market",
    "Catch of the day?",
    "Flying fish",
    "The delivery service here is very direct.",
  ],
  [
    "ufo",
    "needle",
    "Something above the saucer…",
    "Unscheduled observation deck",
    "Visitors from slightly farther out of town.",
  ],
  [
    "orca",
    "lake",
    "Watch the water…",
    "A very large commuter",
    "No ferry ticket required.",
  ],
  [
    "duck",
    "greenlake",
    "That buoy looks suspicious…",
    "Big duck energy",
    "Green Lake has appointed a new lifeguard.",
  ],
  [
    "submarine",
    "locks",
    "A periscope at the Locks?",
    "Below deck",
    "The quietest boat in Ballard.",
  ],
  [
    "sasquatch",
    "phinney",
    "Something in the evergreens…",
    "Local resident",
    "Bigfoot also enjoys a good neighborhood walk.",
  ],
  [
    "garden",
    "spheres",
    "A tiny garden has plans…",
    "Rooftop spring",
    "A little extra green for the Emerald City.",
  ],
  [
    "coffee",
    "greenwood",
    "One more cup?",
    "Highly caffeinated",
    "Seattle runs on a suspiciously large espresso.",
  ],
  [
    "octopus",
    "wheel",
    "Eight arms, one pier…",
    "Pier pressure",
    "The waterfront maintenance crew has arrived.",
  ],
  [
    "hats",
    "smith",
    "A tower needs a hat…",
    "Formal Seattle",
    "Smith Tower has dressed for the occasion.",
  ],
  [
    "fireflies",
    "gardens",
    "A glimmer by the beach…",
    "Golden hour, literally",
    "A small constellation stopped for the sunset.",
  ],
  [
    "cloud",
    "rainier",
    "The mountain is making a hat…",
    "The mountain is out",
    "A lenticular cloud has excellent taste in scenery.",
  ],
  [
    "sheep",
    "shepherd",
    "A quiet meeting on the lawn…",
    "The good shepherds",
    "The neighborhood committee has reached a baa-nanimous decision.",
  ],
];
export const SECRETS = rows.map(([id, place, clue, title, message]) => {
  const d = DESTINATIONS.find((d) => d.id === place);
  return { id, place, clue, title, message, x: d.x, z: d.z };
});
export function restoreDiscoveries(raw) {
  try {
    const a = JSON.parse(raw);
    return new Set(
      Array.isArray(a)
        ? a.filter((id) => SECRETS.some((s) => s.id === id))
        : [],
    );
  } catch {
    return new Set();
  }
}
export function createSecretState(raw) {
  const found = restoreDiscoveries(raw),
    last = new Map(),
    cells = new Map();
  for (const s of SECRETS) {
    const key = `${Math.floor(s.x / 256)}:${Math.floor(s.z / 256)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(s);
  }
  return {
    found,
    nearest(p) {
      let best = null,
        distance = 240;
      for (
        let x = Math.floor(p.x / 256) - 1;
        x <= Math.floor(p.x / 256) + 1;
        x++
      )
        for (
          let z = Math.floor(p.z / 256) - 1;
          z <= Math.floor(p.z / 256) + 1;
          z++
        )
          for (const s of cells.get(`${x}:${z}`) ?? []) {
            const d = Math.hypot(s.x - p.x, s.z - p.z);
            if (d < distance) {
              best = s;
              distance = d;
            }
          }
      return best;
    },
    remaining(id, t) {
      return Math.max(0, SECRET_COOLDOWN - (t - (last.get(id) ?? -Infinity)));
    },
    trigger(s, t) {
      if (!s || this.remaining(s.id, t) > 0) return false;
      last.set(s.id, t);
      found.add(s.id);
      return true;
    },
    serialize: () => JSON.stringify([...found].sort()),
  };
}
