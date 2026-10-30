# Slop Seattle acceptance

Single acceptance record for the Seattle fork. Downtown retains 4,490 OSM building footprints. North Seattle adds 82,435 City GIS footprints, 8,135 street paths and 317 park polygon parts, extending through Fremont, Ballard, Wallingford, Phinney Ridge, Green Lake, Greenwood and Crown Hill. Landmark replacements reduce the number of generic buildings rendered. Heights without source measurements, terrain, and landmark architecture are stylized.

## Issue 5: compact procedural quality — 2026-10-30

Baseline `5e6b2ba`. The finite matrix, complete measurements, tradeoffs and evidence are in [QUALITY_PASS.md](QUALITY_PASS.md). Local and public release gates pass.

- Same pinned engine, one minified core/TSL/WebGPU graph: 618,652 → 320,731 compressed response-body bytes (-48.2%). Absolute original build URLs are remapped too, preventing duplicate TSL runtimes through add-ons.
- All 90 geographic datasets preserve the previous fields, numbers, coordinates and holes. The 87 regions fall from 4,870,305 → 2,848,622 gzip bytes (-41.5%); downtown 430,227 → 246,734 matched gzip bytes (-42.7%). Bounded validated SSP1 decoding handles gzip/already-inflated hosts. Both HTTP and malformed-data travel failure preserve position and permit successful retry. Source builders deterministically reproduce the payloads; rounded negative zero is normalized to the original JSON representation.
- Whole window bays follow each real wall and start at building ground level. Selective street fronts gain generated shop lettering and parallax shelves/door shading; shared walls stay masonry. Houses gain siding palettes. Market stalls gain stock/shelves and Gas Works gains rust, pipework, guards and ladders. All use shared material batches.
- Surveyed park groves use varied fir and alder/maple forms, shared near/far instance matrices, road/building/hole/sightline exclusion, exclusive core ownership, 700 core/240-per-region caps. Water uses one generated 256² RGBA16F spectrum with nine mip levels and filtered multiscale waves; elevated water is calmer. One generated 512×256 sign atlas is shared. Both textures expose disposal paths; no media downloads or new render targets/services are added.
- 254 permanent tests pass. Both backends pass app, streamed north, all discoveries/Troll/Rainier, Blue Angels, avatar, eruption, 95 landmarks, Photo, parks, boot recovery and rendering suites. Final checks cover packed attributes, corrupt-data recovery and repeated resource bounds. Matched captures cover four places ×four times ×two compositions ×desktop/mobile: 64 per backend. Two visual polish rounds completed.
- Six-view 1440×1000 batch timing: native 0.9975 → 0.9843 ms/step (essentially stable); WebGL 0.4549 → 0.4947 (+0.0399 ms). Three alternating cold contexts: median startup 1257 → 1498ms; initial retained JS heap 72,473,388 → 86,753,348 bytes; tracked GPU allocation 99,894,304 → 107,376,051 bytes. Richer rendering costs bounded memory and preparation time; download reduction is not a GPU-memory/startup-speedup or universal-FPS claim. Source ceiling explicitly rises from 94 to 112 KiB, including the extracted shared wave generator.

