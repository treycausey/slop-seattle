# Slop Seattle acceptance

Single acceptance record for the Seattle fork. Downtown retains 4,490 OSM building footprints. North Seattle adds 82,435 City GIS footprints, 8,135 street paths and 317 park polygon parts, extending through Fremont, Ballard, Wallingford, Phinney Ridge, Green Lake, Greenwood and Crown Hill. Landmark replacements reduce the number of generic buildings rendered. Heights without source measurements, terrain, and landmark architecture are stylized.

## Flannel and Beast Mode avatars — 2026-10-29

Walking and cycling share a saved Avatar choice: Flannel (red generated plaid, jeans, long hair) or Beast Mode (navy/lime hawk mascot, 24 jersey, beak, crest, broader build and stronger walking arm swing). Existing planted-foot and bicycle pedaling rigs remain intact. Clothes and jersey digits use filtered shader patterns; two head attachments share geometry/materials. Looks switch through one uniform, with no texture/model downloads or per-switch geometry construction. Each costume owns its headwear, replacing the stock helmet to avoid overlapping surfaces.

| Action | Expected visible or saved result | Failure / recovery | Evidence | Status |
| --- | --- | --- | --- | --- |
| Choose Avatar while walking/cycling | Both distinct looks apply immediately and carry between modes | Only valid saved values restore; default is Flannel | Native/WebGL tours, front/rear captures and reload | Passed |
| Walk and pedal after choosing | Head follows the rig; hands/feet retain their animation; keyboard control resumes | Selector releases focus after selection | Focused-selector movement regression failed before blur, passed after; four look/mode movement checks per backend | Passed |
| Orbit the character | Front and rear views keep the character visible | Seattle chase camera targets the character rather than looking beyond it | Front-orbit projection regression reproduced a head behind the camera; rendered front views and clip-space assertions now pass | Passed |
| Change looks thirty times | Fixed geometry, materials, textures, shaders and GPU buffers | Only uniform values and existing visibility/pose properties change | Three batches of ten toggles per backend, exact warm GPU counter comparisons and collected heap | Passed |
| Use the mobile control | Selector fits, remains usable and is hidden for other travel modes | Native labeled select; no extra top toolbar | 390×844 capture, overflow, hide/show and save/restore checks | Passed |
| Preserve combined release | Performance pass, previous modes and nineteen Places remain available | Merge the shipped performance release before final validation | Baseline main 0797384; 232 permanent tests, both avatar suites and native nineteen-Place app suite pass. Source 72,700 gzip bytes (+3,088), under explicit 72 KiB ceiling | Passed |
| Publish exact tested version | Public Avatar control changes both walking/cycling looks | Compare served modules and use real public controls | Pending publication | Pending |

After thirty switches, whole-scene GPU allocation stayed at exactly 97,857,192 / 55,220,882 reported bytes on native/WebGL. Geometry, texture, program and uniform-buffer counts stayed identical between warm samples; collected heap changed by -448 / +26,972 bytes between the second and third sample. Both look/mode combinations were visually inspected, including front views. These are browser checks on this Mac, not physical-phone acceptance.

## Deeper street detail and performance — 2026-10-29

The selected tradeoff keeps full nearby detail and simplifies distant shading. Fire escapes add three landings, posts, handrails and rung ladders; storefronts gain frames and planted window boxes; tree guards, slotted drains, bin openings and car lights/bumpers/mirrors add smaller scale. No geometry, antialiasing or drawing-resolution reduction is used to obtain the measurements below. Distant background clouds reuse the environment bake and refresh with lighting presets.

