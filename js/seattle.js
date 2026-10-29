import * as THREE from "three/webgpu";
import { ThirdPersonControllerManager } from "./controllers.js";
import { CameraSystem } from "./cameras.js";
import { LightingSystem } from "./lighting.js";
import { TouchControls } from "./touch-controls.js";
import { GamepadControls } from "./gamepad-controls.js";
import { DESTINATIONS, WORLD, heightAt, LANDMARK_VIEWS } from "./seattle-config.js";
import { buildSeattle } from "./seattle-city.js";
import { SeattleMap, nearestRoad } from "./seattle-map.js";
import { preparePlayerMaterials } from "./seattle-player-materials.js";
import { resolveLandmarkView } from "./seattle-viewpoints.js";

const $ = (id) => document.getElementById(id);
const modes = ["person", "car", "cyclist", "helicopter"];
const modeNames = {
  person: "On foot",
  car: "Driving",
  cyclist: "Cycling",
  helicopter: "Helicopter",
};
const cameras = ["chase", "action", "pov", "skyline", "landmark"];

async function init() {
  const startedAt = performance.now();
  let readyAt = null,
    shaderCompileMs = null;
  const status = $("loading-status");
  const response = await fetch(new URL("./seattle-data.json", import.meta.url));
  if (!response.ok)
    throw new Error(`Seattle map data could not load (${response.status}). Reload to try again.`);
  const data = await response.json();
  status.textContent = "Preparing the waterfront and skyline…";
  const renderer = new THREE.WebGPURenderer({
    antialias: true,
    reversedDepthBuffer: true,
    forceWebGL: new URLSearchParams(location.search).has("webgl"),
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  $("canvas-container").appendChild(renderer.domElement);
  await renderer.init();
  const scene = new THREE.Scene();
  const lighting = new LightingSystem(scene, renderer);
  lighting.sunLight.castShadow = renderer.backend.isWebGPUBackend;
  const city = buildSeattle(scene, data);
  status.textContent = `Preparing ${city.buildingCount.toLocaleString()} buildings and player controls…`;
  const controllerManager = new ThirdPersonControllerManager(scene, city.colliders, WORLD);
  const updatePlayerMaterials = preparePlayerMaterials(scene, controllerManager, renderer);
  const camera = new CameraSystem(renderer.domElement, controllerManager);
  const touch = new TouchControls(controllerManager);
  let cameraIndex = 0;
  let selectedPlace = DESTINATIONS[0];
  const viewFor = (place) =>
    resolveLandmarkView(
      place,
      LANDMARK_VIEWS[place.id],
      city.colliders,
      place.id === "wheel" ? 4 : heightAt(place.x, place.z),
    );
  let selectedView = viewFor(selectedPlace);
  const cycleCamera = () => {
    cameraIndex = (cameraIndex + 1) % cameras.length;
    if (!["skyline", "landmark"].includes(cameras[cameraIndex]))
      camera.setCameraPreset(cameras[cameraIndex], true);
    $("camera-button").textContent =
      {
        chase: "Chase",
        action: "Low angle",
        pov: "First person",
        skyline: "Skyline",
        landmark: "Place",
      }[cameras[cameraIndex]] + " · V";
  };
  const gamepad = new GamepadControls(controllerManager, camera, {
    onCycleCamera: cycleCamera,
    onCycleMode: (step) =>
      selectMode(modes[(modes.indexOf(controllerManager.activeMode) + step + 4) % 4]),
    onToggleMap: () => (map.dialog.open ? map.dialog.close() : map.open()),
    onCloseMap: () => map.dialog.close(),
  });
  const map = new SeattleMap(data, controllerManager, teleport);
  function teleport(x, z, heading = Math.PI) {
    controllerManager.teleportActiveTo(x, z, heading);
    touch.reset();
    gamepad.reset();
    camera.resetForTeleport();
    cameraIndex = 0;
    $("camera-button").textContent = "Camera · V";
    map.draw();
  }
  function selectMode(mode) {
    const p = controllerManager.getActiveEntity().position.clone();
    controllerManager.setMode(mode);
    touch.setMode(mode);
    gamepad.reset();
    const road = nearestRoad(data, p.x, p.z);
    teleport(road.x, road.z, road.heading);
    if (mode === "helicopter") controllerManager.getActiveEntity().position.y = Math.max(p.y, 150);
    renderMode(mode);
  }
  function renderMode(mode) {
    document
      .querySelectorAll("button[data-mode]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    $("mode-label").textContent = modeNames[mode];
    $("control-hint").innerHTML =
      mode === "helicopter"
        ? "WASD move · E / Q altitude<br>Drag to orbit · Scroll to zoom"
        : "WASD move · 1–4 travel mode<br>Drag to orbit · Scroll to zoom";
    document.body.dataset.mode = mode;
  }
  // Separate parked entities so mode changes never spawn on top of another player model.
  const start = DESTINATIONS[0];
  for (const [i, mode] of modes.entries()) {
    controllerManager.setMode(mode);
    const road = nearestRoad(data, start.arrival.x + i * 22, start.arrival.z + i * 20);
    controllerManager.teleportActiveTo(
      road.x,
      road.z,
      start.arrival.heading,
      mode === "helicopter" ? 165 : null,
    );
  }
  controllerManager.setMode("helicopter");
  touch.setMode("helicopter");
  const heli = controllerManager.getActiveEntity();
  heli.position.set(start.x - 100, 190, start.z + 240);
  heli.heading = Math.atan2(start.x - heli.position.x, start.z - heli.position.z);
  // Restore only finite, bounded Seattle state; never import the upstream New York save slot.
  try {
    const saved = JSON.parse(localStorage.getItem("slop-seattle-player-v1"));
    if (
      saved &&
      modes.includes(saved.mode) &&
      [saved.x, saved.z, saved.heading, saved.y].every(Number.isFinite) &&
      Math.abs(saved.x) < 8000 &&
      Math.abs(saved.z) < 8500
    ) {
      controllerManager.setMode(saved.mode);
      teleport(saved.x, saved.z, saved.heading);
      if (saved.mode === "helicopter")
        controllerManager.teleportActiveTo(saved.x, saved.z, saved.heading, saved.y);
      touch.setMode(saved.mode);
      renderMode(saved.mode);
    }
  } catch {
    /* Storage is optional. */
  }
  window.addEventListener("pagehide", () => {
    try {
      const p = controllerManager.getActiveEntity();
      localStorage.setItem(
        "slop-seattle-player-v1",
        JSON.stringify({
          mode: controllerManager.activeMode,
          x: p.position.x,
          y: p.position.y,
          z: p.position.z,
          heading: p.heading,
        }),
      );
    } catch {}
  });
  for (const d of DESTINATIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.destination = d.id;
    const name = document.createElement("span");
    name.textContent = d.name;
    const area = document.createElement("small");
    area.textContent = d.area;
    button.append(name, area);
    button.addEventListener("click", () => {
      const p = nearestRoad(data, d.arrival.x, d.arrival.z);
      teleport(p.x, p.z, d.arrival.heading);
      selectedPlace = d;
      selectedView = viewFor(d);
      cameraIndex = cameras.indexOf("landmark");
      $("location-label").textContent = d.name;
      $("camera-button").textContent = "Place · V";
      $("destinations").hidePopover();
    });
    $("destinations").appendChild(button);
  }
  document
    .querySelectorAll("button[data-mode]")
    .forEach((b) => b.addEventListener("click", () => selectMode(b.dataset.mode)));
  $("camera-button").addEventListener("click", cycleCamera);
  $("map-button").addEventListener("click", () => map.open());
  $("radar").addEventListener("click", () => map.open());
  $("radar").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      map.open();
    }
  });
  $("help-button").addEventListener("click", () => {
    controllerManager.resetInput();
    $("help").showModal();
  });
  document
    .querySelectorAll("[data-close]")
    .forEach((b) => b.addEventListener("click", () => $(b.dataset.close).close()));
  for (const id of ["atlas", "help"])
    $(id).addEventListener("close", () => {
      controllerManager.resetInput();
      touch.reset();
      gamepad.reset();
    });
  const applyTime = () => lighting.applyPreset($("time-select").value);
  $("time-select").addEventListener("change", applyTime);
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input,select,textarea") || e.metaKey || e.ctrlKey || e.altKey || e.repeat)
      return;
    if (e.key.toLowerCase() === "m") {
      e.preventDefault();
      map.dialog.open ? map.dialog.close() : map.open();
      return;
    }
    if (map.dialog.open || $("help").open) return;
    if (/^[1-4]$/.test(e.key)) selectMode(modes[Number(e.key) - 1]);
    if (e.key.toLowerCase() === "v") cycleCamera();
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key))
      e.preventDefault();
  });
  window.addEventListener("resize", () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.onResize(innerWidth, innerHeight);
    map.draw();
  });
  // This read-only snapshot supports reproducible browser acceptance checks.
  window.slopSeattle = {
    getState: () => {
      const e = controllerManager.getActiveEntity();
      return {
        ready: document.body.dataset.ready === "true",
        mode: controllerManager.activeMode,
        x: e.position.x,
        y: e.position.y,
        z: e.position.z,
        heading: e.heading,
        camera: cameras[cameraIndex],
        time: lighting.activePresetId,
        buildings: city.buildingCount,
        roads: data.roads.length,
        visuals: city.visualStats(),
        startupMs: readyAt === null ? null : Math.round(readyAt - startedAt),
        shaderCompileMs,
        placeView: cameras[cameraIndex] === "landmark" ? selectedView : null,
      };
    },
  };
  status.textContent = "Compiling city shaders…";
  map.draw();
  camera.update(1 / 60, 0);
  lighting.update(camera.currentPos);
  const compileStartedAt = performance.now();
  await renderer.compileAsync(scene, camera.camera);
  shaderCompileMs = Math.round(performance.now() - compileStartedAt);
  let last = performance.now(),
    elapsed = 0,
    hudTime = 0,
    frames = 0;
  renderer.setAnimationLoop(() => {
    const now = performance.now(),
      dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;
    const modal = map.dialog.open || $("help").open;
    gamepad.setEnabled(!modal);
    touch.setEnabled(!modal);
    gamepad.update(dt);
    if (!modal) {
      controllerManager.update(dt, elapsed);
    } else controllerManager.resetInput();
    if (
      cameras[cameraIndex] === "landmark" &&
      Object.values(controllerManager.keys).some(Boolean)
    ) {
      cameraIndex = 0;
      camera.resetForTeleport();
      $("camera-button").textContent = "Camera · V";
    }
    camera.update(dt, elapsed);
    if (cameras[cameraIndex] === "landmark") {
      const { eye, target } = selectedView;
      camera.currentPos.set(...eye);
      camera.camera.position.copy(camera.currentPos);
      camera.camera.lookAt(...target);
    } else if (cameras[cameraIndex] === "skyline") {
      camera.currentPos.set(-1800, 420, 250);
      camera.camera.position.copy(camera.currentPos);
      camera.camera.lookAt(250, 100, -400);
    } else {
      // The chase camera also follows the sloping terrain behind the player.
      camera.camera.position.y = Math.max(
        camera.camera.position.y,
        heightAt(camera.camera.position.x, camera.camera.position.z) + 1,
      );
    }
    lighting.update(camera.currentPos);
    city.update(elapsed);
    updatePlayerMaterials();
    renderer.render(scene, camera.camera);
    frames++;
    hudTime += dt;
    if (hudTime > 0.25) {
      const p = controllerManager.getActiveEntity(),
        near = nearestRoad(data, p.position.x, p.position.z);
      const landmark = DESTINATIONS.reduce((a, b) =>
        Math.hypot(a.x - p.position.x, a.z - p.position.z) <
        Math.hypot(b.x - p.position.x, b.z - p.position.z)
          ? a
          : b,
      );
      $("location-label").textContent =
        cameras[cameraIndex] === "landmark"
          ? selectedPlace.name
          : Math.hypot(landmark.x - p.position.x, landmark.z - p.position.z) < 240
            ? landmark.name
            : near.name;
      $("speed").textContent = Math.round(Math.abs(p.speed) * 2.237);
      $("fps").textContent = `${Math.round(frames / hudTime)} FPS · N ↑`;
      map.draw();
      frames = 0;
      hudTime = 0;
    }
    if (document.body.dataset.ready !== "true") {
      readyAt = performance.now();
      document.body.dataset.ready = "true";
      $("loading-overlay").hidden = true;
    }
  });
}
init().catch((error) => {
  console.error(error);
  $("loading-status").textContent = `Seattle could not start: ${error.message}`;
  const retry = document.createElement("button");
  retry.textContent = "Try again";
  retry.type = "button";
  retry.onclick = () => location.reload();
  $("loading-status").after(retry);
});