Public runtime main `91cadde`, [successful Pages deployment](https://github.com/treycausey/slop-seattle/actions/runs/41089775242). Nineteen served runtime/HTML/index files match exactly; four served datasets decode identically to local files. Both public backends pass 95-Place search/travel, binary atlas, Photo/light/exit/focus, north scenery, lazy Blue Angels, walking, touch/layout and pool bounds with no media requests or errors. Engine bodies total 320,731 bytes; core body is 246,734. Feature branch removed.

Chrome touch emulation verifies controls/layout, not physical-phone performance. Native timestamp queries report the last query per context and are not summed across every benchmark step. The measured batch timing waits for GPU/GL completion. See the full matrix for limits and public release evidence.

## Overnight demo, continuous park terrain — 2026-10-29

Baseline: `c6720ba`. The old park renderer accepted whole 24m squares based on their centers, expanding lawns outside surveyed outlines and filling portions of holes. It now triangulates the real outline/holes, clips to the resident region and the existing terrain grid, shares vertices, and interpolates the exact same ground planes with the existing 0.55m lawn offset. Smooth normals remove unnecessary facet seams. Water and instanced evergreen art were retained after the bounded landscape review; extra effects did not justify their cost.

| Action | Result and recovery | Evidence | Status |
| --- | --- | --- | --- |
| Build a triangular surveyed park | Zero outside vertices; exact 4608 m² projected area; indexed geometry and upward normals | Real Three.js city-builder regression failed before with 30 outside vertices and passes on WebGPU/WebGL after | Passed locally |
| Drape curved hills and cross region seams | No ground protrusion at vertices, edge midpoints or triangle centers; shared-grid seam heights match across regions | Curved-hill regression failed for the first prototype, then passed after using common terrain triangles; hole/concavity/crop/translated-grid fixtures | Passed |
| Inspect parks on desktop/phone | Surveyed edges and continuous lawns replace square cutouts; original architectural signatures remain | Two bounded landscape review rounds; final Gas Works/Locks and phone captures; viewport captures wait for actual resized frames | Passed |
| Profile every park dataset | 88 datasets, 472 stored park parts including tile repetitions: geometry 1,145,808 → 700,920 bytes (-38.8%); maximum north-region lawn buffer 158,832 → 25,488 bytes (-84.0%); terrain evaluations 47,742 → 5,640 | Actual before/after production park-generator fragments, three alternating component scans | Passed |
| Keep construction responsive | Median aggregate park-only construction 33.7 → 48.9ms over all 88 datasets; new maximum individual north-region park build ≤2.3ms in these scans | More exact clipping costs some CPU; this is not a whole-region construction-time or startup speedup claim | Passed |
| Match startup, memory and rendering | Cold medians 1165 → 1175ms; initial tracked GPU bytes 99,940,030 → 99,894,304; JS heap essentially unchanged at 72.4 MB. Six-view native 0.9686 → 0.9682 ms/frame, WebGL 0.4315 → 0.4240 | Three alternating cold contexts and matched 1440×1000 six-view tours; no frame-rate improvement claimed | Passed |
| Preserve full game and caps | 243 permanent tests, full 95-Place app tours, 16 streamed visits with eviction/retry, all 31 discoveries/62 visits and Photo repeat tests on both backends | Final integration logs; four regions/eight sites/nine detail tiles/three active effects remain bounded; source 94,590 gzip bytes under 94 KiB; no downloaded media | Passed |
| Publish | Nineteen runtime/HTML/CSS/docs files match byte-for-byte; ordinary public Market/Gas Works travel, Photo/light/exit/focus and touch menu/Photo exit pass on both backends; residency/detail caps hold with no NYC imports or errors | Main `773fd1e`; [successful Pages deployment](https://github.com/treycausey/slop-seattle/actions/runs/41013096067); fresh public browser contexts and park Photo captures | Passed |

The first independent grass tessellation exposed gray ground wedges on hills. The discriminating curved-hill fixture confirmed mismatched interpolation; sharing the terrain grid fixed the mechanism without adding layers or raising lawns. Terrain, footprint heights and coastlines remain stylized; no physical phone measurement is claimed.

## Overnight demo, Photo and night sky — 2026-10-29

Baseline: `00bde98`. Photo mode loads only on request after the first interactive frame. It reuses the existing pointer orbit/pinch state and one small DOM viewer; it pauses travel, preserves the rendered camera ray, and restores orbit state/focus on exit. The procedural night sky adds filtered stars and a cratered moon inside the existing sky draw, with a uniform branch skipping night calculations by day.

| Action | Visible result and recovery | Evidence | Status |
| --- | --- | --- | --- |
| Open Photo or press P | HUD recedes; composed landmark view is preserved; drag/pinch/scroll frames the shot | Real entry, orbit, zoom and desktop/phone captures; module absent from boot request graph | Passed locally |
| Use keyboard/touch, then exit | Movement and game shortcuts pause; Change light cycles presets; Back/Escape restores controls and focus; skyline ray and Blue Angels pause remain correct | Native/WebGL Photo suites, including narrow 320px layout, touch pinch, reduced motion and reload without a persisted Photo mode | Passed |
| Reopen 30 times | One viewer, unchanged warm GPU allocations; retained heap stays bounded | Native 113,134,380 tracked GPU bytes in all three rounds; WebGL 65,603,059 in all three; GC heap roughly 84.0/26.3 MB | Passed |
| Fail optional module | One explicit cache-busted retry; after two failed imports the user sees Reload to retry; no retry loop or lost normal controls | Both browser suites exercise failure, recovery and capped requests | Passed |
| Inspect night sky | Static stars and moon render without downloaded media; all 24 matched view/backend/time samples retain identical mesh, triangle and generated-texture counts | Diagnostic moon/stars captures plus normal Market night view; two batched visual rounds completed | Passed |
| Match rendering, 1440×1000 | Day native 0.9613 → 0.9640 ms/frame; night 1.0083 → 1.0189. WebGL day 0.4394 → 0.4478; night 0.4772 → 0.4563. Aggregate differences range from -4.4% to +1.9% | Six views, five batches ×120 real steps, each backend/time; no rendering improvement claimed | Passed |
| Preserve app and budget | Full 95-Place/movement/map/save/touch suites and boot recovery pass on both backends; 237 permanent tests pass; total Seattle modules roughly 93.4 KB gzip | Source ceiling explicitly increases from 90 to 94 KiB for about 2.1 KB of Photo/night code, versus roughly 478 KB of removed dependency download | Passed |
| Publish | Six served files match byte-for-byte; normal public 95 Places, Market search/travel, lazy Photo, light cycle, exit/focus and touch menu/Photo exit pass on both backends; no NYC imports or errors. Photo transfers as 1,126 gzip bytes only when opened | Main `aad04ca`; [successful Pages deployment](https://github.com/treycausey/slop-seattle/actions/runs/41008169645); fresh public Chrome contexts and normal night Photo captures | Passed |

Mobile evidence uses Chrome touch emulation. The viewer adds no textures, geometry, render targets or render loop; the sky reuses its existing material/geometry. The first visual batch inspected desktop/phone/sky; the final batch confirmed controls and composition. The narrow header now wraps rather than overflowing. No further polish round is planned for this surface.

## Overnight demo, geography dependency cut — 2026-10-29

Baseline: `21b4e3b`. Shared controllers, materials and gamepad field handling still imported `city-config.js`, which eagerly decoded the entire Manhattan geographic database. Both entry points now explicitly configure shared runtime geography before constructing players/materials. New York supplies its unchanged real geography; Seattle supplies its existing world and no Central Park exception. Generic field handling is independent of geography.

| Action | Result and recovery | Evidence | Status |
| --- | --- | --- | --- |
| Cold boot, three alternating fresh browser contexts | Local decoded resources fall from 3.563 to 2.391 MB, about 1.171 MB / 32.9% less; neither NYC config nor geography is requested | Cold CDP/resource reports; cache disabled; 1440×1000 Chrome, native backend | Passed |
| Settle initial scene, collect garbage, inspect retained JS heap | Median used heap 82,886,732 → 72,398,316 bytes: 10,488,416 bytes / 12.7% less; same nine detail tiles, 884,736 instance bytes and 99.94 MB tracked GPU allocation | Three alternating baseline/current samples; JS heap is a browser metric, not process RSS or device memory | Passed |
| Check actual hosted unused files | Removed NYC geography/config bodies are 398,739 + 13,503 gzip bytes; replacement runtime/input bodies are 283 gzip + 177 uncompressed bytes, saving 411,782 bytes for these dependencies | Public before/after response headers; excludes small differences in other shared modules | Passed |
| Exercise original New York | Real original entry reaches rendered scene without errors; isolated document checks real lawn height, live binding, 11 colliders, original person spawn z=410.6, park identity and water material | Native original-app screenshot and isolated contract checks on both backend runs | Passed |
| Repeat Seattle controls and failed-download recovery | 95 Places, four modes, map, camera, saves, touch and focused retry all remain usable; no console/page/GPU errors | Both full application and boot suites; 237 permanent tests, zero failures; 91,293-byte Seattle source gzip including guard | Passed |
| Preserve discoveries and player features | 31 discoveries, 62 visits, active cap, Troll/Rainier response, both avatars, Blue Angels flight/smoke, eruption cooldown/disposal and reduced motion remain usable | All discovery, avatar, Blue Angels and eruption browser suites pass on WebGPU and WebGL; repeat GPU allocations remain bounded | Passed |
| Match six-view rendering | Native mean 0.9714 → 0.9675 ms/frame; WebGL 0.4190 → 0.4254 ms/frame at 1440×1000, same antialiasing and near/shadow detail: effectively unchanged | Six matched camera views per backend, five batches of 120 real steps each; observed differences below 2%, no claimed rendering gain | Passed |
| Publish and verify | Ten served runtime/docs files match byte-for-byte; public normal boot excludes NYC generation/data; 95 Places, Market search/travel, touch menu and overflow checks pass on both backends; original New York entry also renders without errors | Main `0867c5e`; [successful Pages deployment](https://github.com/treycausey/slop-seattle/actions/runs/41004897138); fresh public Chrome contexts and rendered captures | Passed |

Cold startup medians were 1160ms before and 1176ms after. This cut reduces download, parsing and retained heap; it does not establish a startup-time or frame-rate improvement. Raw compressed data formats were left intact because Pages already compresses the main JSON snapshot. No physical phone claim is made.

## Overnight demo, startup checkpoint — 2026-10-29

Baseline: `b6fa4f7`. Controllers and cameras needed only live Bryant Park lawn bounds, but imported the entire Manhattan landmark generator. A small shared state module preserves that live binding and removes `landmarks.js` and `city-grid.js` from Seattle's cold request graph. New York still constructs its real landmarks and re-exports the same state.

| Action | Result and recovery | Evidence | Status |
| --- | --- | --- | --- |
| Cold Seattle boot | 63 → 62 requests; 221,056 fewer decoded resource bytes before the recovery guard | Baseline and lean cold CDP reports; assertion failed before extraction and passes after | Passed locally |
| Inspect actual hosted encoding | Old city-grid + landmarks bodies total 66,469 gzip bytes; replacement state is 195 uncompressed bytes: 66,274 fewer response-body bytes | Public response headers; local server transfer totals are not hosted gzip totals | Passed |
| Build original New York landmarks | Live namespace binding matches extracted state; controller lawn height equals actual generated top, 1.3192283746402036; 11 colliders | Real browser dynamic imports/build, both backends | Passed |
| Fail engine module download, then retry | Readable error, focused 44px-minimum retry button; keyboard Enter reloads successfully after recovery; phone layout has no overflow | Local engine 503 regression timed out before fix, passes after; desktop/390×844 screenshots | Passed on WebGPU and WebGL |
| Preserve exploration | 95 destinations, four travel modes, movement, camera/map/help/saved state and touch joystick remain usable | Complete local browser suite, both backends; 237 permanent tests, zero failures | Passed |
| Preserve source budget | 90 KiB gzip Seattle module ceiling now includes the inline error guard; no downloaded artwork | Permanent payload test | Passed |
| Publish checkpoint | Seven served HTML/CSS/JS files match local byte-for-byte; normal public boot omits Manhattan generators; 95 Places, Market search/travel, touch menu and mobile overflow pass on both backends, with no errors | Main `2097f4e`; [successful Pages run](https://github.com/treycausey/slop-seattle/actions/runs/41003183550); public desktop capture; [issue 2 closed](https://github.com/treycausey/slop-seattle/issues/2) | Passed |

Single cold startup samples were 1252ms before, 1228ms after extraction, and about 1205ms native / 1045ms WebGL with recovery handling. These are noisy observations, not a claimed startup percentage improvement. This checkpoint changes loading and recovery; visual improvements, data compaction and a showcase experience remain tracked in [DEMO_PASS.md](DEMO_PASS.md). Touch evidence uses emulation, not a physical phone.

## Fivefold landmarks and performance — 2026-10-29

Baseline: `f53bfe6`. Places increase from 19 to 95; permanent modeled sites increase from 17 to 93, with the two landscape views preserved. Existing canal bridges and all 31 discoveries remain separate. The [catalog](LANDMARKS.md) records the 76 City-sourced additions and their visual signatures. A shared instance layer supplies distant silhouettes; the detailed module imports after the first interactive frame, builds at most one site per frame, and retains at most eight. All resident sites share material batches. Detached replacements compile asynchronously before appearing; one shared queue serves at most one landmark replacement and one geographic job. Eviction releases geometry and render-object bindings, while palette materials remain shared.

| Action | Expected visible or saved result | Failure / recovery | Evidence | Status |
| --- | --- | --- | --- | --- |
| Search and visit all Places | 95 unique destinations, real street arrivals and composed views | Neighborhood load failure preserves the current position; retry remains available | Native and WebGL full 95-Place application tours, movement, time, atlas, saves and touch pass | Passed |
| Recognize the additions | Varied architectural families, individual dimensions, named geometric signs and characteristic structures | Stylized recipes rather than exact building replicas | City landmark numbers/coordinates, 24 recipe families, desktop/mobile captures; chimneys and spring refined after visual inspection | Passed |
| Load and revisit | At most eight detailed sites, four geographic regions and the original nine-tile detail pool | Failed optional module remains coarse; selected Place gives “Reload to retry”; no retry loop | Focused native/WebGL tours exercise failure/reload, 36 visits, pool bounds and collected GPU/heap samples; exact warm GPU allocations across three rounds | Passed |
| Cull offscreen inactive rigs | Only visible rigs pose/upload; active walking and cycling restore immediately | Blue Angels retains its helicopter hiding; nearby ambient rigs remain visible | Focused browser rig-pose, visibility, movement and Blue transition assertions; both avatar and flight suites | Passed |
| Travel without synchronous shader stalls | Region/model shader work yields before visible activation; lighting graph stays stable | Geometry culling preserves vehicle light parents; zero-output daytime lamps are excluded before initial compilation | Profile separated 1–5 ms modeling from synchronous material builds. New north regression failed at 329 ms before the fix and passes after with zero observed tasks over 50 ms across 16 visits | Passed |
| Replace surveyed outlines | No duplicate footprint collision or floating rooftop detail around a new model | One spatial replacement query is shared by rendering and detail planning | Full catalog equivalence cases and reproduced floating-detail regression fail before the fix and pass after | Passed |
| Improve rendering performance by at least 25% | At least 1.25× headroom at the same resolution, antialiasing, nearby shading and shadow tiles | Report workload/backend limits explicitly | Isolated six-view WebGPU comparison below: 1.45× headroom (44.9% faster, 31.0% less frame work); WebGL 7.4% less frame work | Passed for measured WebGPU tour |
| Preserve appearance and controls | Nearby material pixels, shadows, wheel, Troll, old discoveries, avatars and flight remain correct | Existing fallback and bounded lifecycles retained | Both rendering comparison suites, full 95-Place app tours, both 62-discovery-visit tours, both avatar and both Blue Angels suites pass | Passed |
| Preserve small procedural delivery | No downloaded art, fonts, models, per-building textures or changed engine pin | Explicit 90 KiB ceiling, +16 KiB over previous ceiling | Seattle JS 91,479 gzip bytes versus 74,403 baseline (+17,076); 236 permanent tests and browser request assertions | Passed |
| Publish exact tested version | Main pushed, Pages successful, served bytes and real controls verified | Inspect public release after deployment | [Pages release](https://github.com/treycausey/slop-seattle/actions/runs/40951706724) succeeded for `c250543`. All 14 changed runtime/HTML/CSS files match served bytes. Fresh public native/WebGL sessions exercised 95-Place search, Steam Plant, Licton Springs, St. James and Neptune views, residency bounds, mobile touch search/travel and overflow, with no console/page errors or downloaded art. Public desktop/mobile captures and a ready-state webshot were inspected; the catalog link returns HTTP 200. | Passed |

### Rendering comparison

Chrome on this M2 Max Mac, same pinned engine, Golden hour, 1920×1080 viewport, requested DPR 2 capped by the unchanged app to 1.5 (2880×1620 drawing buffer). Five batches of 120 complete update/render steps per view; GPU work is fenced. Camera moves during each batch. The mean gives each of the same six views equal weight. Baseline is a clean archived `f53bfe6` runtime served by the same harness. Versions run sequentially in isolated browsers; no profiler runs in these final measurements. The harness waits for both geographic loading and all desired detailed sites/shader preparation to settle. This measures rendering headroom, not refresh-capped FPS, cold startup, phone performance or every possible view.

| WebGPU view | Baseline ms/frame | Expanded ms/frame |
| --- | ---: | ---: |
| Space Needle | 1.728 | 1.213 |
| Pike Place Market | 2.189 | 1.461 |
| Columbia Center | 1.792 | 1.023 |
| Greenwood | 1.621 | 1.468 |
| Gas Works | 1.722 | 1.100 |
| Ballard Locks | 1.451 | 0.985 |
| **Tour mean** | **1.751** | **1.208** |

The final tour provides **1.45× rendering headroom (44.9% faster, 31.0% less frame work)**. Previous candidates, before the final light-hierarchy and asynchronous preparation fixes, measured 22–27% less time per frame; the final figures above take precedence. All six baseline/candidate camera eyes and targets match exactly. Greenwood gains less than downtown. The final WebGL comparison measured 1.143 → 1.058 ms/frame (1.08× headroom, 7.4% less cost); the 25% result is not a claim about the WebGL fallback. Raw reports are `perf-landmark-control-*` in the ignored archived baseline's `tmp/` and `perf-landmark-delivery-*` in this checkout's `tmp/`, each including source fingerprint, hardware, drawing dimensions and per-batch samples. The final runtime fingerprint is `a371f473e58cd5c98293f80ee74e7dc654cda158b862a31a5dc0d377007b6647`.

Focused architecture tours held total reported GPU allocation at exactly 128,825,452 bytes on WebGPU and 75,674,713 on WebGL across three rounds each. Warm second-to-third collected heap grew by only 100,280 / 104,696 bytes. The final six-site resident sample used 1,387,200 / 1,377,408 bytes of retained geometry arrays, with 10 / 8 packed draws including native shadow proxies; all 76 distant silhouettes use eleven instanced material draws. Temporary replacement geometry is included in the browser's 12 MiB landmark-array cap. Browser memory and touch evidence is from this Mac, not a physical-phone acceptance claim.

## Rainier eruption — 2026-10-29

Discovery 31 adds a 14-second Rainier eruption, triggered by F/tap at the overlook's “The mountain is rumbling…” clue. Lava tubes follow the visible mountain flank, with 28 instanced ash puffs and 18 ballistic cinders. Four draw calls share the mountain's camera-relative horizon projection. The effect remains visible after leaving the trigger area, expires and disposes its own geometry/materials, and uses a 24-second cooldown. The existing three-effect cap still applies. Reduced motion holds a static eruption; no audio, camera shake, downloads or permanent mountain changes are added.

| Action | Expected visible or saved result | Failure / recovery | Evidence | Status |
| --- | --- | --- | --- | --- |
| Visit Rainier overlook and cycle clues | Eruption is discoverable alongside the cloud; old discovery saves remain valid | Local trigger grid and validated saved IDs remain in use | 31-ID and old thirty-ID save contracts; full discovery tours | Passed |
| Trigger F / tap and choose Look | Ash, cinders and glowing lava align with Rainier on the horizon | Same directional transform as the mountain; normal overlook framing | Native/WebGL peak and mobile captures inspected; four draw calls and geometry below 1.5 MB | Passed |
| Repeat or travel away | Cooldown blocks new allocation; the bounded eruption continues across the city | 14-second expiry and 24-second cooldown; no accumulation | Three complete eruptions per backend, remote-Place visibility, saturation/cooldown and expiry assertions | Passed |
| Use touch / reduced motion | Touch triggers the effect; reduced motion holds a stable pose | Expiry still disposes the event; normal snowy mountain remains | Actual emulated touch, stable transform/progress comparisons, unchanged snow-vertex count and zero expired event geometry | Passed |
| Preserve performance and discovery controls | Fixed resources, no art downloads, journal/reload/other effects still work | Shared geometry, explicit disposal and unchanged resident cap | 233 permanent tests; native/WebGL eruption suites and complete discovery tours; 74,403 gzip source bytes (+1,703), under explicit 74 KiB ceiling | Passed |
| Publish the tested event | Public eruption, controls and expiry work | Compare served bytes and exercise public trigger | [Pages release](https://github.com/treycausey/slop-seattle/actions/runs/40939856270) succeeded; six changed public files match byte-for-byte. Public Chrome verified F, cooldown, Look, exact horizon scale, expiry to zero event geometry, normal snow, discovery restore, touch activation, static reduced motion and mobile overflow. Both public captures inspected; no page, console or failed-request errors. Active eruption geometry measured 598,536 bytes across four draws. | Passed |

After each of three eruptions, native/WebGL reported whole-scene GPU allocation returned to exactly 113,311,460 / 69,243,752 bytes. Geometry, texture, program and uniform-buffer counts stayed equal; collected heap changed by +257,552 / +16,132 bytes between the second and third sample. Inactive event geometry was zero. These browser checks on this Mac do not establish physical-device performance.

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
| Publish exact tested version | Public Avatar control changes both walking/cycling looks | Compare served modules and use real public controls | [Pages release](https://github.com/treycausey/slop-seattle/actions/runs/40931229447) succeeded. Five changed public files match byte-for-byte. Public Chrome exercised both looks, walk movement after selection, front orbit, cycling carryover, reload, Avatar selection and mobile touch joystick/overflow, with no page, console or failed-request errors. Both public front captures and mobile capture inspected. | Passed |

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
