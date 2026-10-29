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

// Nine CPU tile slots feed six packed GPU draws, instead of a draw for every tile/material pair.
// Packing only happens on tile/data changes; camera travel never grows buffers or scene objects.
export function createSeattleDetails(parent, palette, data) {
  const group = new THREE.Group();
  group.name = "Nearby Seattle detail";
  parent.add(group);
  const slots = [],
    meshes = new Map(),
    dummy = new THREE.Object3D();
  let grid,
    geometry,
    foliage,
    disposed = false,
    focus = null,
    pending = [],
    builds = 0,
    lastMs = 0,
    maxMs = 0;
  const allocate = () => {
    geometry = new THREE.BoxGeometry(1, 1, 1);
    foliage = new THREE.ConeGeometry(0.5, 1, 7);
    for (const kind of DETAIL_KINDS) {
      const m = new THREE.InstancedMesh(
        kind === "leaf" ? foliage : geometry,
        palette[kind],
        PART_LIMIT * TILE_LIMIT,
      );
      m.count = 0;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.castShadow = false;
      m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      group.add(m);
      meshes.set(kind, m);
    }
  };
  const pack = () => {
    if (!meshes.size) allocate();
    for (const kind of DETAIL_KINDS) {
      const m = meshes.get(kind);
      let i = 0;
      for (const slot of slots)
        if (slot.key !== null)
          for (const [x, y, z, w, h, d, yaw] of slot.parts[kind]) {
            dummy.position.set(x, y, z);
            dummy.scale.set(w, h, d);
            dummy.rotation.set(0, yaw, 0);
            dummy.updateMatrix();
            m.setMatrixAt(i++, dummy.matrix);
          }
      m.count = i;
      m.instanceMatrix.clearUpdateRanges();
      m.instanceMatrix.addUpdateRange(0, i * 16);
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
  };
  return {
    setData(next) {
      if (disposed) return;
      data = next;
      grid?.clear();
      grid = undefined;
      focus = null;
      slots.length = 0;
      pending = [];
      for (const m of meshes.values()) m.count = 0;
    },
    update(position) {
      if (disposed) return;
      group.visible = position.y - heightAt(position.x, position.z) < 450;
      if (!group.visible) return;
      const key = tileKey(Math.floor(position.x / TILE_SIZE), Math.floor(position.z / TILE_SIZE));
      let dirty = false;
      if (focus !== key) {
        focus = key;
        const wanted = nearbyTiles(position.x, position.z),
          keys = new Set(wanted.map(([x, z]) => tileKey(x, z)));
        for (const s of slots)
          if (!keys.has(s.key)) {
            s.key = null;
            s.parts = null;
            dirty = true;
          }
        pending = wanted.filter(([x, z]) => !slots.some((s) => s.key === tileKey(x, z)));
      }
      const next = pending.shift();
      if (!next) {
        if (dirty) pack();
        return;
      }
      const start = performance.now();
      grid ??= detailIndex(data);
      let slot = slots.find((s) => s.key === null);
      if (!slot && slots.length < TILE_LIMIT) {
        slot = { key: null, parts: null };
        slots.push(slot);
      }
      if (!slot) return;
      slot.parts = planDetailTile(grid, ...next);
      slot.key = tileKey(...next);
      pack();
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
        instances: [...meshes.values()].reduce((n, m) => n + m.count, 0),
        instanceBytes: meshes.size * PART_LIMIT * TILE_LIMIT * 64,
        drawBatches: meshes.size,
        indexCells: grid?.size ?? 0,
        visible: group.visible,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      group.visible = false;
      for (const m of meshes.values()) m.dispose();
      meshes.clear();
      group.clear();
      geometry?.dispose();
      foliage?.dispose();
      slots.length = 0;
      grid?.clear();
      data = null;
      pending = [];
    },
  };
}
