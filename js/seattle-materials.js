import * as THREE from "three/webgpu";
import { distantSurface } from "./seattle-facade-lod.js";
import {
  Fn,
  float,
  vec2,
  color,
  uniform,
  positionWorld,
  normalWorldGeometry,
  time,
  sin,
  abs,
  fract,
  floor,
  mix,
  smoothstep,
  length,
  fwidth,
  If,
  cameraPosition,
  normalViewGeometry,
} from "three/tsl";
import {
  bumpNormal,
  noise2D,
  hash2D,
  filteredPulse,
  createCurtainWallMaterial,
  createPreWarBuildingMaterial,
  createRoadSurfaceMaterial,
  createSidewalkMaterial,
  createParkLawnMaterial,
  enableSeattleInteriorLOD,
} from "./tsl-materials.js";

const cache = new Map();
// All dimensions are metres. Filter subpixel grain instead of letting it sparkle from the air.
export function surface(kind, tint, metalness = 0) {
  const key = `${kind}:${tint}:${metalness}`;
  if (cache.has(key)) return cache.get(key);
  const mat = new THREE.MeshStandardNodeMaterial({ color: tint, metalness, roughness: 0.72 });
  const base = uniform(new THREE.Color(tint));
  const coords = Fn(() => {
    const n = abs(normalWorldGeometry);
    return n.y
      .greaterThan(0.6)
      .select(positionWorld.xz, n.x.greaterThan(0.6).select(positionWorld.zy, positionWorld.xy));
  });
  const relief = Fn(() => {
    const p = coords(),
      pixel = length(fwidth(p));
    const grain = float(0).toVar();
    If(pixel.lessThan(0.12),()=>grain.assign(noise2D(p.mul(kind==="metal"?70:22)).sub(0.5).mul(smoothstep(0.12,0.015,pixel))));
    if (kind === "timber")
      return sin(p.x.mul(35).add(noise2D(p.mul(vec2(0.3, 5))).mul(6)))
        .mul(0.002)
        .add(grain.mul(0.002));
    if (kind === "copper" || kind === "roof")
      return smoothstep(0.03, 0, abs(fract(p.x.div(1.4)).sub(0.5)))
        .mul(0.012)
        .add(grain.mul(0.001));
    if (kind === "paving") return grain.mul(0.002);
    return grain.mul(kind === "metal" ? 0.0007 : 0.004);
  });
  mat.colorNode = Fn(() => {
    const p = coords(),
      pixel = length(fwidth(p));
    const macro = noise2D(p.mul(0.7)),fine=float(0.5).toVar();
    If(pixel.lessThan(0.1),()=>fine.assign(mix(float(0.5),noise2D(p.mul(32)),smoothstep(0.1,0.018,pixel))));
    let tone = macro.mul(0.12).add(fine.mul(0.06)).add(0.86);
    if (kind === "copper")
      tone = mix(float(0.68), float(1.18), noise2D(p.mul(2.4)).mul(0.7).add(macro.mul(0.3)));
    if (kind === "timber")
      tone = tone.mul(
        sin(p.x.mul(18).add(macro.mul(8)))
          .mul(0.08)
          .add(0.92),
      );
    if (kind === "paving") tone = tone.mul(noise2D(p.mul(0.04)).mul(0.12).add(0.88));
    return base.mul(tone);
  })();
  mat.normalNode = bumpNormal(relief());
  mat.roughnessNode = Fn(() =>
    noise2D(coords().mul(3))
      .mul(0.12)
      .add(metalness > 0.4 ? 0.28 : kind === "roof" ? 0.65 : 0.74),
  )();
  cache.set(key, mat);
  return distantSurface(mat,tint);
}

export function createSeattleWater() {
  const mat = new THREE.MeshStandardNodeMaterial({ metalness: 0.2, roughness: 0.22 });
  const wave = Fn(() => {
    const p = positionWorld.xz,
      pixel = length(fwidth(p));
    return sin(p.x.mul(0.24).add(p.y.mul(0.13)).add(time.mul(0.75)))
      .mul(0.11)
      .mul(smoothstep(2, 0.3, pixel.mul(0.24)))
      .add(
        sin(p.x.mul(0.49).sub(p.y.mul(0.31)).sub(time.mul(1.1)))
          .mul(0.04)
          .mul(smoothstep(2, 0.3, pixel.mul(0.5))),
      )
      .add(
        sin(p.x.mul(1.4).add(p.y.mul(1.9)).add(time.mul(1.7)))
          .mul(0.012)
          .mul(smoothstep(2, 0.3, pixel.mul(1.9))),
      );
  });
  mat.normalNode = bumpNormal(wave());
  mat.colorNode = Fn(() => {
    const p = positionWorld.xz,
      gust = noise2D(p.mul(0.012).add(time.mul(0.004)));
    const crest = smoothstep(0.965, 0.995, sin(p.x.mul(0.24).add(p.y.mul(0.13)).add(time.mul(0.75))))
      .mul(smoothstep(0.62, 0.85, noise2D(p.mul(vec2(0.12, 0.45)))))
      .mul(smoothstep(1.5, 0.15, length(fwidth(p))));
    return mix(mix(color(0x163e47), color(0x3c6970), gust.mul(0.7).add(0.15)), color(0x96b4ad), crest.mul(0.45));
  })();
  mat.roughnessNode = Fn(() => noise2D(positionWorld.xz.mul(0.018)).mul(0.13).add(0.17))();
  return mat;
}

