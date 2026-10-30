# Smaller downloads and higher visual quality

Research completed 2026-10-30 against Seattle `6b76ab4` and upstream `e35c06c0d`. The measurements below describe the original investigation and its prototypes. The authorized implementation and release evidence are recorded in [QUALITY_PASS.md](QUALITY_PASS.md).

Implementation is tracked in [issue #5](https://github.com/treycausey/slop-seattle/issues/5).

## Measured opportunities

| Component | Current | Prototype | Reduction | Evidence |
| --- | ---: | ---: | ---: | --- |
| Three.js engine, three build modules | 618,652 B | 320,731 B | 48.2% | Actual compressed browser response bodies, cache disabled, same pinned commit |
| Engine decoded source | 3,878,288 B | 1,286,527 B | 66.8% | Same browser resource entries |
| 87 north footprint regions | 4,870,305 B | 2,848,622 B | 41.5% | gzip level 9 on both formats; exact decoded equality |
| Downtown geographic data | 430,227 B | 246,734 B | 42.7% | Matched gzip comparison; exact decoded equality |
| All geographic datasets including atlas/overview | 5,587,712 B | 3,273,157 B | 41.4% | 90 datasets round-trip without changing fields or numbers |

These are component measurements, not a total page-size or FPS claim. North regions load on demand; a visitor does not fetch the whole geographic dataset. The downtown comparison uses gzip for both formats, rather than equating a local uncompressed server with public transfer. Reconstituting the same JavaScript objects does not imply a 42% retained-memory reduction.

### Engine: use one coherent minified module graph

The current pin already has minified WebGPU, TSL and core builds. Browser prototypes used the exact existing commit, no engine upgrade. The native browser reported the same initial 99,894,304 GPU bytes with both graphs. Market and Gas Works travel, golden/night lighting and Photo entry/exit worked without console or page errors. The same minified graph also passed those paths on forced WebGL.

Changing only the bare import aliases fails: add-ons import the original build URLs relatively, creating two TSL runtimes and `No stack defined for assign operation` errors. The successful prototype maps all three absolute original build URLs to their minified equivalents as well as the bare aliases. All three engine requests must use one graph. A production change must update the boot-failure test's intercepted engine URL and exercise lazy Blue Angels, discovery, eruption and avatar paths too.

Cold engine bodies fell by 297,921 bytes. One startup observation was 1,294 → 1,236 ms, but this is not a repeated timing benchmark and does not establish a startup speedup.

### Geographic data: lossless delta streams

[Upstream's binary footprint loader](https://github.com/mrdoob/slop-newyork/blob/e35c06c0d/js/building-geodata.js) separates metadata and delta-coded X/Z coordinates. A Seattle-specific offline prototype applies that principle without changing the existing geometry: structured metadata, a string dictionary, separate zigzag-varint coordinate streams, then gzip. Decimal coordinates retain their existing precision; other numbers have an exact fallback. Every field, courtyard hole, road and park remains present.

All 90 current datasets passed deep equality after encode → gzip → inflate → decode. This tests the format's potential, not a production loader. Shipping needs a browser-native bounded decoder with validated headers/counts/lengths, truncation rejection, versioning, gzip/already-inflated handling, download retry, build-tool integration and manifest updates. Retain the four-region/one-job bounds. Measure decode time, transient allocation and responsive travel; do not infer those from compressed size.

## Where appearance can improve most

The inspected Seattle captures show recognizable authored landmarks surrounded by repetitive flat facades, sparse park planting, broad empty ground surfaces and water with limited surface structure. The best next pass changes those systems, rather than adding more destinations.

| Priority | Source | Adaptation for Seattle | Cost control |
| --- | --- | --- | --- |
| 1 | [Upstream storefronts](https://github.com/mrdoob/slop-newyork/commit/8d88e41c2), [entrances](https://github.com/mrdoob/slop-newyork/commit/26bb9fef1), [party walls](https://github.com/mrdoob/slop-newyork/commit/819a0adb3) | Per-wall facade coordinates, whole window bays, frontage-aware shops, recessed doors, opaque shared walls and generated signs. Distinguish housing from downtown offices. | Seattle currently uses world-coordinate facade patterns. Add wall semantics to generated buffers, preserve material batching, evaluate interiors only nearby, share one generated sign atlas. Avoid importing Manhattan street labels. |
| 2 | [Donostia water](https://github.com/ginocingolani/slop-donostia/blob/0f367cbd9/js/donostia/water.js) | Multiscale directional wave slopes and filtered distant roughness; calmer Lake Union and sheltered water. | Its FFT wave generator already exists in our inherited `tsl-materials.js` but Seattle uses a simpler material. Extract/reuse it, without Manhattan reflection geography or Donostia's downloaded bathymetry. Profile the extra shader work and generated texture. |
| 3 | [Taipei park groves](https://github.com/hebe13579/slop-taipei/commit/f09362961), [Singapore trees](https://github.com/zz85/slop-singapore/commit/15a4fadef) | Seeded groves, varied tree silhouettes and canopy sizes, stronger evergreen/deciduous distinction. | Populate surveyed parks with bounded instances and shared geometry. Respect paths, water and landmark sightlines; use explicit distance LOD and measure triangles before adding density. |
| 4 | [Donostia camera treatment](https://github.com/ginocingolani/slop-donostia/commit/f3c5841f7) | Restrained highlight handling and per-preset lighting calibration. | A standalone AgX/exposure swap looked flatter in matched Seattle views and is not recommended as-is. Donostia's full treatment includes grading and half-resolution bloom; those add render work/targets and must earn their cost. |

The wave generator's existing presence is a source-size opportunity, not free GPU quality: a 256² RGBA half-float generated texture plus mips is roughly 0.67 MiB before renderer overhead, and generation uses temporary FFT arrays. Make ownership/disposal explicit. No downloaded artwork is required.

## Fork review scope and exclusions

GitHub returned 143 direct-fork records during the survey; the parent counter reported 144. Screened recent eight-commit histories for 75 recent, renamed or starred forks, then compared against the parent's complete 147-commit history. Nineteen screened heads had non-upstream commits. This is not an exhaustive code audit of every branch or descendant fork.

Inspected relevant source/changes from the parent, Donostia, both Taipei forks, Singapore, Tepic and Hong Kong; also screened Bangkok, Barcelona, Toronto, Utrecht, Kazan and the other changed histories. Most transferable contributions are techniques, not drop-in commits: the deeper forks have diverged substantially.

- [Taipei's memory fix](https://github.com/sc0Vu/slop-taipei/commit/f22b6fdf0) releases pre-merge geometry retained through closures and delays hidden stand-ins. Seattle already disposes merged pieces and streams detailed sites, so its reported memory halving is not a Seattle forecast.
- [Singapore's adaptive tree detail](https://github.com/zz85/slop-singapore/commit/c2c6ebe58) uses sustained frame-rate thresholds and long cooldowns. Useful for new vegetation density, but do not reduce render resolution or landmark detail just to claim better performance.
- [Upstream fire-escape optimization](https://github.com/mrdoob/slop-newyork/commit/ab33d1b95) and [coarse lamp shadows](https://github.com/mrdoob/slop-newyork/commit/063011405) reinforce batching, distance culling and cheap shadow proxies. Seattle already implements related strategies; identify remaining measured costs before porting.
- [Hong Kong](https://github.com/keithligh/slop-hongkong#license-and-data) uses photographed atlases and downloaded government meshes. Its fidelity is not evidence of a smaller fully procedural solution.
- [Tepic](https://github.com/the-self/slop-tepic) has interesting procedural interiors and local greenery, but copying its broad gameplay/server architecture would expand scope and dependencies. Extract small rendering ideas only.
- Repo storage sizes include history and are not download measurements. Fork screenshots and their authors' performance reports were treated as leads, not reproduced Seattle benchmarks.

## Suggested implementation sequence and acceptance

1. Ship the coherent minified engine graph first. Require one TSL/core/WebGPU instance, keyboard/touch/lazy feature coverage on both backends, engine outage/retry, original NYC compatibility and public response-byte verification.
2. Ship compact geographic data separately. Require exact field equality for all 90 datasets, malformed-input regressions, bounded decoding, travel failure/retry/revisit and matched download/decode/heap measurements.
3. Build one substantial visual pass around per-wall facades, street fronts, park vegetation and water. Compare identical walking and elevated compositions at Market, Ballard, Greenwood and Gas Works, all lighting presets and desktop/mobile. Inspect the actual images; a tone-map change alone does not meet the quality goal. Keep at most two visual review rounds per surface and preserve all 95 Places/31 discoveries.

For the visual pass, require no downloaded art or models, no unbounded queues/caches, existing streaming caps, no material-per-building explosion and explicit GPU texture/geometry accounting. Track source gzip, actual served bytes, decode/build latency, retained heap and frame cost separately.

Local evidence is under ignored `tmp/`: `codex-fork-heads-verified.json`, `codex-codec-probe.{mjs,json}`, `codex-survey-browser.ts`, `codex-survey-browser.json`, the WebGL report and `codex-survey-*.png`. Browser prototypes used Kit's isolated server/Chrome helpers and restored/closed all sessions. No production source was edited for the experiments.
