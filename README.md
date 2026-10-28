# Slop Seattle

A Seattle remix of [mrdoob’s Slop New York](https://github.com/mrdoob/slop-newyork), built with three.js, WebGPURenderer, and TSL. Walk, drive, cycle, or fly through downtown Seattle, Seattle Center, Pioneer Square, South Lake Union, and SoDo.

[Play Slop Seattle](https://treycausey.github.io/slop-seattle/)

## Seattle

- A bundled OpenStreetMap snapshot: 4,490 building footprints, 2,317 road segments, and 51 parks. Tagged heights are used when available; missing heights receive deterministic estimates.
- Custom Space Needle, Pike Place Market, Great Wheel, Columbia Center, Smith Tower, Spheres, and Lumen Field models. Elliott Bay ferries, evergreen trees, and distant mountain silhouettes.
- Searchable street atlas, click-to-travel map, eight destination shortcuts, radar, four time presets, mouse orbit, touch controls, gamepad input, and saved player position.
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
```

The browser test uses installed Google Chrome and kit’s isolated test server/browser helpers. It checks the real control and map paths, records screenshots under ignored `tmp/`, and closes its browser and server. Tests never target the deployed site. Validation is recorded in [ACCEPTANCE.md](ACCEPTANCE.md).

Controls: WASD or arrows to move; E/Space to climb or jump; Q/Shift to descend; 1–4 to change travel mode; V to cycle camera; M for the atlas. Drag to orbit and scroll to zoom.

## Refresh Seattle data

Save an Overpass JSON response using the query in `tools/data/seattle.overpassql`, then run:

```sh
bun run data:seattle tmp/seattle-osm.json
```

Review the resulting data diff and run both checks before publishing. The converter rejects incomplete and unexpectedly sparse responses. It imports OSM ways; relation-only buildings and building interiors are outside this snapshot.

Explore other community remixes in [Slop Cities](https://github.com/zz85/slop-cities).

## License and data

The project code is available under the [MIT License](LICENSE).

Seattle geographic data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL](https://opendatacommons.org/licenses/odbl/). The derived Seattle database is distributed in `js/seattle-data.json` under ODbL; this does not change the MIT license of the program code.

Retained upstream Manhattan data: NYC Open Data (including [building footprints and heights](https://data.cityofnewyork.us/City-Government/BUILDING/5zhs-2jue) and [tree locations](https://data.cityofnewyork.us/Environment/Forestry-Tree-Points/hn5i-inap)), [MTA subway entrances](https://data.ny.gov/Transportation/MTA-Subway-Entrances-and-Exits-2024/i9wp-a4ja), and OpenStreetMap. Third-party data and dependencies retain their respective licenses.
