import * as THREE from "three/webgpu";
import { heightAt } from "./seattle-config.js";
import {
  detailIndex,
  planDetailTile,
  nearbyTiles,
  tileKey,
  DETAIL_KINDS,
  PART_LIMIT,
  TILE_LIMIT,
  TILE_SIZE,
} from "./seattle-detail-plan.js";

// Fixed pool: camera travel never grows the number of GPU buffers or scene objects.
// Call only after the first rendered frame; base architecture remains available at all distances.
export function createSeattleDetails(parent, palette, data) {
  const group = new THREE.Group();
  group.name = "Nearby Seattle detail";
  parent.add(group);
  let grid,
    geometry,
    foliage,
    disposed = false,
    builds = 0,
    lastMs = 0,
    maxMs = 0,
    focus = null,
    pending = [];
  const slots = [],
    dummy = new THREE.Object3D();
  const allocate = () => {
    geometry ??= new THREE.BoxGeometry(1, 1, 1);
    foliage ??= new THREE.ConeGeometry(0.5, 1, 7);
    const meshes = Object.fromEntries(
      DETAIL_KINDS.map((kind) => {
        const m = new THREE.InstancedMesh(
          kind === "leaf" ? foliage : geometry,
          palette[kind],
          PART_LIMIT,
        );
        m.count = 0;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        m.castShadow = false;
        m.receiveShadow = true;
        group.add(m);
        return [kind, m];
      }),
    );
    const slot = { key: null, meshes };
    slots.push(slot);
    return slot;
  };
  return {
    setData(next) {
      if (disposed) return;
      data = next;
      grid?.clear();
      grid = undefined;
      focus = null;
      for (const s of slots) {
        s.key = null;
        for (const m of Object.values(s.meshes)) m.count = 0;
      }
    },
    update(position) {
      if (disposed) return;
      group.visible = position.y - heightAt(position.x, position.z) < 450;
      if (!group.visible) return;
      const key = tileKey(Math.floor(position.x / TILE_SIZE), Math.floor(position.z / TILE_SIZE));
      if (focus !== key) {
        focus = key;
        const wanted = nearbyTiles(position.x, position.z),
          keys = new Set(wanted.map(([x, z]) => tileKey(x, z)));
        // Retire old tiles immediately on teleport, before constructing the nearest new one.
        for (const s of slots)
          if (!keys.has(s.key)) {
            s.key = null;
            for (const m of Object.values(s.meshes)) m.count = 0;
          }
        pending = wanted.filter(([x, z]) => !slots.some((s) => s.key === tileKey(x, z)));
      }
      const next = pending.shift();
      if (!next) return;
      const start = performance.now();
      grid ??= detailIndex(data);
      const slot =
        slots.find((s) => s.key === null) ?? (slots.length < TILE_LIMIT ? allocate() : null);
      if (!slot) return;
      const parts = planDetailTile(grid, ...next);
      for (const kind of DETAIL_KINDS) {
        const m = slot.meshes[kind];
        parts[kind].forEach(([x, y, z, w, h, d, yaw], i) => {
          dummy.position.set(x, y, z);
          dummy.scale.set(w, h, d);
          dummy.rotation.set(0, yaw, 0);
          dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
        });
        m.count = parts[kind].length;
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
      }
      slot.key = tileKey(...next);
      builds++;
      lastMs = performance.now() - start;
      maxMs = Math.max(maxMs, lastMs);
    },
    stats() {
      return {
        tiles: slots.filter((s) => s.key !== null).length,
        capacityTiles: TILE_LIMIT,
        builds,
        lastBuildMs: lastMs,
        maxBuildMs: maxMs,
        instances: slots.reduce(
          (n, s) => n + Object.values(s.meshes).reduce((v, m) => v + m.count, 0),
          0,
        ),
        instanceBytes: slots.length * DETAIL_KINDS.length * PART_LIMIT * 16 * 4,
        indexCells: grid?.size ?? 0,
        visible: group.visible,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      for (const s of slots) for (const m of Object.values(s.meshes)) m.dispose();
      group.clear();
      group.visible = false;
      geometry?.dispose();
      foliage?.dispose();
      slots.length = 0;
      grid?.clear();
      data = null;
      pending = [];
    },
  };
}
