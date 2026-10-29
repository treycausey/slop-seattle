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
  [
    "twelve",
    "stadium",
    "A flagpole is waiting…",
    "Raise the 12",
    "The loudest extra player has arrived.",
  ],
  [
    "spiral",
    "stadium",
    "Who ordered a deep ball?",
    "Perfect spiral",
    "An extremely optimistic pass over SoDo.",
  ],
  [
    "hawk",
    "stadium",
    "Something has home-field advantage…",
    "Hawk patrol",
    "The stadium has its own air defense.",
  ],
  [
    "quake",
    "stadium",
    "The crowd is getting restless…",
    "Tiny Beast Quake",
    "A little seismic enthusiasm from the 12s.",
  ],
  [
    "guitar",
    "needle",
    "A feedback loop near the museum…",
    "Seattle sound",
    "A guitar and amp stack take the stage. Quietly.",
  ],
  [
    "flannel",
    "gasworks",
    "Is that shirt levitating?",
    "Forecast: flannel",
    "The official layer for every Seattle season.",
  ],
  [
    "vinyl",
    "phinney",
    "Something underground is spinning…",
    "Subterranean pop",
    "A tiny independent record has a very big B-side.",
  ],
  [
    "spoons",
    "market",
    "Cutlery with a rhythm section…",
    "Spoon solo",
    "Two spoons have formed a Seattle supergroup.",
  ],
  [
    "toe",
    "greenwood",
    "A suspiciously literal tow truck…",
    "Toe service",
    "Seattle's Toe Truck is taking a neighborhood detour.",
  ],
  [
    "elephant",
    "spheres",
    "A pink trunk in the skyline…",
    "Wash day",
    "A little pink elephant remembers the old car wash.",
  ],
  [
    "geoduck",
    "locks",
    "The clam is taller than expected…",
    "Gooey duck",
    "Puget Sound's least aerodynamic clam says hello.",
  ],
  [
    "slug",
    "gardens",
    "The slow lane is glowing yellow…",
    "Banana commute",
    "A banana slug has almost reached its stop.",
  ],
  [
    "pinball",
    "greenwood",
    "One more quarter?",
    "Multiball in the neighborhood",
    "A tiny arcade has very generous tilt settings.",
  ],
  [
    "interurban",
    "rocket",
    "Still waiting for that train?",
    "Next interurban: eventually",
    "Even the luggage has grown impatient in Fremont.",
  ],
  [
    "boots",
    "shepherd",
    "Cowboy gear on a field trip…",
    "Hat 'n' Boots holiday",
    "Georgetown's giants sent their smaller cousins north.",
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
    nearby(p) {
      const nearby = [];
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
            if (d < 240) nearby.push({ s, d });
          }
      return nearby.sort((a, b) => a.d - b.d).map((n) => n.s);
    },
    nearest(p) {
      return this.nearby(p)[0] ?? null;
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
