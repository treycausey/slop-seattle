# Slop Seattle acceptance

Single acceptance record for the Seattle fork. Downtown retains 4,490 OSM building footprints. North Seattle adds 82,435 City GIS footprints, 8,135 street paths and 317 park polygon parts, extending through Fremont, Ballard, Wallingford, Phinney Ridge, Green Lake, Greenwood and Crown Hill. Landmark replacements reduce the number of generic buildings rendered. Heights without source measurements, terrain, and landmark architecture are stylized.

## North Seattle expansion — 2026-10-29

| Action | Expected visible or saved result | Failure / recovery | Evidence | Status |
| --- | --- | --- | --- | --- |
| Start downtown | First frame does not wait for north footprints; distant north has inexpensive silhouettes | Loading failures remain readable | Request assertions: no full north tiles on boot; 56 KiB overview loads after first frame | Passed |
| Choose the ten north Places | Correct neighborhood, recognizable procedural landmark and clear composed view | Travel waits for local geometry/colliders; movement exits the view | All 18 Places exercised through buttons on native WebGPU and WebGL; desktop/mobile captures | Passed |
| Cross the Ship Canal | Survey-aligned Fremont, Ballard, Aurora and University decks carry ground travel | Water banks reject ground arrivals and constrain movement | Street-centerline regression failed for the old University placement, then passed; water/bank/deck contracts; atlas-to-Ballard walking flow | Passed |
| Inspect residential blocks and parks | Footprints retain courtyards, houses have visible pitched roofs, park lawns follow terrain and preserve lake holes | Triangulation and outward normals are tested | Courtyard import, Green Lake hole, sky-facing roof regression and rendered review | Passed |
| Load an unavailable neighborhood | Current position is retained and a readable retry instruction appears | Selecting the Place again succeeds and clears the error | Injected HTTP 503 followed by real successful retry on both backends; injected routing removed | Passed |
| Tour eight north neighborhoods twice | At most four full regions plus the fixed nine-slot detail pool remain resident | Eviction drops CPU references, geometry, instances and render-object bindings | 16 visits/backend; bounded region count, scene geometry, GPU counters and collected heap | Passed |
| Verify source/data budget | No image/model downloads; complete north snapshot stays small and loads independently | Permanent budgets reject oversized source or tiles | 87 gzip regions, 4,870,305 bytes total, largest 122,877 bytes; atlas 229,581 bytes; overview 57,599 bytes; Seattle JS below 44 KiB gzip | Passed |
| Validate inherited behavior | Original scene regression suite and Seattle controls, time, map, save and touch paths work | Test failures block release | Permanent suite, full native/WebGL browser suites, separate native/WebGL north memory runs | Passed |
| Publish the exact tested implementation | Main and public Pages serve this expansion and can reach a north Place | Verify served hashes and rendered public target | Pending release verification | Pending |

Isolated north memory runs on this Mac: WebGPU first frame 1,278 ms; WebGL 1,130 ms. After the two tours, reported GPU memory was 106,254,967 / 63,462,453 bytes respectively. WebGPU collected heap moved from 90,090,372 to 88,632,556 bytes; WebGL from 43,760,900 to 45,411,976. Native geometry/texture/program counts stayed equal; one additional previously unused bin in the fixed detail pool acquired a 16 KiB matrix buffer. WebGL counters stayed exactly equal. The sampled walking frame median and p95 were 16.7 ms on both backends. Maximum observed long tasks were 103 / 107 ms. Whole-tile construction took roughly 0.2–0.52 seconds elapsed, spread over animation frames; this is not a single blocking task or a physical-phone guarantee.

The first revisit regression exposed +1,125 retained uniform buffers per tour when only geometry was disposed. The pinned renderer's `RenderObject` implementation requires an object disposal event to release bindings; eviction now sends it. Geometry, texture and program counters are compared exactly, while GPU growth is bounded by the existing 54-bin detail pool, whose buffers allocate lazily. Desktop shadow tiles are capped at 1536 px and narrow-screen tiles at 1024 px; terrain and procedural material detail remain in place.

