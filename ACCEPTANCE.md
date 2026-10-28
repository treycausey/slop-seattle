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
| Run permanent suite | Upstream contracts and Seattle data checks pass | Failures block publication | `bun run test`: 205 passed, 0 failed | Passed |
| Publish main and load Pages | Fork main matches remote; public app and data load | Verify deployment status and public rendered page | [Successful Pages deployment](https://github.com/treycausey/slop-seattle/actions/runs/40789582031); public browser capture reports ready, 4,465 generic buildings and 2,317 roads; served `seattle.js` SHA-256 matches local | Passed |

## Rendering diagnosis

The first direct-render integration retained vehicle materials whose `mrtNode` wrote only `normal` and `metalRough` attachments for upstream SSR. Seattle has a single color attachment. The resulting fragment-output structure was empty, producing WebGPU validation errors and corrupted WebGL output. Clearing those unused overrides in the Seattle scene fixed the native run; sunlight was initially suspected and ruled out as the cause of that error. The browser suite treats shader errors and GL invalid operations as failures.

WebGL also interpreted the characters' 496-byte storage pose buffer as a per-vertex attribute for 2,189 vertices. A GL draw probe identified the short `nodeAttribute0` buffer. Seattle replaces the two single-player crowd pose buffers with uniform arrays only on WebGL; the same geometry, skinning shader, and rig remain in use. Both complete backend runs then passed, including touch joystick movement. Cascaded shadows remain enabled on WebGPU.

## Limits

- OSM ways are imported; relation-only footprints and interiors are not included. Missing heights receive deterministic estimates.
- The original Manhattan traffic, crowds, and transit are retained in source but are not instantiated in the Seattle scene. Follow-up: [Seattle routing integration](https://github.com/treycausey/slop-seattle/issues/1).
- Automated mobile evidence uses touch emulation; a physical iPhone/Safari run has not been observed.
- Screenshots and test logs are generated under ignored `tmp/`. Public deployment evidence is distinct from local test evidence.
