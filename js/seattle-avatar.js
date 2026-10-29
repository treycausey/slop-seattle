import * as THREE from "three/webgpu";
import {
  Fn,
  attribute,
  uniform,
  color,
  float,
  mix,
  step,
  abs,
  fract,
  smoothstep,
  fwidth,
  max,
  sign,
} from "three/tsl";
import { PERSON_BONES } from "./pedestrians.js";
import { mesh, box, batchStatic } from "./seattle-geometry.js";

const SLOT = "slop-seattle-avatar-v1";
export function createSeattleAvatar(scene, controllers) {
  let look = "grunge";
  try {
    if (localStorage.getItem(SLOT) === "beast") look = "beast";
  } catch {}
  const style = uniform(look === "beast" ? 1 : 0),
    rigs = [
      controllers.entities.person.rig,
      controllers.entities.cyclist.riderRig,
    ],
    crowds = [
      controllers.entities.person.crowd,
      controllers.entities.cyclist.riderCrowd,
    ];
  const isPart = (p, id) => step(abs(p.sub(id)), 0.25);
  for (const crowd of crowds)
    for (const lod of crowd.lods) {
      const material = lod.mesh.material,
        original = material.colorNode;
      material.colorNode = Fn(() => {
        const q = attribute("position", "vec3"),
          part = attribute("skin", "vec4").w;
        const stripe = (v, width) => {
          const a = max(fwidth(v), 0.005);
          return float(1).sub(
            smoothstep(float(width).sub(a), float(width).add(a), fract(v)),
          );
        };
        const vertical = stripe(q.x.mul(13), 0.25),
          horizontal = stripe(q.y.mul(13), 0.25);
        const fine = max(
          stripe(q.x.mul(26), 0.035),
          stripe(q.y.mul(26), 0.035),
        );
        const plaid = mix(
          mix(
            color(0x8e302c),
            color(0x202c34),
            max(vertical, horizontal).mul(0.83),
          ),
          color(0xc5b5a0),
          fine.mul(0.35),
        );
        const front = step(0.055, q.z),
          placket = step(abs(q.x), 0.009).mul(front);
        const buttons = stripe(q.y.mul(10), 0.075).mul(placket);
        const collar = step(1.37, q.y)
          .mul(step(abs(q.x), q.y.sub(1.32).mul(0.65)))
          .mul(front);
        const shirt = mix(
          mix(plaid, color(0x171f26), collar),
          color(0xc6c3b2),
          buttons,
        );
        const torso = isPart(part, 0).mul(step(q.y, 1.46)),
          arm = isPart(part, 3),
          legs = isPart(part, 1),
          shoes = isPart(part, 2);
        let grunge = mix(original, shirt, max(torso, arm));
        grunge = mix(
          grunge,
          color(0x29415d).mul(q.y.mul(90).sin().mul(0.03).add(0.97)),
          legs,
        );
        grunge = mix(
          grunge,
          mix(color(0x181e25), color(0xdbd7c9), step(q.y, 0.03)),
          shoes,
        );
        grunge = mix(grunge, color(0x30251e), step(5.5, part));
        const x = q.x.mul(sign(q.z));
        const rect = (cx, cy, w, h) => {
          const aa = max(fwidth(q.y), 0.001);
          return float(1)
            .sub(smoothstep(float(w).sub(aa), float(w).add(aa), abs(x.sub(cx))))
            .mul(
              float(1).sub(
                smoothstep(
                  float(h).sub(aa),
                  float(h).add(aa),
                  abs(q.y.sub(cy)),
                ),
              ),
            );
        };
        let number = float(0);
        // Seven-segment 24, on both sides of the jersey, without a texture.
        for (const [cx, cy, w, h] of [
          [-0.05, 1.31, 0.033, 0.009],
          [-0.025, 1.27, 0.009, 0.04],
          [-0.05, 1.23, 0.033, 0.009],
          [-0.075, 1.19, 0.009, 0.04],
          [-0.05, 1.15, 0.033, 0.009],
          [0.025, 1.27, 0.009, 0.04],
          [0.075, 1.27, 0.009, 0.04],
          [0.05, 1.23, 0.033, 0.009],
          [0.075, 1.19, 0.009, 0.04],
        ])
          number = max(number, rect(cx, cy, w, h));
        const panel = mix(
          color(0x102b46),
          color(0x74c940),
          max(step(1.39, q.y), number.mul(step(0.055, abs(q.z)))),
        );
        let beast = mix(original, panel, max(torso, arm));
        beast = mix(beast, color(0x142d46), max(legs, isPart(part, 4)));
        beast = mix(beast, color(0x8dcc3e), shoes);
        return mix(grunge, beast, style);
      })();
      material.needsUpdate = true;
    }
  const palette = [0x123355, 0xe4e8dc, 0x84d137, 0xe7b83c].map(
    (c) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: 0.65 }),
  );
  const head = new THREE.Group();
  const ball = (mat, x, y, z, rx, ry, rz) => {
    const o = mesh(
      head,
      new THREE.SphereGeometry(1, 16, 10),
      palette[mat],
      x,
      y,
      z,
    );
    o.scale.set(rx, ry, rz);
    return o;
  };
  ball(0, 0, 0, 0, 0.185, 0.205, 0.19);
  ball(1, 0, -0.035, 0.13, 0.16, 0.14, 0.1);
  const beak = mesh(
    head,
    new THREE.ConeGeometry(0.1, 0.29, 4),
    palette[3],
    0,
    -0.03,
    0.3,
  );
  beak.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    ball(2, side * 0.13, 0.07, 0.155, 0.062, 0.05, 0.04);
    ball(0, side * 0.13, 0.07, 0.19, 0.022, 0.03, 0.012);
    const brow = box(
      head,
      palette[0],
      side * 0.12,
      0.115,
      0.17,
      0.14,
      0.035,
      0.045,
    );
    brow.rotation.z = side * -0.25;
    for (let i = 0; i < 3; i++) {
      const feather = ball(
        0,
        side * (0.05 + i * 0.045),
        0.17,
        -0.05 - i * 0.035,
        0.035,
        0.13 - i * 0.015,
        0.045,
      );
      feather.rotation.z = side * -0.3;
    }
  }
  batchStatic(head);
  const hair = new THREE.Group(),
    hairMat = new THREE.MeshStandardNodeMaterial({
      color: 0x30251e,
      roughness: 0.94,
    });
  mesh(
    hair,
    new THREE.SphereGeometry(0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat,
    0,
    0.035,
    -0.01,
  );
  for (const x of [-0.075, 0, 0.075]) {
    const lock = mesh(
      hair,
      new THREE.SphereGeometry(1, 12, 8),
      hairMat,
      x,
      -0.08,
      -0.13,
    );
    lock.scale.set(0.055, 0.23, 0.065);
  }
  batchStatic(hair);
  const attachment = new THREE.Group();
  attachment.add(head, hair);
  const heads = [attachment, attachment.clone()];
  for (const h of heads) {
    h.name = "Beast Mode hawk";
    h.userData.dynamic = true;
    scene.add(h);
  }
  const label = document.createElement("label");
  label.id = "avatar-control";
  label.textContent = "Avatar";
  const select = document.createElement("select");
  select.id = "avatar-look";
  select.setAttribute("aria-label", "Avatar look");
  for (const [value, text] of [
    ["grunge", "Flannel"],
    ["beast", "Beast Mode"],
  ]) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = text;
    select.append(o);
  }
  select.value = look;
  label.append(select);
  document.querySelector(".status-card").append(label);
  function setLook(value) {
    look = value === "beast" ? "beast" : "grunge";
    style.value = look === "beast" ? 1 : 0;
    select.value = look;
    for (const r of rigs) {
      r.pose[r.pose.length - 1] = 0;
      r.pose[r.pose.length - 2] = r.girth = look === "beast" ? 1.14 : 0.98;
      r.armSwing = look === "beast" ? 1.25 : 0.95;
    }
    try {
      localStorage.setItem(SLOT, look);
    } catch {}
  }
  select.onchange = () => {
    setLook(select.value);
    select.blur();
  };
  setLook(look);
  return {
    frame(camera) {
      if (
        !["person", "cyclist"].includes(controllers.activeMode) ||
        camera.activePresetId !== "chase"
      )
        return;
      const p = controllers.getActiveEntity().position;
      camera.currentLookAt.set(p.x, p.y + 1.1, p.z);
      camera.camera.lookAt(camera.currentLookAt);
    },
    update() {
      label.hidden = !["person", "cyclist"].includes(controllers.activeMode);
      // Each costume owns its headwear; the stock helmet intersects both styles.
      controllers.entities.cyclist.helmet.visible = false;
      for (let i = 0; i < 2; i++) {
        const h = heads[i],
          pose = rigs[i].pose,
          o = PERSON_BONES.HEAD * 8;
        h.visible = controllers.entities[i===0?'person':'cyclist'].presentationVisible !== false;
        h.children[0].visible = look === "beast";
        h.children[1].visible = look !== "beast";
        h.quaternion.fromArray(pose, o);
        h.scale.setScalar(pose[o + 7]);
        h.position
          .set(0, 1.65, 0)
          .multiplyScalar(pose[o + 7])
          .applyQuaternion(h.quaternion);
        h.position.x += pose[o + 4];
        h.position.y += pose[o + 5];
        h.position.z += pose[o + 6];
      }
    },
    stats: (camera) => ({
      look,
      heads: heads.length,
      headVisible: look === "beast",
      headPositions: heads.map((h) => h.position.toArray()),
      headScreen: camera
        ? heads[controllers.activeMode === "cyclist" ? 1 : 0].position
            .clone()
            .project(camera)
            .toArray()
        : null,
      extraMeshes: (head.children.length + hair.children.length) * 2,
      downloadedTextures: 0,
    }),
  };
}
