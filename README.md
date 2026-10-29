# Slop Seattle

A Seattle remix of [mrdoob’s Slop New York](https://github.com/mrdoob/slop-newyork), built with three.js, WebGPURenderer, and TSL. Walk, drive, cycle, or fly from downtown and SoDo through Fremont, Ballard, Wallingford, Phinney Ridge, Green Lake, Greenwood and Crown Hill.

[Play Slop Seattle](https://treycausey.github.io/slop-seattle/)

## Seattle

- A bundled OpenStreetMap snapshot: 4,490 building footprints, 2,317 road segments, and 51 parks. Tagged heights are used when available; missing heights receive deterministic estimates.
- North Seattle adds 82,435 surveyed building footprints and 8,135 street paths from City of Seattle GIS, with estimated heights, preserved courtyard holes, pitched house roofs, terrain-following park surfaces and surveyed waterways. Ten new Places include Fremont Troll and Rocket, Gas Works, Ballard Locks and Avenue, Good Shepherd Center, Green Lake, Greenwood, Phinney Center and Golden Gardens. Fremont, Ballard, Aurora and University bridges have continuous travel decks.
- North footprints are split into 87 independently compressed 1 km regions: under 4.65 MiB for all footprint regions, at most 120 KiB per region, and under 5 MiB including the atlas and overview. Only four full regions remain resident, with one load/build job in flight. Geometry is built in small batches across animation frames, then released with its colliders and GPU bindings when evicted. A 56 KiB instanced distant skyline loads after the first interactive frame; the 224 KiB street atlas loads when opened. The core downtown data stays available.
- Procedural landmark architecture: the Space Needle’s paired curved legs and glazed saucer; Pike Place Market’s arcade, striped stalls, rooftop neon and analog clock; the Great Wheel’s twin rim and 42 upright cabins; Columbia Center’s curved stepped lobes; Smith Tower’s terra-cotta shaft and copper crown; the Spheres’ glass, lattice, and indoor foliage; Lumen Field’s roof arches, seating, and marked field. Elliott Bay ferries, tiered evergreens, and distant mountain silhouettes.
- Procedural PBR materials: weathered asphalt and puddles, jointed sidewalks, brick/stone/glass facade palettes, dark gravel roofs with rooftop plant, oxidized copper, timber grain, filtered lawn detail, and animated water normals. Signs, clock faces, awning stripes, and field markings are drawn into canvas textures at startup. No texture images or model files are downloaded.
- Nearby detail streams into nine recycled tiles: slatted benches, street lamps, cycle stands, planters and trees, bins, parked cars, footprint-following parapets, entrances and rooftop equipment. Shared geometry and instanced materials cap added matrix buffers at 0.85 MiB; distant base architecture remains available. [Detail API and measured performance](DETAILS.md).
- Places now composes an architectural view and rejects camera paths blocked by neighboring buildings. Moving returns to the follow camera; V can cycle back to the selected Place view.
- Searchable street atlas, click-to-travel map, 18 destination shortcuts, radar, four time presets, mouse orbit, touch controls, gamepad input, and saved player position. Travel waits for destination geometry and colliders; a failed load preserves the current position and offers a retry by selecting the place again.
- Stylized elevations and shoreline. This is a playful city interpretation, not a survey or navigation tool. Ambient road traffic, pedestrians, and transit from the Manhattan scene are not instantiated in Seattle.
- WebGPU rendering with WebGL 2 fallback (or append `?webgl` to request it explicitly), sky and environment lighting, and WebGPU cascaded sun shadows. Seattle uses a single color pass; inherited vehicle decal overrides for the original reflection pipeline are removed before compilation. WebGL player characters use uniform pose buffers with the original geometry and animation.

The original Manhattan app remains at `newyork.html`, with its source and regression tests preserved for upstream comparison.

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
bun run test:north
```

The browser test uses installed Google Chrome and kit’s isolated test server/browser helpers. It checks the real control and map paths, records screenshots under ignored `tmp/`, and closes its browser and server. Tests never target the deployed site. Validation is recorded in [ACCEPTANCE.md](ACCEPTANCE.md).

Visual regression runs:

```sh
VISUAL_REVIEW=1 bun run test:e2e
E2E_BACKEND=webgl bun run test:e2e
```

The permanent suite limits all Seattle-specific JavaScript, including waterway coordinates, to **44 KiB gzip**. The preceding detail release used 28,465 bytes; the north expansion adds the regional loader, ten landmarks, bridge decks, water boundaries and map changes within the new budget. The engine remains pinned. Browser checks reject downloaded image/model assets, cap resident regions and scene geometry, exercise failed travel/retry, revisit neighborhoods to check GPU/heap bounds, and verify the wheel cabins remain upright. Source gzip sizes are distinct from a host’s HTTP compression and total page weight. Seattle also caps shadow tiles at 1536 px on desktop and 1024 px on narrow screens to reduce the inherited atlas allocation.

The implementation is split into `seattle-materials.js` (shader detail), `seattle-geometry.js` (generated geometry and batching), `seattle-landmarks.js` (architectural signatures), and `seattle-viewpoints.js` (occlusion-safe camera selection). Repeated static detail is merged by material; wheel cabins and trees are instanced.

Architecture references: [Space Needle](https://www.spaceneedle.com/about/), [Market clock and sign](https://www.pikeplacemarket.org/pike-place-market-clock-upgrade/), [Spheres structure](https://www.seattlespheres.com/explore-the-building), [Great Wheel cabins](https://seattlegreatwheel.com/faq), [Smith Tower](https://sah-archipedia.org/buildings/WA-01-033-0083), and [Lumen Field](https://crawfordarch.com/projects/lumen-field/). The models are stylized interpretations, not architectural replicas.

Controls: WASD or arrows to move; E/Space to climb or jump; Q/Shift to descend; 1–4 to change travel mode; V to cycle camera; M for the atlas. Drag to orbit and scroll to zoom.

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

The project code is available under the [MIT License](LICENSE).

Seattle geographic data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL](https://opendatacommons.org/licenses/odbl/). The derived Seattle database is distributed in `js/seattle-data.json` under ODbL; this does not change the MIT license of the program code.

North geographic data: City of Seattle, Enterprise Data, published through [Seattle GIS Open Data](https://data-seattlecitygis.opendata.arcgis.com/): [Building Outlines 2023](https://www.arcgis.com/home/item.html?id=1ea2f226716e417e8a554476f4337c51), Seattle Streets, Parks Boundary (outline), Shoreline, and Waterlines/Channels. The building outlines were drawn from 2023 Eagleview imagery; no imagery is bundled. The City publishes these data without a warranty of accuracy. Source terms and attribution remain applicable to `js/seattle-north/` and `js/seattle-waterways.js`; these data are not relicensed as MIT or ODbL. [USACE lock inventory](https://services7.arcgis.com/n1YM8pTrFmm7L4hs/ArcGIS/rest/services/Locks/FeatureServer/0) supplies the Ballard Locks location and chamber dimensions. [Seattle Parks](https://www.seattle.gov/parks/parks/gas-works-park), [Troll’s Knoll](https://www.seattle.gov/parks/parks/trolls-knoll-park) and [Fremont’s walking guide](https://fremont.com/wp-content/uploads/2023/02/2020_WalkingGuide_Final-reduced.pdf) informed stylized landmark signatures.

Retained upstream Manhattan data: NYC Open Data (including [building footprints and heights](https://data.cityofnewyork.us/City-Government/BUILDING/5zhs-2jue) and [tree locations](https://data.cityofnewyork.us/Environment/Forestry-Tree-Points/hn5i-inap)), [MTA subway entrances](https://data.ny.gov/Transportation/MTA-Subway-Entrances-and-Exits-2024/i9wp-a4ja), and OpenStreetMap. Third-party data and dependencies retain their respective licenses.