| Action | Expected visible or saved result | Failure / recovery | Evidence | Status |
| --- | --- | --- | --- | --- |
| Explore nearby streets | New small geometry with the original nearby material detail | Nine CPU slots pack into six shared material meshes; existing matrix cap remains | Real Places → Walk/first-person flow on both backends; inspected fire-escape/flower-box close-up on an actual footprint near the Market; deterministic finite/capped planning | Passed |
| Approach a facade or surface | Full shading within 80 m, smooth transition from 80–100 m, filtered windows/night lights beyond | Whole nearby material setup is retained; subpixel interior work is gated | Real GPU pixel comparisons against original road/paving expressions and full stone/facade material setup, on both backends | Passed |
| Preserve shadows and animation | Original static silhouettes and moving landmarks remain correct | Position-only static sun casters share local batches; hidden, alpha-tested and animated objects retain their original path | Original/batched shadow comparison, no-shadow positive control; hidden/animated-caster regression fails before the filter fix and passes after; both thirty-discovery and Blue Angels tours | Passed |
| Travel through northern neighborhoods | Exact footprint heights and open courtyards arrive sooner | Indexed extrusion, exact shoreline-distance index, 4 ms construction scheduling and completed-region reveal | Courtyard/winding and real-shoreline regressions; isolated build samples below; all destination and failed-load/retry flows | Passed |
| Revisit and dispose | Stable resource counts, bounded heap, no old source retention | Region disposal releases objects and geometry; detail pools reset counts and indexes | Both north tours: exact GPU counts across rounds; 884,736 instance bytes and six bins; repeated replacement, empty input and double disposal | Passed |
| Reach the 2× rendering target | At least half the previous frame-work cost in the measured workload | Preserve nearby fidelity and report CPU-limited cases separately | All six 4K WebGPU views exceed 2×; aggregate 2.49×. Smaller Retina WebGPU is 1.50×, WebGL 1.17×; walking 1.08× | Passed at 4K; below 2× in lighter/nearby workloads |
| Bound source and downloads | No downloaded texture/model assets; explicit code ceiling | Seattle-specific JS ceiling grows from 64 to 70 KiB for the new geometry, index and shading helpers | 69,612 gzip bytes (+6,395 versus the current Blue Angels/30-discovery release); request assertions on both backends; 232 permanent tests | Passed |
| Publish exact tested sources | Public new detail and both renderers work | Compare served hashes and exercise actual controls after Pages deployment | [Pages release](https://github.com/treycausey/slop-seattle/actions/runs/40929477083) succeeded for `493275f`. All 14 changed runtime files match public bytes. Fresh public Chrome sessions exercised Places → Market → Walk → first person and Midday on native WebGPU and forced WebGL: nine detail tiles, six draws, 884,736 instance bytes, thirty discoveries, no page/console errors or blocked requests. Both public captures inspected. | Passed |

### Isolated rendering measurements

Chrome 156 on this M2 Max Mac with 32 GiB memory. Baseline runtime is `0e2be0b` (the runtime at the subsequent `f81c1c4` documentation release). Both versions use the same pinned engine, full drawing dimensions, controls, geographic data, thirty discoveries and Blue Angels mode. Five batches of 120 full update/render steps per view, with a GPU queue fence, run sequentially through the same Playwright 1.64.1 harness. Each view's median batch cost contributes equally to the tour mean. This measures rendering headroom, rather than displayed FPS at the monitor's refresh cap.

| Workload | Previous mean ms/frame | New mean ms/frame | Speedup |
| --- | ---: | ---: | ---: |
| Moving scenic tour, WebGPU, 3840×2160 drawing buffer | 4.457 | 1.788 | **2.49×** |
| Moving scenic tour, WebGPU, 2160×1500 drawing buffer | 2.163 | 1.445 | **1.50×** |
| Moving scenic tour, WebGL, 2160×1500 drawing buffer | 0.962 | 0.826 | **1.17×** |
| Actual held-W walking, WebGPU, 2160×1500 drawing buffer | 2.436 | 2.256 | **1.08×** |

| 4K WebGPU view | Previous ms/frame | New ms/frame | Speedup |
| --- | ---: | ---: | ---: |
| Space Needle | 4.347 | 1.643 | 2.65× |
| Pike Place Market | 5.047 | 2.322 | 2.17× |
| Columbia Center | 5.337 | 1.572 | 3.39× |
| Greenwood | 5.032 | 2.402 | 2.10× |
| Gas Works | 3.163 | 1.429 | 2.21× |
| Ballard Locks | 3.814 | 1.361 | 2.80× |

The same 4K tour's final region-build samples were Greenwood **321 → 100 ms**, Gas Works **504 → 99 ms**, and Locks **200 → 44 ms**: 3.2–5.1× faster elapsed construction, including scheduled yields. These are distinct from rendering gains. The 2× result does not extend to every viewport, backend or close-range scene. A masked-out nearby-surface experiment made no measurable throughput improvement and was removed; the original nearby formulas remain.

North revisit counters were identical between rounds: WebGPU **109,435,989** reported GPU bytes, WebGL **58,480,406**. Collected heaps changed from 99,007,056 to 99,362,800 bytes and 45,060,204 to 45,250,492 respectively. These functional/memory tours ran alongside other checks; their wall/frame timings are not used for the isolated comparison above. Physical iPhone/Safari performance remains unobserved.

Nearby road, paving and stone comparisons were pixel-identical on WebGPU; masonry/glass facade RMS differences were 0.081/0.123 on an 8-bit channel scale. WebGL's largest RMS difference was 0.263. Batched static shadows differed by RMS 0.340, with 0.0016% of pixels over the test's 8-channel threshold, while disabling shadows changed 6.26% of pixels, confirming a visible-shadow test. A separate caster fixture rejects hidden materials, hidden ancestors and animated roots. Full app, details, north streaming, discoveries and formation-flight flows passed on both backends.

Three concurrent suites initially printed PASS but hung during Chrome cleanup with Playwright 1.56.1. Aligning the test dependency with kit's 1.64.1 development version resolved the observed hang; all three reruns exited successfully. The old test processes and their servers were stopped and verified absent. This affected the validation harness, not the shipped client. No commit/publish claim is made by an assertion log alone.

The runtime-source fingerprint for the measured candidate is `2d824d25bdd217ab54832c181ae0c9f9bcfe305b64cc98819abc15017f5bdb98`. Raw reports are named `perf-release-*`; [DETAILS.md](DETAILS.md) documents reproduction and diagnostic timestamp limitations. The 70 KiB ceiling is the sum of Seattle-specific module gzip sizes, not total page weight; shared material helpers and the engine are separate.

## Blue Angels mode — 2026-10-29

A fifth travel mode adds four blue-and-gold procedural jets in a diamond. It uses existing keyboard, touch and standard-gamepad input, with separate arcade flight/camera code. The original controllers, player models and Manhattan camera module are unchanged. Model geometry is instanced by material; smoke uses a fixed 64-sample ring per jet and one ribbon draw. Only mode selection/restoration imports the feature; mode exit disposes it.

| Action | Expected visible or saved result | Failure / recovery | Evidence | Status |
| --- | --- | --- | --- | --- |
| Select Blue / press 5 | Four recognizable jets, forward flight, blue/gold livery and diamond framing | Optional import failure preserves the previous travel mode and gives a reload instruction | Native/WebGL selection, rendering, injected 503 and successful reload | Passed |
| Fly with keyboard, gamepad or touch | Speed, heading, bank and altitude respond; 1–5 mode cycling wraps correctly | Terrain/building clearance, world-edge return and capped frame delta keep movement bounded | Pure flight contracts, real keyboard/touch and emulated standard pad checks on both backends | Passed |
| Toggle B / Smoke and change camera | Bounded trails, chase/side/forward views; all four jets fit the chase composition | Reduced motion starts with smoke off and suppresses visual bank | 64-sample cap, five draw calls, 12,240 trail bytes; inspected desktop/mobile captures | Passed |
| Open dialogs, choose Places, reload | Dialogs and Places views pause flight; saved mode/altitude restores | Closing dialogs clears held inputs; switching modes restores the original helicopter | Both flight browser suites plus the native 19-Place application suite, including old modes, map, saves and touch | Passed |
| Repeatedly enter/exit mode | No accumulating event geometry, textures, instance buffers or heap | Shared resources are disposed on every exit; no downloaded media | Four cycles/backend measured at the same ready landmark, with stable warm GPU counts and bounded heap | Passed |
| Preserve loading and size | No jet download on ordinary boot; explicit 64 KiB source ceiling | Discovery and regional caps remain unchanged | 63,217 gzip Seattle JS bytes (+4,279); source budget and browser request assertions | Passed |
| Publish exact tested version | Public Blue mode, smoke and touch work | Compare served bytes and run public controls | [Pages release](https://github.com/treycausey/slop-seattle/actions/runs/40908538881) succeeded. Five changed public files match byte-for-byte. Real public Chrome exercised Blue selection, turn/climb, full smoke ring, B/touch toggle, touch climb, mobile framing/overflow and mode exit, with no errors; both public captures inspected. | Passed |

The first app check hit the already tracked local module-download connection reset ([issue 2](https://github.com/treycausey/slop-seattle/issues/2)). The app browser harness now uses the same 128-connection test-server queue as the discovery tours. A memory assertion initially compared different streamed neighborhoods; it now returns to the same ready Space Needle view before each sample. Visual review framed the formation centroid and moved the mobile speed card above the action, hiding its radar while keeping the map button available.

Final native/WebGL flight runs passed controls, mode wrap, smoke saturation, paused dialogs, all camera options, four entry/exit cycles, save/restore, touch climb, reduced motion and injected optional-module failure/reload. After warming, reported whole-scene GPU allocation held at 117,255,977 / 78,587,342 bytes, with unchanged geometry/texture/program/buffer counts. Collected heap changed by +109,444 / -21,620 bytes from the second to fourth sample. Native's first extra detail bin allocated 448 bytes of bindings, then remained stable. No new texture or model requests occur. Browser touch/gamepad checks do not establish physical-device acceptance.

A focused Columbia Center regression caught stale altitude-clearance timing after teleport: holding descend dropped from 426.6 m to 382.9 m while using the previous neighborhood's cache. Reset now refreshes both clearance and its timer, and the same flow holds 426.6 m; both full flight suites include that regression. Terrain queries run at 5 Hz with lookahead, while smoke storage stays fixed.

Release validation: 228 permanent tests, both full flight suites and the native application suite covering all nineteen Places and inherited controls passed. Public WebGL flight with saturated smoke sampled 16.7 ms median and 16.7 ms p95 frames on this Mac. This is a browser observation, not a physical-phone or universal frame-rate guarantee.

## Thirty discoveries — 2026-10-29

Adds four Seahawks scenes (12 flag, spiral, hawk and a small visual Beast Quake), four grunge tributes (guitar/amps, flannel, vinyl and spoons), and seven local oddities (Toe Truck, pink elephant, geoduck, banana slug, pinball, Interurban passengers and visiting Hat 'n' Boots). They reuse the existing deferred discovery loader, local trigger grid and three-effect cap. Three shared palette colors are added, with no new textures, images, models or audio. Small scenes find a nearby clear stage at activation so a neighboring footprint cannot enclose the camera target.

| Action | Expected visible or saved result | Failure / recovery | Evidence | Status |
| --- | --- | --- | --- | --- |
| Discover all thirty | Fifteen new themed scenes plus all original discoveries | Another clue cycles co-located hints without disclosing titles | Thirty unique IDs and local-anchor checks; native/WebGL browser tours and inspected captures of all fifteen new scenes | Passed |
| Repeat visits and simultaneous events | Cooldowns hold; at most three effects remain resident | Fourth event evicts the oldest; expiry and distance disposal remove event geometry | Two thirty-discovery tours per backend plus four-event stadium sequence; oldest event evicted, zero inactive event geometry | Passed |
| Restore old discovery saves | Original fifteen found IDs remain valid; journal expands to thirty | Invalid IDs are rejected, storage failures do not stop play | Old-save and malformed-save regression, reload and journal checks | Passed |
| Use mobile and reduced motion | Clue controls fit; touch works; transforms hold a stable pose | Journal pauses travel input; movement restores ordinary framing | Real touch events, journal input pause, held transforms and 390×844 overflow checks on both backends | Passed |
| Preserve performance and source ceiling | Load after first frame; no inactive event geometry; remain below 60 KiB gzip | Shared materials and bounded effects prevent accumulation | 225 permanent tests; 58,938 gzip source bytes (+4,731), unchanged ceiling; GPU/heap evidence below | Passed |
| Publish tested collection | Exact public sources and working themed discoveries | Public comparison and real Places → clue → F → Look flow | [Pages release](https://github.com/treycausey/slop-seattle/actions/runs/40903560058) passed. All four changed runtime modules and README matched byte-for-byte; real public Chrome exercised the 12 flag, guitar and pink elephant, keyboard clue cycling and F/Look. Actual emulated touch cycled/activated a co-located clue, with no overflow at 390×844. All four public captures inspected; no page, console or failed-request errors. | Passed |

Final native/WebGL runs activated all thirty discoveries twice (120 visits total). First interactive frame: 1,262 / 1,101 ms. Settled mobile frames: median 16.7 ms on both, p95 16.8 / 16.7 ms. Whole-scene GPU counters returned to identical values after both tours: 131,162,377 / 90,226,979 reported bytes. Collected heap changed by +405,552 / +37,052 bytes. Inactive effect meshes and geometry bytes were zero; sampled active totals remained below 2 MB and thirty meshes. These are isolated browser measurements on this Mac, not a physical-phone guarantee or an overall rendering-speed claim.

Visual review corrected the new builders' box center/base convention and prevented small scenes from spawning inside neighboring footprints. A focused elephant close-up fixture fails with stage placement removed (600 m aerial fallback), passes with it, and the permanent browser tour rejects that fallback for every new scene. The original fifteen-ID save fixture, local-clue enumeration, cooldowns, journal pause, reload, reduced motion and explicit fourth-event eviction all pass.

## Rainier and discoveries — 2026-10-29

Design: exploration leads to a local hint, F/tap produces a short visual surprise, and a small journal saves only discoveries already found. No audio, automatic camera takeover, new downloaded art, or permanent geometry for inactive effects. Optional Look views frame the effect itself with a small occlusion target; tower-scale architectural camera anchors remain the default for ordinary Places. At most three effects can be active, and expiry/leaving resets animated landmarks and disposes render objects and geometry.

| Action | Expected visible or saved result | Failure / recovery | Evidence | Status |
| --- | --- | --- | --- | --- |
| Choose Mount Rainier overlook | Recognizable snow/glacier-covered mountain on the southeast horizon during ordinary exploration | Directional projection preserves angular size inside the 60 km far plane; flanks blend into haze | The former true-distance placement exceeds the far plane; finite terrain/normals/snow regression and native/WebGL rendered views | Passed |
| Approach and wake the Fremont Troll | Sculpted brows/nose, silver eye, captured car; eye tracks/blinks, then resets | Camera stays below the Aurora deck; cooldown blocks repeated spawning | Under-deck view regression reproduced failure then passed; keyboard/touch interaction and eye-scale/reset assertions | Passed |
| Discover fifteen surprises | Distinct generated creatures, objects or scenes with immediate feedback | Local hints appear near roads; discovery IDs are validated and saved | Native/WebGL tours activate all 15 twice, verify cooldowns, journal, save restore and no media requests | Passed |
| Select Look | Optional close composition shows the current effect clearly | Small target radius avoids the tower-camera fallback; movement/V returns to travel | Tiny-courtyard camera regression failed before radius support, passed after; batched captures of all discoveries | Passed |
| Use touch / reduced motion | Touch hint activates the Troll; reduced-motion uses a held pose; mobile Look clears side HUD | Travel and map controls remain available | Real emulated touch events, dialog input pause, 390×844 captures and overflow assertion | Passed |
| Revisit and leave discoveries | No retained event geometry or growing GPU allocation | Expiry and distance eviction call object/geometry disposal; shared materials remain bounded | Two 15-discovery tours per backend; identical warm geometry/texture/program/buffer counts, zero inactive event meshes | Passed |
| Preserve loading and source budget | Rainier is available normally; discovery code imports after first interactive frame | Module load failure has a readable reload message | 54,207 bytes gzip Seattle-specific JS vs 44,626 before (+9,581); explicit 60 KiB ceiling; 4,608 Rainier triangles | Passed |
| Preserve normal exploration | Modes, map, 19 Places, bridge travel, saves, help and touch still work | Existing regression suite blocks release | 224 permanent tests plus complete native/WebGL application browser checks | Passed |
| Publish and close issue 3 | Public site serves exact tested modules and required interactions | Compare served files and exercise public Rainier/Troll paths | [Pages deployment](https://github.com/treycausey/slop-seattle/actions/runs/40897928933) succeeded; twelve public files match the tested release byte-for-byte. Real Chrome reached Rainier with 803 snow vertices, then woke the Troll through F, checked the eye response/cooldown and selected Look, with no page, console or request failures. Both public captures were inspected. | Passed |

Native discovery run: first frame 1,280 ms; sampled settled mobile frame median 16.7 ms and p95 16.8 ms. Reported GPU memory returned to exactly 131,773,817 bytes after both tours; collected heap changed from 111,415,308 to 111,880,704 bytes. This is a whole-scene value at Good Shepherd, not memory attributable only to discoveries. Inactive event geometry was zero; every sampled active effect stayed below 2 MB of geometry and 30 meshes, and the manager caps concurrent effects at three. Physical-phone performance is not established by touch emulation.

The equivalent WebGL tour reached its first frame in 1,102 ms, with 16.7 ms median / 16.7 ms p95 settled frames. All GPU counters returned to exactly the same values (90,216,035 reported bytes); collected heap changed from 47,707,144 to 48,807,820 bytes. Reduced motion additionally has a before/after regression: holding progress alone allowed time-driven rotations to continue; both progress and time clocks now hold a stable pose, and the browser test compares transforms across frames. Animated groups are tagged for the separately coordinated static-matrix optimization.

Visual review fixed three concrete mechanisms: the Troll camera sat on the bridge deck; collision-safe Locks arrivals could lie outside the first discovery radius; and a 12 m tower-camera target demanded too much empty space around a small character. The focused regression fixtures cover these failures. A submarine was moved into the lock chamber, and the coffee cup's open top removes overlapping coplanar lids.

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
| Keep north landmark walls detailed from every side | Commercial blocks, bathhouses and Good Shepherd use the shared procedural facade palette | Regression rejects plain placeholder wall materials; Greenwood view faces the street and theatre signs | Shared-facade assertions across six landmarks and native/WebGL rendered captures; no new materials/textures | Passed |
| Publish the exact tested implementation | Main and public Pages serve this expansion and can reach a north Place | Verify served hashes and rendered public target | [North deployment](https://github.com/treycausey/slop-seattle/actions/runs/40884369670) and [final facade deployment](https://github.com/treycausey/slop-seattle/actions/runs/40886480093) succeeded. Seven initial public files and all three updated modules matched byte-for-byte. Real Chrome reached Greenwood with four regions, 18 Places, a clear camera, shared detailed facades and no errors. | Passed |

Isolated north memory runs on this Mac: WebGPU first frame 1,278 ms; WebGL 1,130 ms. After the two tours, reported GPU memory was 106,254,967 / 63,462,453 bytes respectively. WebGPU collected heap moved from 90,090,372 to 88,632,556 bytes; WebGL from 43,760,900 to 45,411,976. Native geometry/texture/program counts stayed equal; one additional previously unused bin in the fixed detail pool acquired a 16 KiB matrix buffer. WebGL counters stayed exactly equal. The sampled walking frame median and p95 were 16.7 ms on both backends. Maximum observed long tasks were 103 / 107 ms. Whole-tile construction took roughly 0.2–0.52 seconds elapsed, spread over animation frames; this is not a single blocking task or a physical-phone guarantee.

The first revisit regression exposed +1,125 retained uniform buffers per tour when only geometry was disposed. The pinned renderer's `RenderObject` implementation requires an object disposal event to release bindings; eviction now sends it. Geometry, texture and program counters are compared exactly, while GPU growth is bounded by the existing 54-bin detail pool, whose buffers allocate lazily. Desktop shadow tiles are capped at 1536 px and narrow-screen tiles at 1024 px; terrain and procedural material detail remain in place.

A cold development-server run encountered a local HTTP connection reset before initialization, matching the pre-existing module-load reporting limitation in [issue 2](https://github.com/treycausey/slop-seattle/issues/2). Fresh full runs passed. The north stress harness raises Python's server listen backlog for its larger module fan-out. No production backend, physical iPhone, or navigation accuracy claim is made.

Final checks: 219 permanent tests; full native and WebGL app flows including all 18 Places, the shared-facade contract, atlas-to-Ballard walking, saved state and touch emulation; both north memory tours. Final Seattle-specific source is 44,626 bytes gzip, including water coordinates. The stock `webshot` browser timed out during public north travel; the installed Chrome used by the app checks completed the same public Greenwood route with no console or request errors. Its rendered capture was inspected, and the tool friction was recorded with `papercuts`.

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
