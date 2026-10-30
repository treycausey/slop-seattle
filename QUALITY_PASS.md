# Issue 5 — compact procedural quality pass

Authorized: implement all of [issue 5](https://github.com/treycausey/slop-seattle/issues/5), go big on fully procedural visual quality, preserve speed and ship after all gates pass. Baseline `5e6b2ba`; ignored comparison checkout `tmp/codex-issue5-baseline`.

| Gate | Required visible/saved result and recovery | Evidence | Status |
| --- | --- | --- | --- |
| Compact engine | One pinned minified core/TSL/WebGPU graph, no duplicate runtimes; offline boot retry; lazy features and NYC usable | Contract regression failed before/passes after; boot and four travel modes/lazy features on both backends; isolated real NYC contracts | Passed locally |
| Compact geography | All 90 datasets decode exactly, validated bounded format; failed fetch/decode preserves travel and permits retry | Content hashes and exact encode/decode equality; malformed-input tests; real browser gzip/already-inflated decoding; actual 503 and corrupt-byte travel recovery | Passed locally |
| Facades/streets | Per-wall windows, selective shops/doors/signs, house siding, party walls; shared batches; Market shelves and rusted Gas Works pipework/guards/ladders | Pure geometry/frontage tests; 64 matched compositions per backend across four places, four times, walking/place, desktop/mobile; no media requests | Passed locally |
| Parks | Varied groves/canopies, clear paths/water/landmarks, bounded shared-instance LOD | Determinism/hole/road/building/landmark tests; overlapping-core regression failed before/passes after; actual Gas Works captures and repeated GPU accounting | Passed locally |
| Water | Filtered multiscale generated waves, calmer elevated lakes/canals, no downloads; owned texture/disposal | Actual WebGPU/WebGL day/night views, nine-mip 256² generated spectrum, bounded repetition and measured frame costs | Passed locally |
| Full acceptance | 95 Places, 31 discoveries, Rainier/eruption, Troll, avatars, Blue Angels, saves, keyboard/touch and repeated visits | 254 permanent tests; app/north/secrets/Blue/avatar/eruption/landmarks/Photo/parks/boot/rendering suites on both backends; final changed-area checks pass | Passed locally |
| Delivery | Inspected diff, green checks, main pushed, Pages served version/bytes/controls verified | Runtime main `91cadde`, successful Pages run 41089775242; fresh public checks on both backends | Passed |

## Download and data evidence

- Engine build-module compressed bodies: 618,652 → 320,731 bytes (-48.2%); decoded source 3,878,288 → 1,286,527 bytes. Same pinned engine commit, all three original absolute build URLs remapped to prevent duplicate runtimes. The final public browser checks reproduce the 320,731-byte total on both backends.
- 87 region assets: 4,870,305 → 2,848,622 gzip bytes (-41.5%); maximum 122,877 → 70,376 bytes. Atlas 123,692 bytes; overview 54,109. All 90 datasets together: 5,587,712 → 3,273,157 gzip bytes (-41.4%). Downtown 430,227 → 246,734 matched gzip bytes (-42.7%). The previous publicly hosted downtown JSON body was 438,893 gzip bytes; host compression is separate from the matched level-9 comparison.
- All fields/coordinates and holes are preserved. The readable downtown source moved to `tools/data/seattle-core.json`; it retains its ODbL notice. Runtime data is SSP1; old generated JSON-gzip region assets were replaced, with the originals retained in Git history and the ignored baseline checkout.
- `bun run data:pack` and `bun run data:north` reproduce the binary assets. Direct binary generation initially preserved negative zero that JSON used to normalize; a failing canonical-zero regression exposed the 20-byte difference. Normalizing generated rounded zero restored the exact original datasets and 2,848,622-byte region total. The codec itself still preserves signed zero when explicitly supplied.
- Decoder caps: 4 MiB response body, 8 MiB inflated packed data, 500,000 nodes, 100,000 array entries and depth 64. Small compressed input chunks bound queued native expansion. Headers, lengths, finite numbers, references, duplicate keys, truncation and trailing bytes are validated. HTTP/decode failures keep the player in place and allow a successful retry.
- Browser core decode/inflate samples: JSON 14.0/9.2/9.0 ms; binary 11.6/15.6/9.4 ms. This is smaller transfer, not a decoder speedup claim. After 45 repeated core decodes with GC, isolated retained JS heap was 771,296/783,516/783,596 bytes. Corrupt gzip and already-inflated host responses are covered.
- Final 16-visit north tours, including HTTP and malformed-data recovery: native tracked GPU bytes 135,770,973 in both rounds; WebGL 79,700,565 in both rounds. GC heaps 97,973,344 → 98,325,068 native and 34,979,932 → 35,317,192 WebGL. No observed long task; full asynchronous region load/build elapsed ranges 66–186ms / 62–175ms, with construction spread across frames.
- The actual original New York entry boots, renders and switches all four modes without errors on native WebGPU. Its pre-existing Google Fonts hosts were explicitly allowed in that isolated compatibility harness; Seattle still requests no fonts, media or other services. The original isolated lawn/ground/water/runtime contracts also pass on both backends.

## Performance and limits

Matched six-view tour (`needle,market,columbia,greenwood,gasworks,locks`), 1440×1000, DPR 1, five batches ×120 real fixed steps per view, both backends, original resolution/antialiasing/shadow limits:

| Metric | Baseline | Quality pass | Meaning |
| --- | ---: | ---: | --- |
| Native mean batch/step | 0.9975 ms | 0.9843 ms | Essentially stable; not a universal FPS improvement |
| WebGL mean batch/step | 0.4549 ms | 0.4947 ms | +0.0399 ms / +8.8%; extra detail has a small measured cost |
| Cold startup median, 3 alternating contexts | 1257 ms | 1498 ms | +241 ms for richer construction/shader preparation; not a startup speedup |
| Initial retained JS heap, GC median | 72,473,388 B | 86,753,348 B | +14,279,960 B; more material graphs and geometry metadata |
| Initial tracked GPU allocation | 99,894,304 B | 107,376,051 B | +7,481,747 B; bounded quality cost, not less GPU memory |
| Local decoded resources | 2,397,201 B | 1,074,190 B | Local test server only; excludes external engine and is not hosted transfer |

The timer query diagnostic is the last query per render context, not a sum over every measured step. Batch timing explicitly waits for the GPU/GL completion at the end; neither metric is a physical-phone FPS measurement. Chrome touch emulation verifies input/layout, not physical device performance.

Footprint dimensions/seed attributes use half-float CPU arrays; positions retain existing full precision. The engine/backend can expand vertex formats, so this is not a promise of halved GPU attribute bytes. Existing four-region/eight-detailed-site/nine-detail-tile/three-effect caps and the 884,736-byte detail matrix pool remain. Grove LODs share matrices; core has 429 selected trees in this snapshot, under the 700 cap, and each streamed region is capped at 240. One generated 256² RGBA16F spectrum and one 512×256 RGBA8 sign atlas require roughly 0.67 MiB each including mips, before renderer overhead; FFT work arrays are temporary. No bloom pass, new render target, downloaded artwork/model, external service or paid dependency was added.

The 112 KiB source ceiling explicitly replaces 94 KiB for this pass and includes the extracted shared wave generator; final measured source plus inline guard is 106,602 gzip bytes. Whole source/transfer/heap/GPU metrics remain separate. Two bounded visual polish rounds were completed; later runs verified resource packing and overlap fixes without opening new polishing work.

## Evidence and next step

Ignored logs: `codex-issue5-unit-release.log`, `codex-issue5-final-checks.json`, `codex-issue5-verification.json`, `codex-issue5-corrupt-{native,webgl}.log`, `codex-issue5-decoder-browser.json`, `codex-issue5-final-cold-compare.json`, `perf-issue5-matched-{before,after}-{webgpu,webgl}.json` (baseline reports inside the baseline checkout), regenerated-asset logs and red/green regressions. Captures: `quality-{baseline,round2,verified}-*` and the reviewed contact sheets.

## Public release

Runtime main `91caddeb89919b80165fc64afa21c3f729427641`; [successful Pages deployment](https://github.com/treycausey/slop-seattle/actions/runs/41089775242). Nineteen served HTML/JS/index files match the local runtime byte-for-byte, and four remote datasets decode identically to the local files. Fresh native WebGPU and forced WebGL sessions both pass 95-Place search/travel, SSP1 atlas, Photo/light/exit/focus, Gas Works/north groves/water, lazy Blue Angels, walking, real touch menu/Photo exit, mobile overflow and pool bounds, with no media downloads or console/page/GPU errors. Actual public core body is 246,734 bytes; engine bodies total 320,731 bytes. The full asset/content tests remain local; the public check is read-only and uses no mocked routes or test globals.

Logs/captures: `codex-issue5-public-{native,webgl}.log`, `codex-issue5-public-{webgpu,webgl}.json` and corresponding PNGs. Feature branch merged and removed. The finite implementation and verification pass is complete; no additional polish is queued. Issue 5 can be closed as completed.
