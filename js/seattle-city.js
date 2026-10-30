import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  BOUNDS,
  CORE_BOUNDS,
  DESTINATIONS,
  heightAt,
  terrainHeightAt,
  project,
  isLand,
  WATERWAYS,
  landmarkReplacesFootprint,
} from "./seattle-config.js";
import { polygonContains } from "./building-collision.js";
import { parkBuffers, TERRAIN_STEP } from './seattle-park-buffers.js';
import {
  createSeattlePalette,
  createSeattleFacades,
  surface,
} from "./seattle-materials.js";
import { mesh, box, cylinder, batchStatic, batchShadows } from "./seattle-geometry.js";
import { buildSeattleLandmarks } from "./seattle-landmarks.js";
import { createSeattleDetails } from "./seattle-details.js";
import { buildNorthLandmarks } from "./seattle-north-landmarks.js";
import { pitchedRoofPositions } from "./seattle-roofs.js";
import { createRainier } from "./seattle-rainier.js";
import { buildingBuffers } from "./seattle-building-buffers.js";
import { createDistantFacades, applyFacadeLOD } from "./seattle-facade-lod.js";
import { createDistrictLandmarks } from "./seattle-landmark-stream.js";
import { siteIndex, facadeTreatment } from './seattle-site-index.js';
import { groveSites } from './seattle-grove-plan.js';
import { createGroves } from './seattle-groves.js';
import {disposeStreetSigns} from './seattle-shopfronts.js';

