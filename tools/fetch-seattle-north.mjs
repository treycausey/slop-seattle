// Reproducible offline snapshot fetch. Runtime never contacts these services.
import { guardedFetch } from "@treycausey/kit/fetch";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const base =
  "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/ArcGIS/rest/services/";
const directory = new URL("../tmp/codex-north-source/", import.meta.url);
mkdirSync(directory, { recursive: true });
async function json(url) {
  const r = await guardedFetch(url, {
    maxBytes: 20 * 1024 * 1024,
    timeoutMs: 60000,
  });
  const d = JSON.parse(new TextDecoder().decode(r.bytes));
  if (d.error) throw new Error(JSON.stringify(d.error));
  return d;
}
const services = {
  buildings: ["Building_Outlines_2023", 0],
  roads: ["Seattle_Streets_1", 0],
  parks: ["Park_Boundary_(outline)", 1],
  shore: ["Shoreline", 0],
  water: ["Waterlines_Channels_proj", 67],
};
if (process.argv.includes("--metadata")) {
  for (const [key, [name, layer]] of Object.entries(services)) {
    const d = await json(
      `${base}${encodeURIComponent(name)}/FeatureServer/${layer}?f=json`,
    );
    writeFileSync(
      new URL(`${key}-metadata.json`, directory),
      JSON.stringify(d),
    );
    console.log(
      JSON.stringify({
        key,
        type: d.geometryType,
        fields: d.fields?.map((f) => f.name),
        description: d.description?.slice(0, 200),
      }),
    );
  }
} else {
  for (const key of process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["buildings", "roads", "parks"]) {
    const metadata = JSON.parse(
      readFileSync(new URL(`${key}-metadata.json`, directory), "utf8"),
    );
    const envelope = {
      xmin: -122.415,
      ymin: 47.631,
      xmax: -122.3,
      ymax: 47.705,
      spatialReference: { wkid: 4326 },
    };
    const fields =
      key === "buildings"
        ? "OBJECTID,OUTLINE_ID,AREA"
        : key === "roads"
          ? "OBJECTID,UNITDESC,STNAME_ORD,ONSTREET,SURFACEWIDTH,ARTCLASS,STREETTYPE,SLOPE_PCT"
          : "*";
    const size = Math.min(2000, metadata.maxRecordCount ?? 2000),
      features = [];
    for (let offset = 0; ; offset += size) {
      const file = new URL(`${key}-${offset}.json`, directory);
      let page;
      if (existsSync(file)) page = JSON.parse(readFileSync(file, "utf8"));
      else {
        const params = new URLSearchParams({
          f: "json",
          where: "1=1",
          geometry: JSON.stringify(envelope),
          geometryType: "esriGeometryEnvelope",
          inSR: "4326",
          spatialRel: "esriSpatialRelIntersects",
          outSR: "4326",
          outFields: fields,
          returnGeometry: "true",
          orderByFields: "OBJECTID",
          resultOffset: String(offset),
          resultRecordCount: String(size),
        });
        const [name, layer] = services[key];
        page = await json(
          `${base}${encodeURIComponent(name)}/FeatureServer/${layer}/query?${params}`,
        );
        writeFileSync(file, JSON.stringify(page));
      }
      features.push(...page.features);
      console.log(`${key}: ${features.length}`);
      if (!page.exceededTransferLimit || page.features.length === 0) break;
    }
    writeFileSync(
      new URL(`${key}.json`, directory),
      JSON.stringify({ source: services[key], features }),
    );
  }
}
