# Overnight technical-demo pass

Authorized by Trey: “Overnight please do an ambition pass on the game as a technical demo of how fast and small and beautiful it can be. I’m afk so proceed without me please.”

Morning handoff target: October 30, 2026, 09:00 America/Los_Angeles. Baseline main is `b6fa4f7`, including the shipped 95-Place release and Kit 0.11.1. Use this checkout, preserve unrelated changes, and coordinate through agent-bus. A half-hour heartbeat continues this finite pass in this chat; pause it after delivery. No paid services or external hosting.

## Direction

Preserve the existing procedural Seattle identity. Improve the miniature city's atmosphere, landmark identity and composition; make the interface recede when enjoying a view. Prioritize fewer bytes and less work over additional effects. Alternatives considered: a heavy cinematic post-processing stack, or a busy new game layer. Choose crisp, atmospheric procedural scenery and a lightweight curated showcase instead: it serves the user's fast/small/beautiful brief without downloading artwork or hiding costs behind lower resolution.

## Finite acceptance matrix

| Work | Visible/measured result | Recovery and bounds | Evidence | Status |
| --- | --- | --- | --- | --- |
| Establish current baseline | Cold request bytes, startup/shader time, matched native/GL rendering and GPU/heap | Distinguish actual transport, decoded source and source gzip; no physical-device claims | Existing acceptance and `tmp/codex-demo-*` reports | In progress |
| Remove unused startup work | Seattle does not import Manhattan landmark generation; further dependency cuts only with consumer compatibility | New York keeps its real world and mutable landmark state; both controller/camera seams retain tests | Import graph + browser requests and startup failure/retry | First cut shipped and publicly verified |
| Reduce download/data cost | Measure actual hosted encoding before changing payload formats; use compact deterministic data where justified | Existing snapshots/licenses and data refresh instructions remain accurate | Cold transport report and semantic equivalence | Planned |
| Improve procedural visual quality | Stronger sky/water/terrain/vegetation and recognizable architectural signatures | Preserve near detail, shadows, 95 Places, Rainier/Troll, 31 discoveries and avatar/flight features; no downloaded art | Batched desktop/mobile visual review, at most two polish rounds per surface | Planned |
| Present the technical demo | A small optional showcase/photo experience that makes beautiful views easy to reach | Keyboard/touch, clear exit, reduced motion; no forced autoplay or stranded hidden controls | Real controls and repeat/exit checks | Planned |
| Preserve fast bounded exploration | No regressions in rendering, travel, region/detail/effect caps or disposal | One compilation queue, four regions, eight detailed sites, three active discoveries; measured source budget | Matched perf, local integration/e2e and repeat GPU/heap | Planned |
| Ship and verify | Green checks, inspected diff, main pushed, Pages and exact public controls/bytes verified | Preserve unrelated work; no destructive operations, purchases, credentials or external sends | Release links and public evidence | Planned |

## Current next step

Measure the remaining `city-config.js` / `nyc-geodata.js` dependency before a clean world/material dependency injection. Continue the procedural visual and optional showcase experience stages. Do not assume raw JSON compression will beat GitHub's existing content encoding: the main Seattle JSON already transfers as 438,893 gzip bytes from 1,587,430 decoded bytes.

## Run log

- 2026-10-29 evening: checked clean main, current instructions, agent ownership and existing acceptance; created `demo-overnight` and the continuation heartbeat. No overlapping Slop Seattle work was active. Existing Kit 0.11.1 upgrade is baseline, not part of this change.
- First milestone: shared lawn state extracted, eliminating Manhattan landmark and city-generation downloads from Seattle boot. Cold decoded resources fell by 221,056 bytes before the tiny recovery guard. Added a real engine-503/retry regression for issue 2, red before and green after. 237 permanent tests and both complete WebGPU/WebGL control suites pass. The actual New York lawn binding and controller ground height remain compatible. Bigger visual, showcase, data and matched rendering stages remain planned; this is not the completed overnight pass.
- 04:30 UTC: startup checkpoint shipped as main `2097f4e`, Pages run 41003183550 succeeded, seven public files match and normal public controls/touch pass on both backends. Hosted response-body savings are 66,274 bytes after the 195-byte replacement. Issue 2 is closed. Overnight heartbeat remains active for the remaining finite work; do not pause it at this checkpoint.