function extrude(ring, height, base = 0, holes = [],wallInfo) {
  const parts=buildingBuffers(ring,holes,height,base,(outer,inner)=>THREE.ShapeUtils.triangulateShape(outer.map(([x,z])=>new THREE.Vector2(x,z)),inner.map(r=>r.map(([x,z])=>new THREE.Vector2(x,z)))),wallInfo);
  return Object.fromEntries(Object.entries(parts).map(([key,p])=>{
    const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(p.positions,3));g.setAttribute("normal",new THREE.Float32BufferAttribute(p.normals,3));g.setIndex(p.indices);
    // Wall dimensions/palette phase are rendering metadata; half floats halve this attribute's CPU storage.
    // Surveyed positions and the original decoded data remain full precision.
    if(p.box){g.setAttribute('box',new THREE.Float16BufferAttribute(p.box.map(n=>THREE.DataUtils.toHalfFloat(n)),4));g.setAttribute('facadeWall',new THREE.Float32BufferAttribute(p.facadeWall,3));}return [key,g];
  }));
}
function ribbon(points, width, offset = 0.1) {
  const positions = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = Math.hypot(dx, dz);
    if (len < 0.1) continue;
    const nx = ((-dz / len) * width) / 2,
      nz = ((dx / len) * width) / 2,
      steps = Math.ceil(len / 18);
    for (let j = 0; j < steps; j++) {
      const p = [a[0] + (dx * j) / steps, a[1] + (dz * j) / steps],
        q = [a[0] + (dx * (j + 1)) / steps, a[1] + (dz * (j + 1)) / steps];
      const corners = [
        [p[0] - nx, p[1] - nz],
        [p[0] + nx, p[1] + nz],
        [q[0] + nx, q[1] + nz],
        [q[0] - nx, q[1] - nz],
      ];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const [x, z] = corners[k];
        positions.push(x, heightAt(x, z) + offset, z);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}
function architecturalColliders(landmarks) {
  const out = [];
  const add = (g, x, z, w, d, y, h) => {
    const cs = Math.cos(g.rotation.y),
      sn = Math.sin(g.rotation.y),
      cx = g.position.x + x * cs + z * sn,
      cz = g.position.z - x * sn + z * cs,
      hx = w / 2,
      hz = d / 2;
    const ex = Math.abs(cs) * hx + Math.abs(sn) * hz,
      ez = Math.abs(sn) * hx + Math.abs(cs) * hz;
    out.push({
      minX: cx - ex,
      maxX: cx + ex,
      minZ: cz - ez,
      maxZ: cz + ez,
      minY: g.position.y + y,
      maxY: g.position.y + y + h,
      obb: { cx, cz, hx, hz, cs, sn },
      landmark: g.name,
    });
  };
  for (const g of landmarks) {
    const id = DESTINATIONS.find((d) => d.name === g.name).id;
    const catalog = DESTINATIONS.find(d => d.id === id && d.kind);
    if(catalog && !['spring','terrace','railbridge','courtyard','clock'].includes(catalog.kind))
      add(g,0,0,catalog.w,catalog.d,0,catalog.h);
    if(catalog?.kind==='courtyard'){
      for(const side of [-1,1])add(g,side*catalog.w*.38,0,catalog.w*.24,catalog.d,0,catalog.h);
      add(g,0,-catalog.d*.38,catalog.w,catalog.d*.24,0,catalog.h);
    }
    if (id === "needle") {
      add(g, 0, 0, 39, 39, 0, 5);
      add(g, 0, 0, 6, 6, 5, 141);
      add(g, 0, 0, 42, 42, 146, 22);
      add(g, 0, 0, 4, 4, 168, 16);
    }
    if (id === "market") add(g, 0, -3, 96, 25, 0, 15);
    if (id === "columbia")
      for (const [x, z, w, d, h] of [
        [-19, 3, 31, 48, 284],
        [4, 0, 31, 48, 273],
        [25, -3, 24, 48, 258],
      ])
        add(g, x, z, w, d, 0, h);
    if (id === "smith") {
      add(g, 0, 0, 39, 35, 0, 34);
      add(g, 0, 0, 27, 28, 34, 108);
    }
    if (id === "spheres")
      for (const [x, r] of [
        [-24, 15],
        [0, 20],
        [25, 14],
      ])
        add(g, x, 0, r * 1.8, r * 1.8, 0, r * 1.64);
    if (id === "stadium")
      for (const side of [-1, 1]) {
        add(g, side * 62, 0, 58, 190, 0, 25);
        add(g, 0, side * 108, 60, 30, 0, 20);
      }
    if (id === "troll") {
      add(g, 0, 2, 12, 12, 0, 9);
      add(g, 0, -2, 29, 65, 19, 2);
    }
    if (id === "rocket") add(g, 0, 0, 6, 6, 0, 21);
    if (id === "gasworks") {
      for (const [x, z, r, h] of [
        [-19, -5, 8, 25],
        [1, -8, 10, 29],
        [20, 7, 7, 22],
      ])
        add(g, x, z, r * 2, r * 2, 0, h);
      add(g, 5, 35, 38, 16, 0, 9);
    }
    if (id === "ballard")
      for (const side of [-1, 1])
        for (let i = 0; i < 5; i++)
          add(g, side * 25, (i - 2) * 23, 22, 21, 0, 9 + (i % 3) * 3);
    if (id === "shepherd") {
      add(g, 0, 0, 88, 28, 0, 16);
      add(g, 0, 14, 20, 16, 0, 21);
    }
    if (id === "greenlake") add(g, 0, 0, 35, 16, 0, 8);
    if (id === "greenwood")
      for (const side of [-1, 1])
        for (let i = 0; i < 3; i++)
          add(g, side * 23, (i - 1) * 28, 25, 25, 0, 8 + i * 2);
    if (id === "phinney") {
      add(g, 0, 0, 40, 24, 0, 15);
      add(g, 0, 14, 12, 7, 0, 12);
    }
    if (id === "gardens") add(g, 0, 0, 34, 20, 0, 9);
  }
  return out;
}
function* buildSeattleSteps(scene, data, options = {}) {
  const chunk = !!options.chunk;
  const group = new THREE.Group();
  group.visible=!chunk;
  group.name = "Seattle";
  scene.add(group);
  const p = options.palette ?? createSeattlePalette(),
    styles = options.styles ?? createSeattleFacades(),
    colliders = [],
    ferries = [];
  const distantStyles=options.distantStyles??createDistantFacades(styles.map(m=>m.userData.facadeStyle));
  const footprintStyles=options.footprintStyles??createSeattleFacades(true);
  const footprintDistant=options.footprintDistant??createDistantFacades(footprintStyles.map(m=>m.userData.facadeStyle),true);
  const sitesIndex=siteIndex(data);
  const details = chunk ? null : createSeattleDetails(group, p, data);
  const rainier = chunk ? null : createRainier(group);
  if (!chunk) {
    const bay = mesh(
      group,
      new THREE.PlaneGeometry(70000, 70000),
      p.water,
      0,
      -0.5,
      0,
    );
    bay.name = "Elliott Bay";
    bay.rotation.x = -Math.PI / 2;
    bay.castShadow = false;
    bay.renderOrder=1;
    const ground = [];
    const step = TERRAIN_STEP;
    const heights = new Map();
    const groundHeight = (x, z) => {
      const key = `${x}:${z}`;
      if (!heights.has(key)) heights.set(key, terrainHeightAt(x, z));
      return heights.get(key);
    };
    for (let z = BOUNDS.minZ; z < BOUNDS.maxZ; z += step)
      for (let x = BOUNDS.minX; x < BOUNDS.maxX; x += step) {
        const cx = x + step / 2,
          cz = z + step / 2;
        if (!isLand(cx, cz)) continue;
        for (const [dx, dz] of [
          [0, 0],
          [0, step],
          [step, step],
          [0, 0],
          [step, step],
          [step, 0],
        ])
          ground.push(x + dx, groundHeight(x + dx, z + dz), z + dz);
      }
    const terrain = new THREE.BufferGeometry();
    terrain.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(ground, 3),
    );
    terrain.computeVertexNormals();
    mesh(group, terrain, p.ground);
    for (const water of WATERWAYS) {
      const shape = new THREE.Shape(
        water.rings[0].map(([x, z]) => new THREE.Vector2(x, -z)),
      );
      for (const ring of water.rings.slice(1))
        shape.holes.push(
          new THREE.Path(ring.map(([x, z]) => new THREE.Vector2(x, -z))),
        );
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      const lake = mesh(group, geo, p.water, 0, water.level, 0);
      lake.castShadow = false;
      lake.renderOrder=1;
      lake.name = water.name;
    }
  }
  const parkGeometry = [];
  for (const park of data.parks) {
    if (park.ring.length < 4) continue;
    const buffers=parkBuffers(park,chunk?data.bounds:CORE_BOUNDS,
      (outer,holes)=>THREE.ShapeUtils.triangulateShape(outer.map(([x,z])=>new THREE.Vector2(x,z)),holes.map(r=>r.map(([x,z])=>new THREE.Vector2(x,z)))),terrainHeightAt,isLand,BOUNDS);
    if (buffers.indices.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(buffers.positions, 3));
      geo.setIndex(buffers.indices);
      geo.computeVertexNormals();
      parkGeometry.push(geo);
    }
    if (chunk) yield;
  }
  if (parkGeometry.length) {
    mesh(group, mergeGeometries(parkGeometry), p.grass).name='Surveyed park lawns';
    parkGeometry.forEach(g => g.dispose());
  }
  const roadGeo = [],
    curbGeo = [],
    lineGeo = [];
  for (const road of data.roads) {
    curbGeo.push(ribbon(road.points, road.width + 5, 0.19));
    roadGeo.push(ribbon(road.points, road.width, 0.23));
    if (road.width >= 9) lineGeo.push(ribbon(road.points, 0.18, 0.27));
  }
  if (chunk) yield;
  for (const [geos, mat] of [
    [curbGeo, p.paving],
    [roadGeo, p.asphalt],
    [lineGeo, surface("metal", 0xd3bd80)],
  ])
    if (geos.length) {
      const m = mesh(group, mergeGeometries(geos), mat);
      m.material.side = THREE.DoubleSide;
      geos.forEach((g) => g.dispose());
    }
  const batches = new Map(),
    roofSurfaces = new Map(),
    roofParts = [],
    houseRoofs = [];
  let buildingCount = 0;
  for (const b of data.buildings) {
    if (b.ring.length < 4) continue;
    if (landmarkReplacesFootprint(b)) continue;
    const y = heightAt(b.x, b.z),
      footingY = Math.min(y, ...b.ring.map(([x, z]) => heightAt(x, z))),
      surfaces = extrude(b.ring, b.height + y - footingY, footingY, b.holes,(a,c,side,hole)=>({kind:facadeTreatment(sitesIndex,b,a,c,side,hole),seed:(b.id%127)+0.1875+(b.id%7)*0.09375})),
      style = b.height > 65 ? b.id % 3 : b.height<10&&Math.max(...b.ring.map(p=>p[0]))-Math.min(...b.ring.map(p=>p[0]))<23&&Math.max(...b.ring.map(p=>p[1]))-Math.min(...b.ring.map(p=>p[1]))<25 ? 8+(b.id%3) : 3 + (b.id % 5);
    const cell = `${Math.floor(b.x / 2400)}:${Math.floor(b.z / 2400)}`,
      key = `${cell}:${style}`;
    if (!batches.has(key)) batches.set(key, { style, geos: [] });
    batches.get(key).geos.push(surfaces.walls);
    if(!roofSurfaces.has(cell))roofSurfaces.set(cell,[]);
    roofSurfaces.get(cell).push(surfaces.roof);
    const xs = b.ring.map((p) => p[0]),
      zs = b.ring.map((p) => p[1]),
      minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minZ = Math.min(...zs),
      maxZ = Math.max(...zs);
    const polygon = {
      outer: b.ring.map(([x, z]) => ({ x, z })),
      holes: (b.holes ?? []).map((r) => r.map(([x, z]) => ({ x, z }))),
    };
    colliders.push({
      minX,
      maxX,
      minZ,
      maxZ,
      minY: footingY,
      maxY: y + b.height,
      polygon,
    });
    buildingCount++;
    if (chunk && buildingCount % 96 === 0) yield;
    if (
      chunk &&
      b.height < 10 &&
      maxX - minX < 23 &&
      maxZ - minZ < 25 &&
      maxX - minX > 5 &&
      maxZ - minZ > 5
    ) {
      const x0 = minX - 0.3,
        x1 = maxX + 0.3,
        z0 = minZ - 0.3,
        z1 = maxZ + 0.3,
        y0 = y + b.height,
        y1 = y0 + Math.min(3.5, (x1 - x0) * 0.3);
      const values = pitchedRoofPositions(x0, x1, z0, z1, y0, y1);
      const roof = new THREE.BufferGeometry();
      roof.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(values, 3),
      );
      roof.computeVertexNormals();
      houseRoofs.push(roof);
    }
    // Deterministic rooftop plant is cheap batched geometry, never a downloaded model.
    if (
      b.id % 3 === 0 &&
      b.height > 9 &&
      maxX - minX > 14 &&
      maxZ - minZ > 14
    ) {
      const w = Math.min(9, (maxX - minX) * 0.22),
        d = Math.min(7, (maxZ - minZ) * 0.22);
      if (
        [
          [-w, -d],
          [w, -d],
          [w, d],
          [-w, d],
        ].every(([x, z]) => polygonContains(polygon, b.x + x, b.z + z))
      ) {
        const penthouse = new THREE.BoxGeometry(w * 1.8, 2.2, d * 1.6);
        penthouse.translate(b.x, y + b.height + 1.1, b.z);
        roofParts.push(penthouse);
        const vent = new THREE.BoxGeometry(w, 0.5, d);
        vent.translate(b.x, y + b.height + 2.45, b.z);
        roofParts.push(vent);
      }
    }
  }
  for (const { style, geos } of batches.values()) {
    const walls=mesh(group, mergeGeometries(geos), footprintStyles[style]);walls.userData.shadowBatch=true;
    applyFacadeLOD(walls, footprintDistant[style]);
    geos.forEach((g) => g.dispose());
  }
  if (roofParts.length) {
    mesh(group, mergeGeometries(roofParts), p.steel);
    roofParts.forEach((g) => g.dispose());
  }
  for(const geometries of roofSurfaces.values()) {
    mesh(group,mergeGeometries(geometries),p.flatRoof).userData.shadowBatch=true;
    geometries.forEach(g=>g.dispose());
  }
  if (houseRoofs.length) {
    mesh(group, mergeGeometries(houseRoofs), p.dark);
    houseRoofs.forEach((g) => g.dispose());
  }
  const landmarks = chunk ? null : buildSeattleLandmarks(group, p);
  const districts = chunk ? null : createDistrictLandmarks(group,{...p,facades:styles},options.shadowBatch);
  if (landmarks)
    landmarks.landmarks.push(
      ...buildNorthLandmarks(group, { ...p, facades: styles }),
    );
  if (landmarks) colliders.push(...architecturalColliders(landmarks.landmarks));
  if (districts) {
    landmarks.landmarks.push(...districts.groups);
    colliders.push(...architecturalColliders(districts.groups));
  }
  if(landmarks){
    const architecture=new THREE.Group();architecture.name='Batched permanent architecture';group.add(architecture);
    for(const g of landmarks.landmarks.filter(g=>!g.userData.catalogId)){
      g.userData.facadeMeshes=0;g.traverse(o=>{if(o.isMesh&&styles.includes(o.material))g.userData.facadeMeshes++;});
      architecture.add(g);
    }
    batchStatic(architecture);
    architecture.traverse(o=>{if(o.isMesh&&!o.userData.dynamic)o.userData.shadowBatch=true;});
  }
  const bounds = chunk ? data.bounds : CORE_BOUNDS;
  const grove=createGroves(group,p,groveSites(data,bounds,sitesIndex,isLand,DESTINATIONS,chunk?240:700,chunk?CORE_BOUNDS:null),bounds);
  sitesIndex.dispose();
  if (!chunk) {
    for (let i = 0; i < 2; i++) {
      const f = new THREE.Group();
      f.userData.dynamic = true;
      group.add(f);
      box(f, p.dark, 0, 0, 0, 21, 3, 88);
      box(f, p.limestone, 0, 3, 0, 23, 3, 82);
      box(f, p.copper, 0, 6, 0, 23.2, 1.4, 82.2);
      box(f, styles[0], 0, 7.4, 0, 21, 7, 72);
      box(f, p.white, 0, 14.4, 0, 23, 1, 76);
      for (const z of [-24, 24]) {
        box(f, p.white, 0, 15.4, z, 12, 5, 13);
        box(f, styles[0], 0, 17, z, 12.2, 2.5, 13.2);
        box(f, p.dark, 0, 20, z, 5, 3, 4);
      }
      batchStatic(f);
      ferries.push(f);
    }
    const mountains=new THREE.Group();group.add(mountains);
    for (let i = 0; i < 22; i++)
      mesh(
        mountains,
        new THREE.ConeGeometry(1700, 800 + ((i * 377) % 1200), 5),
        surface("stone", 0x778c95),
        -14000 - (i % 3) * 1100,
        250,
        -22000 + i * 2000,
      );
    batchStatic(mountains);
  }
  if(options.shadowBatch)batchShadows(group);
  group.updateMatrixWorld(true);
  const facadeMeshes=[];
  group.traverse(o=>{
    if(!o.isMesh||o.material.transparent||!o.material.userData.facadeStyle)return;
    for(let p=o;p&&p!==group;p=p.parent)if(p.userData.dynamic)return;
    facadeMeshes.push(o);
  });
  facadeMeshes.forEach(o=>applyFacadeLOD(o));
  group.traverse(object => {
    if(!object.isMesh)return;
    for(let p=object;p && p!==group;p=p.parent)if(p.userData.dynamic)return;
    object.updateMatrix();object.matrixAutoUpdate=false;object.matrixWorldAutoUpdate=false;
  });
  group.visible=true;
  return {
    group,
    palette: p,
    rainier,
    landmarks: landmarks?.landmarks ?? [],
    styles,
    distantStyles,
    footprintStyles,
    footprintDistant,
    shadowBatch:options.shadowBatch,
    details,
    districts,
    colliders,
    buildingCount,
    dispose() {
      grove.dispose();
      if(!chunk){details?.dispose();rainier?.dispose();p.water.userData.dispose?.();disposeStreetSigns();}
      districts?.dispose();
      group.removeFromParent();
      const geometries = new Set();
      group.traverse((o) => {
        if (o.isMesh) {
          geometries.add(o.geometry);
          // In the pinned WebGPU renderer, geometry disposal frees vertex buffers only.
          // Object disposal also releases RenderObject bindings and uniform buffers.
          if (o.isInstancedMesh) o.dispose();
          else o.dispatchEvent({ type: "dispose" });
        }
      });
      geometries.forEach((g) => g.dispose());
    },
    visualStats() {
      let meshes = 0,
        triangles = 0;
      const textures = new Set(),
        materials = new Set();
      group.traverse((o) => {
        if (!o.isMesh) return;
        meshes++;
        triangles +=
          ((o.geometry.index?.count ?? o.geometry.attributes.position.count) /
            3) *
          (o.isInstancedMesh ? o.count : 1);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          materials.add(m);
          if (m.map) textures.add(m.map);
        }
      });
      const wheel = landmarks.landmarks.find(
          (g) => g.name === "Seattle Great Wheel",
        ),
        matrix = new THREE.Matrix4(),
        q = new THREE.Quaternion(),
        v = new THREE.Vector3(),
        s = new THREE.Vector3();
      wheel.userData.cabinMesh.getMatrixAt(0, matrix);
      matrix.decompose(v, q, s);
      return {
        rainier: rainier?.stats(),
        groves:grove.stats(),
        trollEyeScale:
          landmarks?.landmarks.find((g) => g.userData.trollEye)?.userData
            .trollEye.scale.y ?? 1,
        details: details?.stats(),
        districts: districts?.stats(),
        meshes,
        triangles,
        materials: materials.size,
        generatedTextures: textures.size,
        wheelCabins: wheel.userData.cabinCount,
        wheelCabinRoll: new THREE.Euler().setFromQuaternion(q).z,
        landmarks: landmarks.landmarks.map((g) => {
          let facadeMeshes = 0;
          g.traverse((o) => {
            if (o.isMesh && (styles.includes(o.material)||styles.includes(o.userData.facadeMaterial))) facadeMeshes++;
          });
          return {
            name: g.name,
            signature: g.userData.signature,
            facadeMeshes: g.userData.facadeMeshes ?? facadeMeshes,
          };
        }),
      };
    },
    update(t, position) {
      if(position)grove.update(position);
      if (position) rainier?.update(position);
      if (position) details?.update(position);
      if (position) districts?.update(position);
      landmarks?.update(t);
      ferries.forEach((f, i) => {
        f.position.set(
          -1100 - i * 1100 + Math.sin(t * 0.008 + i * 2) * 650,
          0,
          900 + Math.cos(t * 0.008 + i * 2) * 1100,
        );
        f.rotation.y = t * 0.008 + i * 2;
      });
    },
  };
}

export function buildSeattle(scene, data, options = {}) {
  const steps = buildSeattleSteps(scene, data, options);
  let result;
  do {
    result = steps.next();
  } while (!result.done);
  return result.value;
}
export async function buildSeattleRegion(scene, data, options) {
  const steps = buildSeattleSteps(scene, data, { ...options, chunk: true });
  let result,deadline=performance.now()+4;
  do {
    result = steps.next();
    if (!result.done && performance.now()>=deadline) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      deadline=performance.now()+4;
    }
  } while (!result.done);
  return result.value;
}
