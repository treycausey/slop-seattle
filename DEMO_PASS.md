# Overnight technical-demo pass

Authorized by Trey: “Overnight please do an ambition pass on the game as a technical demo of how fast and small and beautiful it can be. I’m afk so proceed without me please.”

Morning handoff target: October 30, 2026, 09:00 America/Los_Angeles. Baseline main is `b6fa4f7`, including the shipped 95-Place release and Kit 0.11.1. Use this checkout, preserve unrelated changes, and coordinate through agent-bus. A half-hour heartbeat continues this finite pass in this chat; pause it after delivery. No paid services or external hosting.

## Direction

Preserve the existing procedural Seattle identity. Improve the miniature city's atmosphere, landmark identity and composition; make the interface recede when enjoying a view. Prioritize fewer bytes and less work over additional effects. Alternatives considered: a heavy cinematic post-processing stack, or a busy new game layer. Choose crisp, atmospheric procedural scenery and a lightweight curated showcase instead: it serves the user's fast/small/beautiful brief without downloading artwork or hiding costs behind lower resolution.

## Finite acceptance matrix

| Work | Visible/measured result | Recovery and bounds | Evidence | Status |
| --- | --- | --- | --- | --- |
| Establish current baseline | Cold request bytes, startup/shader time, matched native/GL rendering and GPU/heap | Distinguish actual transport, decoded source and source gzip; no physical-device claims | Existing acceptance, baseline archives and `tmp/codex-demo-*` reports | Passed |
| Remove unused startup work | Seattle does not import Manhattan landmark generation or geographic database; shared modules take explicit runtime geography | New York keeps its real world and mutable landmark state; both controller/camera seams retain tests | Import graph + original New York app + browser requests and startup failure/retry | First cut shipped; full database cut validated locally |
| Reduce download/data cost | Measure actual hosted encoding before changing payload formats; use compact deterministic data where justified | Existing snapshots/licenses and data refresh instructions remain accurate | Cold transport report and semantic equivalence | Planned |
| Improve procedural visual quality | Stronger sky/water/terrain/vegetation and recognizable architectural signatures | Preserve near detail, shadows, 95 Places, Rainier/Troll, 31 discoveries and avatar/flight features; no downloaded art | Batched desktop/mobile visual review, at most two polish rounds per surface | Planned |
| Present the technical demo | A small optional showcase/photo experience that makes beautiful views easy to reach | Keyboard/touch, clear exit, reduced motion; no forced autoplay or stranded hidden controls | Real controls and repeat/exit checks | Planned |
| Preserve fast bounded exploration | No regressions in rendering, travel, region/detail/effect caps or disposal | One compilation queue, four regions, eight detailed sites, three active discoveries; measured source budget | Matched perf, local integration/e2e and repeat GPU/heap | Planned |
| Ship and verify | Green checks, inspected diff, main pushed, Pages and exact public controls/bytes verified | Preserve unrelated work; no destructive operations, purchases, credentials or external sends | Release links and public evidence | Planned |

## Current next step

Verify and ship the geography dependency cut, then continue the procedural visual and optional showcase experience stages. Controllers/materials now receive the selected city's runtime geography; they do not load Manhattan's database in Seattle. Compare cold retained heap and rendering against the `21b4e3b` archive before publication. Do not assume raw JSON compression will beat GitHub's existing content encoding: the main Seattle JSON already transfers as 438,893 gzip bytes from 1,587,430 decoded bytes.

## Run log

- 2026-10-29 evening: checked clean main, current instructions, agent ownership and existing acceptance; created `demo-overnight` and the continuation heartbeat. No overlapping Slop Seattle work was active. Existing Kit 0.11.1 upgrade is baseline, not part of this change.
- First milestone: shared lawn state extracted, eliminating Manhattan landmark and city-generation downloads from Seattle boot. Cold decoded resources fell by 221,056 bytes before the tiny recovery guard. Added a real engine-503/retry regression for issue 2, red before and green after. 237 permanent tests and both complete WebGPU/WebGL control suites pass. The actual New York lawn binding and controller ground height remain compatible. Bigger visual, showcase, data and matched rendering stages remain planned; this is not the completed overnight pass.
- 04:30 UTC: startup checkpoint shipped as main `2097f4e`, Pages run 41003183550 succeeded, seven public files match and normal public controls/touch pass on both backends. Hosted response-body savings are 66,274 bytes after the 195-byte replacement. Issue 2 is closed. Overnight heartbeat remains active for the remaining finite work; do not pause it at this checkpoint.
- 04:38 UTC: second dependency cut in progress on `demo-world-runtime`. Explicit city runtime removes 1,132,359 bytes of Manhattan geography and 39,842 bytes of derived configuration from Seattle imports, replacing them with two tiny shared modules. Keyboard field suppression is extracted without changing behavior. Original New York uses its real config, and its live lawn, spawn at z=410.6, park and water-material contracts pass in an isolated browser document. Both Seattle boot/recovery suites pass; full exploration and matched memory/render checks are underway. Seattle no longer applies a Manhattan Central Park exception to its canyon shader.
- Geography cut validation: 237 tests; both complete 95-Place app/boot suites; original New York app; Blue Angels, avatars, eruption and 31-discovery/62-visit suites on both backends pass. Three alternating cold/GC samples show 32.9% fewer decoded local resource bytes and 12.7% less retained JS heap versus `21b4e3b`. Six-view rendering is effectively unchanged on both backends; cold startup is unchanged. Next visual direction: a tiny optional Photo mode with an always-visible exit, paused movement and retained orbit; procedural night sky detail within the existing sky draw, then matched day/night visual/performance checks. Avoid an autoplay tour's timer/travel/restore complexity unless evidence warrants it.
