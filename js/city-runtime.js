// Entry points supply geography before constructing players/materials.
// Shared rendering and controls never import a geographic database.
export let ISLAND_BOUNDS, CENTRAL_PARK_BOUNDS, getIslandBoundsAtZ,
  NJ_SHORELINE_POLYGON, LONG_ISLAND_POLYGONS, streetZ, blockAt;
export function configureCityRuntime(config) {
  ({ISLAND_BOUNDS,CENTRAL_PARK_BOUNDS,getIslandBoundsAtZ,
    NJ_SHORELINE_POLYGON,LONG_ISLAND_POLYGONS,streetZ,blockAt}=config);
}
