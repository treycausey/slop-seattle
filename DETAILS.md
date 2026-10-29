# Nearby procedural detail

This layer adds benches with slats and feet, planters, layered street/park trees, street lamps, cycle stands, litter bins, curbside cars, footprint-following parapets, entrance canopies, and rooftop vents/ducts/fins. Landmark additions include observation-deck railings, Market produce, pier rails, Smith Tower pilasters, and goalposts. Water has filtered moving crest flecks. Everything is code/shader geometry using existing materials; no image/model downloads or extra generated textures.

## Integration contract

```js
import { createSeattleDetails } from "./seattle-details.js";
const details = createSeattleDetails(cityGroup, palette, data);
// After first rendered frame, each animation frame:
details.update(camera.position);
// Each geography revision; arrays may have been replaced on the same object:
details.setData(data);
// Diagnostics / teardown:
details.stats();
details.dispose();
```

`setData` releases references to the old spatial index and clears visible counts immediately. It retains the bounded GPU pool. `dispose` is idempotent and frees meshes, shared geometry, source references and index. Caller retains ownership of shared palette materials. There are no fixed geographic bounds or assumptions about destination count; `heightAt` comes from the current geography config.

Construction/indexing waits for the first update. A 3×3 neighborhood of 160 m tiles is sorted nearest first; at most one tile is built per update. Teleport retires old counts immediately. Crossing a tile boundary recycles slots, and a stationary camera performs no planning or matrix writes. Detail is hidden above 450 m relative to terrain. Base architecture remains visible at all distances. These are decorative objects, without new movement collisions.

The permanent limits are 9 slots × 6 material bins × 256 instances: **884,736 bytes of instance matrices**, plus two small shared geometries. At most 54 extra mesh objects. No shadows cast by this small detail; it receives existing lighting/shadows. The spatial index contains references to currently supplied geography only. The north loader must call `setData` on revision to retire evicted regions.

## Local evidence — 2026-10-29

`bun run test`: **212 passed**. Payload suite unchanged: **28,465 bytes gzip** for all Seattle-specific JS including production integration versus 23,086 before this pass (+5,379), below the existing 28 KiB limit. Geographic data is unchanged by this branch. This is source gzip size, not total HTTP/page weight.

The API was first tested in isolation by injecting integration into browser responses. The production city/entry now supplies that integration directly, with detail updates after first ready. The browser benchmark exposes the real objects for measurement, and can disable detail for a baseline. It exercises the actual Places and Walk/first-person paths, 24 destination teleports, repeated data replacement, empty data, and double disposal. The north expansion will wire the same API into its region streamer separately.

Run:

```sh
bun run tests/seattle-details.e2e.ts
E2E_BACKEND=webgl bun run tests/seattle-details.e2e.ts
DETAIL_BASELINE=1 bun run tests/seattle-details.e2e.ts
```

The baseline disables this layer while retaining the same landmark/material additions. Browser screenshots and JSON measurements are written under ignored `tmp/detail-*`.

| Measurement | Layer disabled | Layer enabled, WebGPU |
| --- | ---: | ---: |
| Ready / initial compile (one observed run) | 907 / 382 ms | 916 / 380 ms |
| Settled frame median / p95 | 16.7 / 16.7 ms | 16.7 / 16.8 ms |
| 24 teleports, maximum observed frame interval | 150 ms | 150 ms |
| Renderer reported GPU bytes after warm tour | 215,966,078 | 216,997,402 |
| JS heap after GC, final view | 89,368,164 | 95,430,500 |
| Scene mesh objects / triangles, final view | 367 / 390,330 | 421 / 429,408 |

The measured overhead is about **0.98 MiB reported GPU memory** and **5.8 MiB JS heap** in these runs. GPU counters stayed identical across the three warm tours on both backends; heap growth between later tours was tens of KiB, rather than per-tile retained geometry. The layer generated 2,801–3,241 visible instances in the sampled neighborhoods. WebGPU first indexing/construction reached 13.6 ms; subsequent sampled tile builds were around 0.3–0.4 ms. Data-revision/disposal tests prove buffer reuse and that empty input releases visible detail; they do not establish physical-device memory limits.

Matched sequential WebGL runs: 817 ms ready / 329 ms compile disabled, 743 ms ready / 313 ms compile enabled. Both settled frame p95 values were 16.7 ms, and both transition maximum intervals were 216.7 ms. The enabled scene reported 64,887,690 GPU bytes versus 63,965,636 disabled (+0.88 MiB); final heaps were 34,960,732 and 33,739,896 (+1.16 MiB). First detail construction/indexing reached 10.5 ms. One earlier WebGL run made concurrently with other browser work had a 2.65 s stall and 3.37 s startup; it is retained in the raw logs and was not used as a matched performance comparison.

Browser measurements are local Chrome on this Mac, with a warm engine/CDN cache and occasional screenshot/GC work in transition intervals. They are not cold-network timings or physical iPhone/Safari evidence. Initial reveals, mode switching and screenshot work can stall; settled 60 Hz sampling does not prove every transition is smooth. Full scene memory includes inherited environment, shadows, players, and engine resources, far beyond this detail pool. No claim is made that the whole app uses less than 1 MiB.