A cold development-server run encountered a local HTTP connection reset before initialization, matching the pre-existing module-load reporting limitation in [issue 2](https://github.com/treycausey/slop-seattle/issues/2). Fresh full runs passed. The north stress harness raises Python's server listen backlog for its larger module fan-out. No production backend, physical iPhone, or navigation accuracy claim is made.

## Initial Seattle remix — 2026-10-28

| Action | Expected visible or saved result | Failure / recovery | Evidence | Status |
| --- | --- | --- | --- | --- |
| Open Seattle | Seattle title, Space Needle, actual Seattle roads and skyline | Readable startup error and retry button | Browser screenshot; no page or shader errors | WebGPU passed |
| Switch Walk / Drive / Cycle / Fly | Selected mode, corresponding player, safe local arrival | Ground arrivals resolve against footprint collisions | Browser controls; controller world regression | Passed |
| Hold W, then release | Active player advances; release stops input | Blur, dialogs and teleports reset controls | Browser movement assertion; inherited input suite | Passed |
| Fly and hold E | Altitude increases | Q descends; altitude bounded by controller | Browser altitude assertion | Passed |
| Choose all eight Places | Active player arrives near the destination at rest | Road snap and collision-safe placement | Eight browser clicks, finite state and zero speed | Passed |
| Open map and search Pike | Matching road segments highlighted | Empty search restores all; unknown term reports zero | Browser search assertions and map screenshot | Passed |
| Click atlas | Player travels, map closes | Snap to real road then resolve collisions | Browser click; modal and state assertions | Passed |
| Choose Night / Midday | Lighting changes to selected preset | Selection remains available for recovery | Browser preset state assertions | Passed |
| Cycle cameras | Chase, low angle, first person, Seattle skyline | Mode or destination change restores chase | Browser camera assertions; skyline screenshot | Passed |
| Open help / Escape | Controls shown, dialog closes | Movement input cleared when modal opens/closes | Browser dialog assertions | Passed |
| Reload | Seattle mode and position restored | Invalid / unavailable local storage ignored | Browser pagehide/reload assertion | Passed |
| Use phone-sized viewport and joystick | Controls fit; touch drag moves active player | Touch end clears only touch input | Touch-emulated browser flow and 390×844 capture on both backends | Passed |
| Request WebGL fallback | Same flows render without GPU validation errors | WebGPU remains default | `E2E_BACKEND=webgl bun run test:e2e`: PASS, no GPU errors | Passed |
| Run permanent suite | Upstream contracts, Seattle data, payload and camera regression checks pass | Failures block publication | `bun run test`: 209 passed, 0 failed | Passed |
| Publish main and load Pages | Fork main matches remote; public app and data load | Verify deployment status and public rendered page | [Successful Pages deployment](https://github.com/treycausey/slop-seattle/actions/runs/40789582031); public browser capture reports ready, 4,465 generic buildings and 2,317 roads; served `seattle.js` SHA-256 matches local | Passed |

## Rendering diagnosis

The first direct-render integration retained vehicle materials whose `mrtNode` wrote only `normal` and `metalRough` attachments for upstream SSR. Seattle has a single color attachment. The resulting fragment-output structure was empty, producing WebGPU validation errors and corrupted WebGL output. Clearing those unused overrides in the Seattle scene fixed the native run; sunlight was initially suspected and ruled out as the cause of that error. The browser suite treats shader errors and GL invalid operations as failures.

WebGL also interpreted the characters' 496-byte storage pose buffer as a per-vertex attribute for 2,189 vertices. A GL draw probe identified the short `nodeAttribute0` buffer. Seattle replaces the two single-player crowd pose buffers with uniform arrays only on WebGL; the same geometry, skinning shader, and rig remain in use. Both complete backend runs then passed, including touch joystick movement. Cascaded shadows remain enabled on WebGPU.

## Limits

- OSM ways are imported; relation-only footprints and interiors are not included. Missing heights receive deterministic estimates.
- The original Manhattan traffic, crowds, and transit are retained in source but are not instantiated in the Seattle scene. Follow-up: [Seattle routing integration](https://github.com/treycausey/slop-seattle/issues/1).
- Automated mobile evidence uses touch emulation; a physical iPhone/Safari run has not been observed.
- Screenshots and test logs are generated under ignored `tmp/`. Public deployment evidence is distinct from local test evidence.

## Procedural visual pass — 2026-10-28

| Action | Expected result | Failure / recovery | Evidence | Status |
| --- | --- | --- | --- | --- |
| Inspect streets, roofs and waterfront | Weathering, joints, glazing, copper, wood and water detail come from shaders and generated geometry | High-frequency detail fades with pixel footprint | Batched landmark, skyline and mobile captures | Passed |
| Select seven architectural destinations | Distinctive structural signatures and composed views | Neighboring buildings rejected as camera blockers; movement returns to follow | Browser Places clicks, arrival bounds and `placeView.clear` on both backends | Passed |
| Inspect the Spheres | Glass domes, framework and planting visible through a clear view | Exact footprint visibility preserves concave courtyards and selects a clear azimuth/elevation | Blocked-preset and L-shaped courtyard regressions; native and WebGL captures | Passed |
| Watch Great Wheel | 42 enclosed cabins remain upright while the rim rotates | Separate instanced translation from rim rotation | Browser cabin-count and rotation assertions | Passed |
| Inspect Lumen Field | Arched trusses, seating, field markings; no trees inside the stadium | Landmark footprint excludes tree placement | Daytime stadium capture | Passed |
| Select Night at the Market | Generated neon and analog clock remain legible | Time preset can return to daylight | Night capture | Passed |
| Check asset budget | No downloaded texture/model files; Seattle JS below 28 KiB gzip | Byte budget and browser request assertions block shipment | 23,086 gzip bytes Seattle JS vs 12,400 baseline: +10,686 bytes; unchanged geographic snapshot; no media requests | Passed |
| Exercise WebGPU and WebGL | Controls, scene and touch flow work without GPU errors | Inherited WebGL pose compatibility remains active | Both complete browser runs PASS; 365 scene meshes, 380,610 triangles, 45 materials, 12 generated textures | Passed |
| Publish visual pass | Public site serves tested material/landmark modules | Compare served hashes and open the public page | [Successful deployment](https://github.com/treycausey/slop-seattle/actions/runs/40801888246); landmark/material SHA-256 matches; public Market view ready with clear camera and no shader errors | Passed |

The first full native run timed out waiting for startup; subsequent native and WebGL runs completed without shader errors. A later run encountered resource connection resets before application initialization; its request origin was not recorded. URL logging was added, and fresh complete runs passed. Module-load failure reporting is tracked separately in [issue 2](https://github.com/treycausey/slop-seattle/issues/2). No cold-start timing claim is made.

Visual review found an obstructed Spheres preset; fixed coordinates were replaced by deterministic camera selection. A concave-footprint regression reproduced bounding boxes incorrectly filling an open courtyard, then passed after polygon-aware clipping. Foundations now extend down to the lowest sampled footprint elevation while preserving roof height, avoiding gaps beneath generic buildings on slopes.
