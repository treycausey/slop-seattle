import * as THREE from "three/webgpu";
import { buildSeattleRegion } from "./seattle-city.js";
import {
  wantedRegions,
  combineRegions,
  REGION_LIMIT,
} from "./seattle-stream-plan.js";
import { heightAt } from "./seattle-config.js";
import { readSeattleResponse } from './seattle-codec.js';

export async function compressedJSON(file, signal) {
  const response = await fetch(
    new URL(`./seattle-north/${file}`, import.meta.url),
    { signal: signal ?? AbortSignal.timeout(15000) },
  );
  if (!response.ok)
    throw new Error(
      `Neighborhood data could not load (${response.status}). Choose the place again to retry.`,
    );
  return readSeattleResponse(response);
}
// One decoded/building job in flight, four resident regions, no unbounded data or GPU cache.
export function createSeattleStream(city, data, onChange, onStatus, prepare=async()=>{}) {
  const core = {
      buildings: data.buildings,
      roads: data.roads,
      parks: data.parks,
    },
    coreColliders = city.colliders;
  const regions = new Map();
  let manifest,
    overview,
    overviewRows,
    atlas,
    desired = [],
    busy = false,
    lastKey = "",
    generation = 0,
    totalFetched = 0,
    lastBuildMs = 0,
    maxBuildMs = 0,
    error = null;
  let manifestPromise;
  const getManifest = () =>
    (manifestPromise ??= fetch(
      new URL("./seattle-north/manifest.json", import.meta.url),
      { signal: AbortSignal.timeout(15000) },
    )
      .then((r) => {
        if (!r.ok)
          throw new Error(`Neighborhood index unavailable (${r.status})`);
        return r.json();
      })
      .then((m) => (manifest = m))
      .catch((e) => {
        manifestPromise = null;
        throw e;
      }));
  const publish = () => {
    Object.assign(data, combineRegions(core, regions.values()));
    data.revision = (data.revision ?? 0) + 1;
    city.colliders = [...coreColliders, ...data.colliders];
    delete data.colliders;
    city.details.setData(data);
    onChange(city.colliders);
    if (overview) {
      const dummy = new THREE.Object3D();
      overviewRows.forEach(([x, z, h, w], i) => {
        const loaded = [...regions.values()].some(
          (r) =>
            x >= r.tile.x &&
            x < r.tile.x + 1000 &&
            z >= r.tile.z &&
            z < r.tile.z + 1000,
        );
        dummy.position.set(x, heightAt(x, z) + h / 2, z);
        dummy.scale.set(loaded ? 0 : w, loaded ? 0 : h, loaded ? 0 : w);
        dummy.updateMatrix();
        overview.setMatrixAt(i, dummy.matrix);
      });
      overview.instanceMatrix.needsUpdate = true;
    }
  };
  async function pump() {
    if (busy) return;
    busy = true;
    try {
      for (;;) {
        const tile = desired.find((t) => !regions.has(t.id));
        if (!tile) break;
        // Evict before decoding the replacement; peak residency remains bounded too.
        for (const [id, r] of regions)
          if (!desired.some((t) => t.id === id)) {
            r.city.dispose();
            regions.delete(id);
          }
        if (regions.size >= REGION_LIMIT) {
          const [id, r] = regions.entries().next().value;
          r.city.dispose();
          regions.delete(id);
        }
        const version = generation,
          chunk = await compressedJSON(`${tile.id}.bin.gz`);
        totalFetched += tile.bytes;
        if (version !== generation && !desired.some((t) => t.id === tile.id))
          continue;
        chunk.bounds = {
          minX: tile.x,
          maxX: tile.x + 1000,
          minZ: tile.z,
          maxZ: tile.z + 1000,
        };
        // Let an input/render frame run between network decode and geometry construction.
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!desired.some((t) => t.id === tile.id)) continue;
        const started = performance.now(),
          part = await buildSeattleRegion(city.group, chunk, {
            chunk: true,
            palette: city.palette,
            styles: city.styles,
            distantStyles: city.distantStyles,
            footprintStyles:city.footprintStyles,
            footprintDistant:city.footprintDistant,
            shadowBatch:city.shadowBatch,
          });
        lastBuildMs = Math.round(performance.now() - started);
        maxBuildMs = Math.max(maxBuildMs, lastBuildMs);
        // Shader preparation must finish before newly streamed geometry reaches the render loop.
        part.group.removeFromParent();
        try { await prepare(part.group); }
        catch(e){part.dispose();throw e;}
        if (!desired.some((t) => t.id === tile.id)) {
          part.dispose();
          continue;
        }
        city.group.add(part.group);
        regions.set(tile.id, { tile, data: chunk, city: part });
        publish();
        error = null;
      }
    } catch (e) {
      error = e.message;
      onStatus(error);
    } finally {
      busy = false;
    }
  }
  async function ensure(x, z) {
    await getManifest();
    desired = wantedRegions(manifest, x, z);
    generation++;
    error = null;
    lastKey = desired.map((t) => t.id).join(",");
    for (const [id, r] of regions)
      if (!desired.some((t) => t.id === id)) {
        r.city.dispose();
        regions.delete(id);
      }
    publish();
    // A running request may finish for a prior position; pump reevaluates desired each time.
    await pump();
    while (busy) await new Promise((resolve) => requestAnimationFrame(resolve));
    if (desired.some((t) => !regions.has(t.id))) {
      if (error) throw new Error(error);
      await pump();
    }
    if (error) throw new Error(error);
  }
  return {
    ensure,
    update(position) {
      for(const r of regions.values())r.city.update(0,position);
      if (!manifest) {
        if (position.z < -1900 || position.x < -2000)
          getManifest().catch((e) => onStatus(e.message));
        return;
      }
      const next = wantedRegions(manifest, position.x, position.z),
        key = next.map((t) => t.id).join(",");
      if (key === lastKey) return;
      lastKey = key;
      desired = next;
      generation++;
      for (const [id, r] of regions)
        if (!desired.some((t) => t.id === id)) {
          r.city.dispose();
          regions.delete(id);
          publish();
        }
      void pump();
    },
    async loadOverview() {
      await getManifest();
      overviewRows = await compressedJSON("overview.bin.gz");
      overview = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        city.distantStyles[3],
        overviewRows.length,
      );
      overview.name = "Distant north Seattle blocks";
      overview.castShadow = false;
      city.group.add(overview);
      publish();
    },
    async atlas() {
      return (atlas ??= compressedJSON("atlas.bin.gz").catch((e) => {
        atlas = null;
        throw e;
      }));
    },
    stats: () => ({
      resident: regions.size,
      limit: REGION_LIMIT,
      tiles: [...regions.keys()],
      busy,
      error,
      totalFetched,
      lastBuildMs,
      maxBuildMs,
      buildings: [...regions.values()].reduce(
        (s, r) => s + r.city.buildingCount,
        0,
      ),
      overviewBlocks: overviewRows?.length ?? 0,
      revision: data.revision ?? 0,
    }),
  };
}
