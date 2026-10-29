import * as THREE from "three/webgpu";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function box(parent, mat, x, y, z, w, h, d) {
  return mesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z);
}
export function cylinder(parent, mat, x, y, z, rt, rb, h, segments = 24) {
  return mesh(parent, new THREE.CylinderGeometry(rt, rb, h, segments), mat, x, y + h / 2, z);
}
export function beam(parent, mat, a, b, r = 0.15) {
  const av = new THREE.Vector3(...a),
    bv = new THREE.Vector3(...b),
    v = bv.clone().sub(av);
  const m = mesh(parent, new THREE.CylinderGeometry(r, r, v.length(), 6), mat);
  m.position.copy(av.add(bv).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  return m;
}
export function tube(parent, mat, points, r = 0.2, segments = 32) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return mesh(parent, new THREE.TubeGeometry(curve, segments, r, 6, false), mat);
}
export function lathe(parent, mat, profile, segments = 48) {
  return mesh(
    parent,
    new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(r, y)),
      segments,
    ),
    mat,
  );
}
export function gable(parent, mat, x, y, z, w, h, d) {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        -w / 2,
        0,
        -d / 2,
        w / 2,
        0,
        -d / 2,
        w / 2,
        h,
        0,
        -w / 2,
        h,
        0,
        -w / 2,
        0,
        d / 2,
        w / 2,
        0,
        d / 2,
      ],
      3,
    ),
  );
  g.setIndex([0, 3, 2, 0, 2, 1, 3, 4, 5, 3, 5, 2, 0, 4, 3, 1, 2, 5]);
  g.computeVertexNormals();
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(12), 2));
  return mesh(parent, g, mat, x, y, z);
}
export function canvasMaterial(width, height, draw, { transparent = false, glow = false } = {}) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  draw(c.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mat = glow
    ? new THREE.MeshBasicNodeMaterial({
        map: texture,
        transparent,
        alphaTest: transparent ? 0.08 : 0,
        side: THREE.DoubleSide,
      })
    : new THREE.MeshStandardNodeMaterial({ map: texture, roughness: 0.8, side: THREE.DoubleSide });
  mat.userData.procedural = true;
  return mat;
}
export function sign(parent, text, x, y, z, width, background = "#233d43") {
  const mat = canvasMaterial(
    1024,
    160,
    (c, w, h) => {
      c.fillStyle = background;
      c.fillRect(0, 0, w, h);
      c.font = "bold 82px sans-serif";
      c.fillStyle = "#f3ecdc";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(text, w / 2, h / 2, w - 30);
    },
    { glow: true },
  );
  return mesh(parent, new THREE.PlaneGeometry(width, (width * 160) / 1024), mat, x, y, z);
}
// Collapse static architectural detail by material. Moving cabins and instanced trees stay separate.
export function batchStatic(root) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(),
    batches = new Map(),
    remove = [];
  root.traverse((object) => {
    if (
      !object.isMesh ||
      !object.visible ||
      object.isInstancedMesh ||
      Array.isArray(object.material)
    )
      return;
    for (let p = object; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    const source = object.geometry,
      indexless = source.index ? source.toNonIndexed() : source.clone();
    for (const key of Object.keys(indexless.attributes))
      if (!["position", "normal", "uv"].includes(key)) indexless.deleteAttribute(key);
    if (!indexless.attributes.uv)
      indexless.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          new Float32Array(indexless.attributes.position.count * 2),
          2,
        ),
      );
    indexless.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
    if (!batches.has(object.material)) batches.set(object.material, []);
    batches.get(object.material).push(indexless);
    remove.push(object);
  });
  remove.forEach((o) => o.removeFromParent());
  for (const [mat, geos] of batches) {
    mesh(root, mergeGeometries(geos), mat);
    geos.forEach((g) => g.dispose());
  }
}
