import test from "node:test";
import assert from "node:assert/strict";
import { SeattleMap } from "../js/seattle-map.js";
test("stationary radar reuses its pixels and invalidates for motion, heading, geography, query and size", () => {
  const entity = { position: { x: 10, z: 20 }, heading: 0 },
    map = Object.create(SeattleMap.prototype);
  Object.assign(map, {
    data: { revision: 0 },
    controllers: { getActiveEntity: () => entity },
    radar: { width: 440, height: 350 },
    dialog: { open: false },
    query: "",
  });
  let draws = 0;
  map.drawMap = () => draws++;
  map.draw();
  map.draw();
  assert.equal(draws, 1);
  for (const change of [
    () => entity.position.x++,
    () => entity.position.z++,
    () => entity.heading++,
    () => map.data.revision++,
    () => (map.query = "pike"),
    () => map.radar.width++,
  ]) {
    change();
    const previous = draws;
    map.draw();
    assert.equal(draws, previous + 1);
    map.draw();
    assert.equal(draws, previous + 1);
  }
});
