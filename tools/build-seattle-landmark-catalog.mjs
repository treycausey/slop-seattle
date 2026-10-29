// Rebuild with the City's complete Landmarks point query saved as the supplied JSON file.
// Source: https://services.arcgis.com/ZOyb2t4B0UYuYNYH/ArcGIS/rest/services/Landmarks/FeatureServer/0
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { project, shoreAt, isLand, bridgeAt, DESTINATIONS } from '../js/seattle-config.js';
import { nearestRoad } from '../js/seattle-map.js';
const choices=JSON.parse(readFileSync(new URL('./data/seattle-landmarks.json',import.meta.url)));
const source=JSON.parse(readFileSync(process.argv[2]));
const core=JSON.parse(readFileSync(new URL('../js/seattle-data.json',import.meta.url)));
const north=JSON.parse(gunzipSync(readFileSync(new URL('../js/seattle-north/atlas.json.gz',import.meta.url))));
const roads=[...core.roads,...north.roads].flatMap(r=>r.points.slice(1).flatMap((b,i)=>{
  const a=r.points[i];
  return [a,b].every(([x,z])=>x>shoreAt(z).westX+10&&(isLand(x,z)||bridgeAt(x,z)))?[{...r,points:[a,b]}]:[];
}));
if(choices.length!==76)throw new Error(`Expected 76 additions; got ${choices.length}`);
const rows=choices.map(([id,name,area,kind,w,h,d,signature])=>{
  const feature=source.features.find(f=>f.attributes.NAME===name);
  if(!feature)throw new Error(`City landmark missing: ${name}`);
  const {x:lon,y:lat}=feature.geometry;
  const site=project(lat,lon),arrival=nearestRoad({roads},site.x,site.z+d/2+30);
  if(arrival.x<shoreAt(arrival.z).westX+8)throw new Error(`${name}: arrival outside playable coast`);
  return {id,name:name.replace(/\s+/g,' ').trim(),area,kind,w,h,d,signature,lat:+lat.toFixed(6),lon:+lon.toFixed(6),source:feature.attributes.LANDNO,
    arrival:[+arrival.x.toFixed(2),+arrival.z.toFixed(2),+arrival.heading.toFixed(5)]};
});
writeFileSync(new URL('../js/seattle-landmark-catalog.js',import.meta.url),
  '// City of Seattle landmark point snapshot, 2026-10-29. Stylized dimensions and architectural recipes.\n'+
  'export const LANDMARK_CATALOG = '+JSON.stringify(rows,null,2)+';\n');
console.log(`Wrote ${rows.length} sourced landmarks`);
writeFileSync(new URL('../LANDMARKS.md',import.meta.url),
  '# Seattle landmark catalog\n\n95 permanent Places: the original 19 plus 76 additions. The architectural model count grows from 17 to 93; Lake Union and the Rainier overlook remain landscape views. The four existing canal bridges and 31 Easter eggs are separate from this count.\n\n'+
  'Open **Places** and search a landmark or neighborhood. All sites have arrival points on the bundled street survey and a composed camera view. Models are stylized interpretations with shared architectural recipes, individual dimensions, roof/tower features and geometric lettering; they are not exact building replicas.\n\n'+
  'The additions use the [City of Seattle designated landmark point layer](https://services.arcgis.com/ZOyb2t4B0UYuYNYH/ArcGIS/rest/services/Landmarks/FeatureServer/0). Coordinates and source landmark numbers were captured on 2026-10-29. Dimensions and visual descriptions are authored for this scene.\n\n'+
  '## Original Places\n\n'+DESTINATIONS.filter(d=>!d.kind).map(d=>`- ${d.name} — ${d.area}`).join('\n')+'\n\n'+
  '## Added landmarks\n\n| Landmark | Neighborhood | Visible signature | City landmark number |\n| --- | --- | --- | ---: |\n'+
  rows.map(d=>`| ${d.name} | ${d.area} | ${d.signature} | ${d.source} |`).join('\n')+'\n\n'+
  '## Loading\n\nThe detailed model module is imported after the first interactive frame. At most eight detailed sites are resident. At most one site is built per frame; resident geometry is combined by shared material and disposed on eviction. Detached replacements compile asynchronously with the real scene lighting before they appear; old detail or coarse silhouettes remain available while they prepare. One shared compilation queue also prepares geographic regions before arrival. All 76 additions retain instanced distant silhouettes. No images, models, fonts, or per-building textures are downloaded.\n');
