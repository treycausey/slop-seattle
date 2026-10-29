# Slop Seattle acceptance

Single acceptance record for the Seattle fork. The source snapshot contains 4,490 OSM buildings; custom landmark replacements reduce the generated generic building count. Geographic coverage is downtown, Seattle Center, South Lake Union, Pioneer Square, and SoDo. Terrain, shoreline, and landmark architecture are stylized.

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
