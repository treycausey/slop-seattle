# Slop Seattle

A Seattle remix of [mrdoob’s Slop New York](https://github.com/mrdoob/slop-newyork), built with three.js, WebGPURenderer, and TSL. Walk, drive, cycle, or fly from downtown and SoDo through Fremont, Ballard, Wallingford, Phinney Ridge, Green Lake, Greenwood and Crown Hill.

[Play Slop Seattle](https://treycausey.github.io/slop-seattle/)

## Seattle

- A bundled OpenStreetMap snapshot: 4,490 building footprints, 2,317 road segments, and 51 parks. Tagged heights are used when available; missing heights receive deterministic estimates.
- North Seattle adds 82,435 surveyed building footprints and 8,135 street paths from City of Seattle GIS, with estimated heights, preserved courtyard holes, pitched house roofs, terrain-following park surfaces and surveyed waterways. Ten new Places include Fremont Troll and Rocket, Gas Works, Ballard Locks and Avenue, Good Shepherd Center, Green Lake, Greenwood, Phinney Center and Golden Gardens. Fremont, Ballard, Aurora and University bridges have continuous travel decks.
- North footprints are split into 87 independently compressed 1 km regions: under 4.65 MiB for all footprint regions, at most 120 KiB per region, and under 5 MiB including the atlas and overview. Only four full regions remain resident, with one load/build job in flight. Geometry is built in small batches across animation frames, then released with its colliders and GPU bindings when evicted. A 56 KiB instanced distant skyline loads after the first interactive frame; the 224 KiB street atlas loads when opened. The core downtown data stays available.
- Procedural landmark architecture: the Space Needle’s paired curved legs and glazed saucer; Pike Place Market’s arcade, striped stalls, rooftop neon and analog clock; the Great Wheel’s twin rim and 42 upright cabins; Columbia Center’s curved stepped lobes; Smith Tower’s terra-cotta shaft and copper crown; the Spheres’ glass, lattice, and indoor foliage; Lumen Field’s roof arches, seating, and marked field. Elliott Bay ferries, tiered evergreens, and distant mountain silhouettes.
- Procedural PBR materials: weathered asphalt and puddles, jointed sidewalks, brick/stone/glass facade palettes, dark gravel roofs with rooftop plant, oxidized copper, timber grain, filtered lawn detail, and animated water normals. Signs, clock faces, awning stripes, and field markings are drawn into canvas textures at startup. No texture images or model files are downloaded.
- Nearby detail streams into nine recycled tiles: slatted benches, street lamps, cycle stands, planters and trees, bins, parked cars, footprint-following parapets, entrances and rooftop equipment. Fire escapes have landings, rails and ladders; storefronts gain deeper frames and flower boxes; trees have guards, drains have individual slots, and cars gain lights, bumpers and mirrors. Six packed material draws retain the 0.85 MiB matrix-buffer cap. [Detail API and measured performance](DETAILS.md).
- Full material shading remains within 80 m and fades to simpler distant shading by 100 m. Distant buildings retain filtered windows and night lights; the background reuses the sky baked for the selected lighting preset, with a sharp sun disc. Nearby surfaces, animated landmarks, render resolution and antialiasing remain intact. Indexed building buffers preserve courtyard holes, while shoreline indexing and bounded construction batches accelerate neighborhood travel. [Performance acceptance and limitations](ACCEPTANCE.md).
- Places now composes an architectural view and rejects camera paths blocked by neighboring buildings. Moving returns to the follow camera; V can cycle back to the selected Place view.
- **95 searchable Places**, five times the previous 19: 76 new permanent landmarks fill Queen Anne, Magnolia, Eastlake, the University District, north Ballard, Green Lake, Greenwood and Licton Springs, with more downtown and Capitol Hill sites. The architectural model count grows from 17 to 93, alongside the existing Lake Union and Rainier views. [Full catalog and visual signatures](LANDMARKS.md). Coordinates come from the City of Seattle landmark layer; authored geometric recipes provide libraries, schoolhouses, churches, theatres, factories, floating homes, a conservatory, a railway bascule bridge and natural spring. Lettering is geometry, with no new texture allocation.
- New sites keep shared instanced distant silhouettes. Detailed architecture imports after the first interactive frame, builds at most one site per frame, and retains at most eight sites. Nearby sites share material draws and release geometry and object bindings on eviction. One bounded queue compiles detached replacements and geographic regions asynchronously with the real scene lighting before revealing them; coarse silhouettes or previous detail stay available. If the optional module cannot load, coarse silhouettes remain and a selected Place reports a readable reload instruction. Footprint removal is shared with collisions and rooftop detail, preventing duplicate buildings and floating props.
- The fivefold release provides **1.45× WebGPU rendering headroom** in the measured six-view tour on this Mac (45% faster; 31% less time per frame), at the same drawing resolution, antialiasing, nearby materials and shadow tile size. WebGL uses about 7% less frame time in that workload. Larger static material batches, combined park/mountain geometry, position-only shadow batches and culling of offscreen inactive player rigs provide the savings. Zero-output daytime headlights do not enter the shader graph; at night the light hierarchy remains stable while only distant vehicle geometry is hidden. The detailed measurements and limits are recorded in [ACCEPTANCE.md](ACCEPTANCE.md); this is rendering headroom, not a universal FPS or startup-time promise.
- A glacier-covered procedural Mount Rainier on the southeast horizon, with a Gas Works overlook in Places. Three summit shoulders, radial ridges, glacier tongues and an atmospheric base fade come from a small radial mesh. A directional projection preserves its bearing and angular size inside the camera range, fixing the former model being clipped beyond the far plane.
- Thirty-one hidden Seattle discoveries, including a reactive Fremont Troll, four Seahawks tributes, four grunge scenes, local oddities and a Rainier eruption. Explore until a nearby prompt appears, then press **F** or tap it. **Another clue** cycles surprises sharing a location. **Look** frames the surprise; moving or changing camera returns to travel. The discovery book remembers only what you have found, without revealing every secret. Previous discoveries remain saved. Events have cooldowns, honor reduced motion, and use no audio or downloaded media.
- At **Mount Rainier overlook**, cycle to **The mountain is rumbling…** and press F/tap to erupt. Glowing lava, cinders and an ash column share the mountain's horizon projection. The 14-second effect stays visible across the city, then fades and releases all geometry/materials; it has a 24-second cooldown. Reduced motion holds a static eruption. Four draw calls use 28 instanced ash puffs, 18 cinders and merged lava tubes, with no particles accumulating over time or new downloads.
- The discovery module loads after the first interactive frame. It queries a small local trigger grid and allows at most three active effects; leaving the area or finishing an effect releases its geometry and GPU bindings. Materials are shared. Inactive discoveries have no scene geometry or animation work.
- **Avatar looks** for walking and cycling: choose Flannel or Beast Mode in the status card. Flannel has generated red plaid, jeans and long hair; Beast Mode is a navy-and-lime hawk mascot with a procedural 24 jersey, beak, feather crest and a stronger arm swing. The choice persists and carries between walking and cycling. Both reuse the existing planted-foot and pedaling rigs, with shared head geometry and no downloaded art. The chase camera frames the character while orbiting.
- **Blue Angels mode (5)** puts you in a blue-and-gold procedural jet with three wingmates in a diamond. The jets fly forward automatically: W/S adjusts speed, A/D banks and turns, E/Q climbs and descends, B or Smoke toggles trails, and V switches chase, side and forward views. Touch and gamepad use the existing flight inputs. Places views and dialogs pause formation travel. Terrain/building clearance and an automatic turn back at the world edge keep the arcade flight within the scene. This is a playful airshow mode, not a flight simulator.
- Jet code loads only when selected or restored from a save. Four aircraft share four instanced material draws; all smoke uses one fixed indexed ribbon draw and a 64-sample ring per aircraft (12,240 bytes of trail arrays/indices). Exiting the mode disposes its geometry, instance bindings and materials. No downloaded models, textures or audio are added. Reduced motion starts with smoke off and suppresses visual banking.
- Searchable street atlas, click-to-travel map, 95 searchable destination shortcuts, radar, four time presets, mouse orbit, touch controls, gamepad input, and saved player position. Travel waits for destination geometry and colliders; a failed neighborhood load preserves the current position and offers a retry by selecting the place again.
- Photo mode (`P` or Photo) hides the interface, pauses travel, and lets you orbit or pinch around the current composition. Change light cycles the four presets; Back or Escape restores the controls and focus. Its roughly 1 KiB gzip module loads only when requested after the first interactive frame. Repeated visits reuse the same viewer and add no GPU resources.
- The night sky adds deterministic, filtered stars and a subtly cratered moon inside the existing sky draw. Daytime skips the night calculations. No new texture, model, render target or draw call is required.
- Stylized elevations and shoreline. This is a playful city interpretation, not a survey or navigation tool. Ambient road traffic, pedestrians, and transit from the Manhattan scene are not instantiated in Seattle.
- WebGPU rendering with WebGL 2 fallback (or append `?webgl` to request it explicitly), sky and environment lighting, and WebGPU cascaded sun shadows. Seattle uses a single color pass; inherited vehicle decal overrides for the original reflection pipeline are removed before compilation. WebGL player characters use uniform pose buffers with the original geometry and animation.

The original Manhattan app remains at `newyork.html`, with its source and regression tests preserved for upstream comparison. Each entry point supplies its geography through `configureCityRuntime` before constructing players or materials. Shared controls/shaders no longer download or parse Manhattan's geographic database when exploring Seattle. Standalone integrations of those shared modules must configure their city's runtime first; the New York entry supplies the original full configuration.

## Run and test

Install [Bun](https://bun.sh/) and [uv](https://docs.astral.sh/uv/), then:

```sh
bun install
bun run dev
```

The development server binds to `127.0.0.1:4178`. The deployed site needs only static file hosting; no build, API key, paid map tiles, or runtime geodata service is required. Three.js loads from a commit-pinned jsDelivr URL.

```sh
bun run test
bun run test:e2e
bun run test:boot
bun run test:photo
bun run test:north
bun run test:secrets
bun run test:eruption
bun run test:landmarks
bun run test:rendering
bun run test:blue
bun run test:avatar
```

The browser test uses installed Google Chrome and kit’s isolated test server/browser helpers. It checks the real control and map paths, records screenshots under ignored `tmp/`, and closes its browser and server. `test:boot` checks cold imports, shared New York landmark state, and keyboard recovery from an unavailable engine download. Seattle skips Manhattan landmark generation at startup and offers a focused Try again button if a module download fails. Tests never target the deployed site. Validation is recorded in [ACCEPTANCE.md](ACCEPTANCE.md).

Visual regression runs:

```sh
VISUAL_REVIEW=1 bun run test:e2e
E2E_BACKEND=webgl bun run test:e2e
```

The permanent suite limits all Seattle-specific JavaScript, including the 95-Place catalog, streamed architecture, regional loading, distance shading, discoveries, Blue Angels and selectable avatars, to **90 KiB gzip**. The preceding eruption release used 74,403 compressed bytes; the 76 additional sites have an explicit 16 KiB ceiling increase for sourced coordinates, recipes, lettering, loading and search. Plaid, jersey numbers and clothing detail are shaders; hair, mascot heads, landmarks and eruption effects use generated geometry, with no new textures. The engine remains pinned. Browser checks reject downloaded image/model assets, cap resident regions/effects and scene geometry, exercise failed travel/retry, revisit neighborhoods and repeatedly switch looks/modes/eruptions to check GPU/heap bounds, and verify the wheel cabins remain upright. Source gzip sizes are distinct from a host's HTTP compression and total page weight. Shadow tiles stay capped at 1536 px on desktop and 1024 px on narrow screens.

The implementation is split into `seattle-materials.js` (shader detail), `seattle-geometry.js` (generated geometry and batching), `seattle-landmarks.js` (architectural signatures), and `seattle-viewpoints.js` (occlusion-safe camera selection). Repeated static detail is merged by material; wheel cabins and trees are instanced.
The new catalog is generated by `bun run tools/build-seattle-landmark-catalog.mjs <City landmark query JSON>` from the curated choices in `tools/data/seattle-landmarks.json`. Save the complete [City landmark query](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/ArcGIS/rest/services/Landmarks/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=json) under ignored `tmp/` first. `seattle-landmark-stream.js` owns the bounded architecture pool, and `seattle-landmark-models.js` supplies its lazy procedural recipes.

Architecture references: [Space Needle](https://www.spaceneedle.com/about/), [Market clock and sign](https://www.pikeplacemarket.org/pike-place-market-clock-upgrade/), [Spheres structure](https://www.seattlespheres.com/explore-the-building), [Great Wheel cabins](https://seattlegreatwheel.com/faq), [Smith Tower](https://sah-archipedia.org/buildings/WA-01-033-0083), and [Lumen Field](https://crawfordarch.com/projects/lumen-field/). The models are stylized interpretations, not architectural replicas.

The jet is a stylized procedural interpretation of the Blue Angels' [Super Hornet aircraft and smoke equipment](https://www.blueangels.navy.mil/faq/) and [four-aircraft diamond formation](https://www.history.navy.mil/content/history/museums/nmusn/explore/photography/aircraft-us/aircraft-usn-blueangels/performance-maneuvers.html).

Controls: WASD or arrows to move; E/Space to climb or jump; Q/Shift to descend; 1–5 to change travel mode; V to cycle camera; M for the atlas. Drag to orbit and scroll to zoom. In Blue Angels mode, B toggles smoke and W/S controls forward speed.

Discovery references include the Seahawks' [12 flag tradition and fan quakes](https://www.seahawks.com/fans/the-12s/), [MOPOP's grunge collection](https://www.mopop.org/collection), Seattle's [Hat 'n' Boots](https://www.seattle.gov/parks/parks/oxbow-park), [Waiting for the Interurban](https://archives.seattle.gov/digital-collections/index.php/Detail/objects/162258), the [Pacific banana slug](https://www.pugetsound.edu/puget-sound-museum-natural-history/exhibits/terrestrial-panel/banana-slug) and [geoduck](https://wdfw.wa.gov/species-habitats/species/panopea-generosa). The temporary scenes are playful tributes, not exact replicas or a map of their real locations.

## Refresh Seattle data

Save an Overpass JSON response using the query in `tools/data/seattle.overpassql`, then run:

```sh
bun run data:seattle tmp/seattle-osm.json
```

Review the resulting data diff and run both checks before publishing. The converter rejects incomplete and unexpectedly sparse responses. It imports OSM ways; relation-only buildings and building interiors are outside this snapshot.

To refresh the north snapshot from the public City GIS services:

```sh
bun run data:north:fetch --metadata
bun run data:north:fetch buildings roads parks shore water
bun run data:north
bun run test
bun run test:e2e
bun run test:north
```

Raw paginated responses are cached under ignored `tmp/codex-north-source/`; clear that cache before requesting a fresh snapshot. The compiler keeps sub-metre footprint precision, estimates unrecorded heights, preserves courtyard/lake holes, and simplifies shorelines to 4–5 m. It writes gzip files directly so ordinary static hosting needs no compression configuration. All runtime geometry, materials, signs and details are generated from code and coordinates; the app never queries a geographic service.

Explore other community remixes in [Slop Cities](https://github.com/zz85/slop-cities).

## License and data

Additional landmark coordinates, names and designation numbers in `js/seattle-landmark-catalog.js` come from the City's [Landmarks point layer](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/ArcGIS/rest/services/Landmarks/FeatureServer/0), with City source attribution and terms. Authored dimensions, geometric models and lettering are project code.

The project code is available under the [MIT License](LICENSE).

Seattle geographic data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL](https://opendatacommons.org/licenses/odbl/). The derived Seattle database is distributed in `js/seattle-data.json` under ODbL; this does not change the MIT license of the program code.

North geographic data: City of Seattle, Enterprise Data, published through [Seattle GIS Open Data](https://data-seattlecitygis.opendata.arcgis.com/): [Building Outlines 2023](https://www.arcgis.com/home/item.html?id=1ea2f226716e417e8a554476f4337c51), Seattle Streets, Parks Boundary (outline), Shoreline, and Waterlines/Channels. The building outlines were drawn from 2023 Eagleview imagery; no imagery is bundled. The City publishes these data without a warranty of accuracy. Source terms and attribution remain applicable to `js/seattle-north/` and `js/seattle-waterways.js`; these data are not relicensed as MIT or ODbL. [USACE lock inventory](https://services7.arcgis.com/n1YM8pTrFmm7L4hs/ArcGIS/rest/services/Locks/FeatureServer/0) supplies the Ballard Locks location and chamber dimensions. [Seattle Parks](https://www.seattle.gov/parks/parks/gas-works-park), [Troll’s Knoll](https://www.seattle.gov/parks/parks/trolls-knoll-park) and [Fremont’s walking guide](https://fremont.com/wp-content/uploads/2023/02/2020_WalkingGuide_Final-reduced.pdf) informed stylized landmark signatures.

Retained upstream Manhattan data: NYC Open Data (including [building footprints and heights](https://data.cityofnewyork.us/City-Government/BUILDING/5zhs-2jue) and [tree locations](https://data.cityofnewyork.us/Environment/Forestry-Tree-Points/hn5i-inap)), [MTA subway entrances](https://data.ny.gov/Transportation/MTA-Subway-Entrances-and-Exits-2024/i9wp-a4ja), and OpenStreetMap. Third-party data and dependencies retain their respective licenses.
