import * as THREE from "three/webgpu";
import {
  Fn,
  If,
  diffuseColor,
  float,
  vec2,
  vec4,
  color,
  uniform,
  positionWorld,
  normalWorldGeometry,
  abs,
  fract,
  floor,
  mix,
  max,
  fwidth,
  dot,
  smoothstep,
  cameraPosition,
  length,
  attribute,
} from "three/tsl";
import { filteredPulse, hash2D, noise2D, cityUniforms, facadeAlongZ } from "./tsl-materials.js";
const variants = new WeakMap();
// One opaque draw: preserve the complete material nearby and skip its entire PBR path at distance.
// NodeMaterial.setupOutput still applies the scene's aerial fog and normal render-output conversion.
export function distanceShading(material, distantColor) {
  const distance = length(positionWorld.sub(cameraPosition));
  material.fragmentNode = Fn(builder => {
    const result = vec4(0, 0, 0, 1).toVar();
    If(distance.greaterThan(80), () => result.assign(vec4(distantColor, 1)));
    If(distance.lessThan(100), () => {
      material.setupDiffuseColor(builder);
      material.setupAmbientOcclusion(builder);
      material.setupVariants(builder);
      result.assign(mix(
        vec4(material.setupLighting(builder), diffuseColor.a),
        result,
        smoothstep(80, 100, distance),
      ));
    });
    return result;
  })();
  return material;
}
export function distantSurface(material, tint) {
  const daylight = float(1).sub(smoothstep(0.5, 1.5, cityUniforms.uInteriorGlow)).mul(0.7).add(0.3);
  const illumination = dot(normalWorldGeometry, cityUniforms.uSkySunDir).max(0).mul(0.75).add(0.25);
  const base = uniform(new THREE.Color(tint));
  const distant = base
    .mul(noise2D(positionWorld.xz.mul(0.04)).mul(0.1).add(0.9))
    .mul(illumination).mul(daylight);
  return distanceShading(material, distant);
}
export function applyFacadeLOD(mesh, farMaterial) {
  if (mesh.userData.facadeMaterial) return;
  const original = mesh.material;
  let variant = variants.get(original);
  if (!variant) {
    const far = farMaterial ?? createDistantFacades([original.userData.facadeStyle])[0];
    variant = distanceShading(original.clone(), far.colorNode);
    variants.set(original, variant);
  }
  mesh.material = variant;
  mesh.userData.facadeMaterial = original;
}

export function createDistantFacades(styles,footprint=false) {
  return styles.map(
    (s) => {
      const width = uniform(s.width),
        height = uniform(s.height),
        ratio = uniform(s.ratio),
        vertical = uniform(s.vertical),
        seed = uniform(s.seed),
        base = uniform(new THREE.Color(s.tint));
      const mat = new THREE.MeshBasicNodeMaterial();
      const wall=footprint?attribute('facadeWall','vec3'):null,box=footprint?attribute('box','vec4'):null;
      const grid = Fn(() => {
        if(footprint)return vec2(wall.x.mul(floor(box.x.div(width).add(0.5)).max(1)).add(floor(box.w)),box.y.sub(wall.y).div(height));
        const u = mix(positionWorld.x,positionWorld.z,facadeAlongZ);
        return vec2(u.div(width), positionWorld.y.div(height));
      })();
      const mask = Fn(() => {
        const p = fract(grid),
          fw = fwidth(grid).max(0.001),
          x = float(1).sub(ratio).mul(0.5),
          y = float(1).sub(vertical).mul(0.5);
        return filteredPulse(p.x, x, float(1).sub(x), fw.x).mul(
          filteredPulse(p.y, s.minY??y, s.maxY??float(1).sub(y), fw.y),
        ).mul(abs(normalWorldGeometry.y).lessThan(0.7).select(1,0)).mul(footprint?wall.z.lessThan(2.5):float(1));
      })();
      const glazing = Fn(() => {
        const n = abs(normalWorldGeometry),
          gradient = positionWorld.y.div(250).clamp(0, 1);
        return mix(color(0x243e4a), cityUniforms.uSkyHorizonColor, gradient.mul(0.3).add(0.12)).mul(
          n.y.lessThan(0.7),
        );
      })();
      const illumination = dot(normalWorldGeometry, cityUniforms.uSkySunDir)
        .max(0)
        .mul(0.48)
        .add(0.52);
      const daylight=float(1).sub(smoothstep(0.5,1.5,cityUniforms.uInteriorGlow)).mul(0.7).add(0.3);
      const light = Fn(() => {
        const lit = hash2D(floor(grid).add(vec2(seed, 19.4))).greaterThan(0.84);
        const coverage = mix(
          float(0.16),
          float(lit),
          float(1).sub(max(fwidth(grid).x, fwidth(grid).y).clamp(0, 1)),
        );
        return color(0xffd195).mul(mask).mul(coverage).mul(cityUniforms.uInteriorGlow).mul(0.45);
      })();
      const masonry=footprint?base.mul(fract(box.w).mul(.3).add(.78)):base;
      mat.colorNode = mix(masonry, glazing, mask).mul(illumination).mul(daylight).add(light);
      mat.userData.distantFacade = true;
      return mat;
    },
  );
}