// Several palettes share the existing two facade shader families, retaining batching.
export function createSeattleFacades() {
  const glass = [0x304b59, 0x566e71, 0x3e6260].map((glassTint, i) =>
    createCurtainWallMaterial({
      glassTint,
      frameTint: 0x25323a,
      windowWidth: 2.2 + i * 0.45,
      floorHeight: 3.6,
      seed: 11 + i,
    }),
  );
  const masonry = [0xc2b69f, 0x9c6d54, 0x775347, 0xd4ccc0, 0xa6a29a].map((stoneColor, i) => {
    const mat = createPreWarBuildingMaterial({
      stoneColor,
      trimColor: 0x847f73,
      windowWidth: 2.1 + (i % 3) * 0.35,
      floorHeight: 3.3,
      windowRatioX: 0.52,
      windowRatioY: 0.66,
      seed: 30 + i,
    });
    const original = mat.colorNode;
    mat.colorNode = Fn(() => {
      const p = positionWorld,
        n = abs(normalWorldGeometry),
        u = n.x.greaterThan(0.5).select(p.z, p.x);
      const row = floor(p.y.div(0.24)),
        brick = vec2(u.add(row.mod(2).mul(0.23)).div(0.46), p.y.div(0.24));
      const fw = fwidth(brick).max(0.001);
      const mortar = filteredPulse(fract(brick.x), 0.025, 0.975, fw.x).mul(
        filteredPulse(fract(brick.y), 0.06, 0.94, fw.y),
      );
      const brickTone = hash2D(floor(brick)).mul(0.1).add(0.93);
      const textured = original.mul(mix(float(0.9), brickTone, mortar));
      return n.y
        .greaterThan(0.7)
        .select(color(0x555b5b).mul(noise2D(p.xz.mul(0.8)).mul(0.12).add(0.9)), textured);
    })();
    return mat;
  });
  for (const mat of glass) {
    const old = mat.colorNode;
    mat.colorNode = Fn(() =>
      abs(normalWorldGeometry.y)
        .greaterThan(0.7)
        .select(color(0x4b5456).mul(noise2D(positionWorld.xz.mul(0.8)).mul(0.12).add(0.9)), old),
    )();
  }
  const all = [...glass, ...masonry];
  for (const mat of all) {
    const rough = mat.roughnessNode ?? float(mat.roughness),
      metal = mat.metalnessNode ?? float(mat.metalness);
    mat.roughnessNode = abs(normalWorldGeometry.y).greaterThan(0.7).select(0.9, rough);
    mat.metalnessNode = abs(normalWorldGeometry.y).greaterThan(0.7).select(0, metal);
    const detailedNormal=mat.normalNode;
    mat.normalNode=Fn(()=>{
      const result=normalViewGeometry.toVar();
      // Existing facade bump already fades to exactly zero at 150 m; avoid evaluating it there.
      If(length(positionWorld.sub(cameraPosition)).lessThan(150),()=>result.assign(detailedNormal));
      return result;
    })();
  }
  return all;
}

export function createSeattlePalette() {
  enableSeattleInteriorLOD();
  const flatRoof=new THREE.MeshStandardNodeMaterial({color:0x52595a,roughness:0.9});
  flatRoof.colorNode=color(0x52595a).mul(noise2D(positionWorld.xz.mul(0.8)).mul(0.12).add(0.9));
  const grass = createParkLawnMaterial();
  grass.colorNode = Fn(() => {
    const p = positionWorld.xz,
      pixel = length(fwidth(p));
    const macro = noise2D(p.mul(0.035)),
      fine = mix(float(0.5), noise2D(p.mul(2.7)), smoothstep(0.6, 0.08, pixel));
    return mix(color(0x31532b), color(0x55783c), macro.mul(0.65).add(fine.mul(0.18)));
  })();
  return {
    asphalt: distantSurface(createRoadSurfaceMaterial(),0x55575a),
    paving: distantSurface(createSidewalkMaterial(),0x99938a),
    grass:distantSurface(grass,0x456136),
    water: createSeattleWater(),
    limestone: surface("stone", 0xd9d3bf),
    white: surface("metal", 0xe2e4d9, 0.38),
    steel: surface("metal", 0x818c8b, 0.7),
    dark: surface("metal", 0x263c45, 0.55),
    copper: surface("copper", 0x5b8b73, 0.5),
    timber: surface("timber", 0x887458),
    roof: surface("roof", 0x884c3d, 0.25),
    blueRoof: surface("roof", 0x9caeba, 0.5),
    concrete: surface("stone", 0xaaa99c),
    ground: surface("paving", 0x7e827a),
    flatRoof:distantSurface(flatRoof,0x52595a),
    leaf: surface("stone", 0x315d41),
  };
}
