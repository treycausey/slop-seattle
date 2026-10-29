import * as THREE from "three/webgpu";
import { createSeattleDistantSky } from "./seattle-distant-sky.js";
import { ThirdPersonControllerManager } from "./controllers.js";
import { CameraSystem } from "./cameras.js";
import { LightingSystem } from "./lighting.js";
import { TouchControls } from "./touch-controls.js";
import { GamepadControls } from "./gamepad-controls.js";
import {
  DESTINATIONS,
  WORLD,
  heightAt,
  terrainHeightAt,
  BOUNDS,
  LANDMARK_VIEWS,
} from "./seattle-config.js";
import { buildSeattle } from "./seattle-city.js";
import { SeattleMap, nearestRoad } from "./seattle-map.js";
import { preparePlayerMaterials } from "./seattle-player-materials.js";
import { resolveLandmarkView } from "./seattle-viewpoints.js";
import { createSeattleStream } from "./seattle-stream.js";

const $ = (id) => document.getElementById(id);
const modes = ["person", "car", "cyclist", "helicopter", "blueangels"];
const modeNames = {
  person: "On foot",
  car: "Driving",
  cyclist: "Cycling",
  helicopter: "Helicopter",
  blueangels: "Blue Angels",
};
const cameras = ["chase", "action", "pov", "skyline", "landmark"];

async function init() {
  const startedAt = performance.now();
  let readyAt = null,
    shaderCompileMs = null;
  let secrets = null;
  let flight = null,
    modeRequest = 0;
  const currentMode = () =>
    flight ? "blueangels" : controllerManager.activeMode;
  const status = $("loading-status");
  const response = await fetch(new URL("./seattle-data.json", import.meta.url));
  if (!response.ok)
    throw new Error(
      `Seattle map data could not load (${response.status}). Reload to try again.`,
    );
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
  const lighting = new LightingSystem(scene, renderer, {
    shadowTileSize: innerWidth < 700 ? 1024 : 1536,
  });
  lighting.sunLight.castShadow = renderer.backend.isWebGPUBackend;
  lighting.sky.renderOrder=2;
  const distantSky=createSeattleDistantSky(scene,lighting);
  for(let i=0;i<lighting.sunLight.shadow.getViewportCount();i++)lighting.sunLight.shadow.getCamera(i).layers.enable(1);
  const city = buildSeattle(scene, data,{shadowBatch:renderer.backend.isWebGPUBackend});
  status.textContent = `Preparing ${city.buildingCount.toLocaleString()} buildings and player controls…`;
  const controllerManager = new ThirdPersonControllerManager(
    scene,
    city.colliders,
    WORLD,
  );
  let traveling = false;
  const travelStatus = document.createElement("p");
  travelStatus.id = "travel-status";
  travelStatus.setAttribute("role", "status");
  travelStatus.hidden = true;
  document.body.appendChild(travelStatus);
  const showTravelStatus = (message) => {
    travelStatus.textContent = message;
    travelStatus.hidden = !message;
  };
  const stream = createSeattleStream(
    city,
    data,
    (colliders) => {
      controllerManager.colliders = colliders;
      controllerManager._colliderCells = null;
    },
    showTravelStatus,
  );
  const updatePlayerMaterials = preparePlayerMaterials(
    scene,
    controllerManager,
    renderer,
  );
  const camera = new CameraSystem(renderer.domElement, controllerManager);
  const touch = new TouchControls(controllerManager);
  let cameraIndex = 0;
  let selectedPlace = DESTINATIONS[0];
  const viewFor = (place) =>
    resolveLandmarkView(
      place,
      LANDMARK_VIEWS[place.id],
      city.colliders,
      place.id === "wheel" ? 4 : terrainHeightAt(place.x, place.z),
    );
  let selectedView = viewFor(selectedPlace);
  const cycleCamera = () => {
    document.body.classList.remove("secret-focus");
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
      selectMode(
        modes[
          (modes.indexOf(currentMode()) + step + modes.length) % modes.length
        ],
      ),
    onToggleMap: () => (map.dialog.open ? map.dialog.close() : map.open()),
    onCloseMap: () => map.dialog.close(),
  });
  const map = new SeattleMap(data, controllerManager, travelTo, () =>
    stream.atlas(),
  );
  async function travelTo(x, z, heading = Math.PI) {
    if (traveling) return false;
    traveling = true;
    controllerManager.resetInput();
    touch.reset();
    gamepad.reset();
    showTravelStatus("Loading neighborhood…");
    try {
      await stream.ensure(x, z);
      const road = nearestRoad(data, x, z);
      teleport(road.x, road.z, heading);
      showTravelStatus("");
      return true;
    } catch (error) {
      showTravelStatus(error.message);
      return false;
    } finally {
      traveling = false;
    }
  }
  function teleport(x, z, heading = Math.PI) {
    document.body.classList.remove("secret-focus");
    controllerManager.teleportActiveTo(x, z, heading);
    flight?.reset();
    touch.reset();
    gamepad.reset();
    camera.resetForTeleport();
    cameraIndex = 0;
    $("camera-button").textContent = "Camera · V";
    map.draw();
  }
  async function selectMode(mode) {
    const request = ++modeRequest;
    let createFlight;
    if (mode === "blueangels") {
      try {
        createFlight = (await import("./seattle-blue.js")).createBlueAngels;
      } catch {
        if (request === modeRequest)
          showTravelStatus("Blue Angels could not load. Reload to retry.");
        return;
      }
      if (request !== modeRequest) return;
    }
    const p = controllerManager.getActiveEntity().position.clone();
    flight?.dispose();
    flight = null;
    controllerManager.setMode(mode === "blueangels" ? "helicopter" : mode);
    touch.setMode(controllerManager.activeMode);
    gamepad.reset();
    const road = nearestRoad(data, p.x, p.z);
    teleport(road.x, road.z, road.heading);
    if (mode === "helicopter")
      controllerManager.getActiveEntity().position.y = Math.max(
        150,
        Math.min(380, p.y),
      );
    if (createFlight) {
      controllerManager.getActiveEntity().position.y = Math.max(
        350,
        Math.min(1800, p.y),
      );
      flight = createFlight(scene, controllerManager);
    }
    $("blue-smoke").hidden = !flight;
    $("blue-smoke").setAttribute(
      "aria-pressed",
      String(flight?.stats().smoke ?? false),
    );
    camera.resetForTeleport();
    renderMode(mode);
  }
  function renderMode(mode) {
    document
      .querySelectorAll("button[data-mode]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.mode === mode)),
      );
    $("mode-label").textContent = modeNames[mode];
    $("control-hint").innerHTML =
      mode === "blueangels"
        ? "W / S speed · A / D turn · E / Q climb<br>B smoke · V camera · 1–5 travel mode"
        : mode === "helicopter"
          ? "WASD move · E / Q altitude<br>Drag to orbit · Scroll to zoom"
          : "WASD move · 1–5 travel mode<br>Drag to orbit · Scroll to zoom";
    document.body.dataset.mode = mode;
  }
  // Separate parked entities so mode changes never spawn on top of another player model.
  const start = DESTINATIONS[0];
  for (const [i, mode] of modes.slice(0, 4).entries()) {
    controllerManager.setMode(mode);
    const road = nearestRoad(
      data,
      start.arrival.x + i * 22,
      start.arrival.z + i * 20,
    );
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
  heli.heading = Math.atan2(
    start.x - heli.position.x,
    start.z - heli.position.z,
  );
  // Restore only finite, bounded Seattle state; never import the upstream New York save slot.
  try {
    const saved = JSON.parse(localStorage.getItem("slop-seattle-player-v1"));
    if (
      saved &&
      modes.includes(saved.mode) &&
      [saved.x, saved.z, saved.heading, saved.y].every(Number.isFinite) &&
      saved.x >= BOUNDS.minX - 6000 &&
      saved.x <= BOUNDS.maxX + 6000 &&
      saved.z >= BOUNDS.minZ - 6000 &&
      saved.z <= BOUNDS.maxZ + 6000
    ) {
      if (saved.mode === "blueangels") await selectMode(saved.mode);
      else controllerManager.setMode(saved.mode);
      await stream.ensure(saved.x, saved.z);
      teleport(saved.x, saved.z, saved.heading);
      if (["helicopter", "blueangels"].includes(saved.mode))
        controllerManager.teleportActiveTo(
          saved.x,
          saved.z,
          saved.heading,
          saved.y,
        );
      if (flight) {
        controllerManager.getActiveEntity().position.y = Math.max(
          350,
          Math.min(1800, saved.y),
        );
        flight.reset();
      }
      touch.setMode(controllerManager.activeMode);
      renderMode(currentMode());
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
          mode: currentMode(),
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
    button.addEventListener("click", async () => {
      if (!(await travelTo(d.arrival.x, d.arrival.z, d.arrival.heading)))
        return;
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
    .forEach((b) =>
      b.addEventListener("click", () => selectMode(b.dataset.mode)),
    );
  $("camera-button").addEventListener("click", cycleCamera);
  function toggleSmoke() {
    if (flight)
      $("blue-smoke").setAttribute(
        "aria-pressed",
        String(flight.toggleSmoke()),
      );
  }
  $("blue-smoke").addEventListener("click", toggleSmoke);
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
    .forEach((b) =>
      b.addEventListener("click", () => $(b.dataset.close).close()),
    );
  for (const id of ["atlas", "help"])
    $(id).addEventListener("close", () => {
      controllerManager.resetInput();
      touch.reset();
      gamepad.reset();
    });
  const applyTime = () => lighting.applyPreset($("time-select").value);
  $("time-select").addEventListener("change", applyTime);
  document.addEventListener("keydown", (e) => {
    if (
      e.target.matches("input,select,textarea") ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.repeat
    )
      return;
    if (e.key.toLowerCase() === "m") {
      e.preventDefault();
      map.dialog.open ? map.dialog.close() : map.open();
      return;
    }
    if (map.dialog.open || $("help").open || secrets?.isOpen()) return;
    if (/^[1-5]$/.test(e.key)) selectMode(modes[Number(e.key) - 1]);
    if (e.key.toLowerCase() === "b") toggleSmoke();
    if (e.key.toLowerCase() === "v") cycleCamera();
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
    )
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
        mode: currentMode(),
        blueAngels: flight?.stats() ?? { active: false },
        avatar: updatePlayerMaterials.avatarStats(camera.camera),
        x: e.position.x,
        y: e.position.y,
        z: e.position.z,
        heading: e.heading,
        camera: cameras[cameraIndex],
        time: lighting.activePresetId,
        buildings: city.buildingCount + stream.stats().buildings,
        roads: data.roads.length,
        streaming: stream.stats(),
        gpu: { ...renderer.info.memory },
        visuals: city.visualStats(),
        secrets: secrets?.stats() ?? { ready: false },
        startupMs: readyAt === null ? null : Math.round(readyAt - startedAt),
        shaderCompileMs,
        placeView: cameras[cameraIndex] === "landmark" ? selectedView : null,
      };
    },
  };
  status.textContent = "Compiling city shaders…";
  map.draw();
  camera.update(1 / 60, 0);
  city.rainier?.update(camera.currentPos);
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
    const modal = map.dialog.open || $("help").open || secrets?.isOpen();
    gamepad.setEnabled(!modal);
    touch.setEnabled(!modal);
    gamepad.update(dt);
    if (!modal && !traveling) {
      if (flight) {
        if (cameras[cameraIndex] !== "landmark")
          flight.update(dt, controllerManager.keys);
      } else controllerManager.update(dt, elapsed);
    } else controllerManager.resetInput();
    if (
      cameras[cameraIndex] === "landmark" &&
      Object.values(controllerManager.keys).some(Boolean)
    ) {
      cameraIndex = 0;
      camera.resetForTeleport();
      document.body.classList.remove("secret-focus");
      $("camera-button").textContent = "Camera · V";
    }
    camera.update(dt, elapsed);
    flight?.camera(camera, cameras[cameraIndex], dt);
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
      updatePlayerMaterials.frameAvatar(camera);
    }
    lighting.update(camera.currentPos);
    if (!traveling) stream.update(controllerManager.getActiveEntity().position);
    city.update(elapsed, readyAt === null ? null : camera.currentPos);
    secrets?.update(controllerManager.getActiveEntity().position, elapsed);
    updatePlayerMaterials();
    distantSky.update();
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
          : Math.hypot(landmark.x - p.position.x, landmark.z - p.position.z) <
              240
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
      // Coarse north skyline arrives after the first interactive frame, never on the boot critical path.
      requestAnimationFrame(() =>
        stream.loadOverview().catch((error) => showTravelStatus(error.message)),
      );
      requestAnimationFrame(() =>
        import("./seattle-secrets.js")
          .then(({ createSecrets }) => {
            secrets = createSecrets(city, {
              blocked: () => map.dialog.open || $("help").open || traveling,
              onModal: () => {
                controllerManager.resetInput();
                touch.reset();
                gamepad.reset();
              },
              look: (id, focus) => {
                document.body.classList.add("secret-focus");
                selectedPlace = DESTINATIONS.find((d) => d.id === id);
                selectedView = focus
                  ? resolveLandmarkView(
                      {
                        ...selectedPlace,
                        x: focus.center.x,
                        z: focus.center.z,
                      },
                      {
                        eye: [
                          focus.radius * 0.8,
                          focus.radius * 0.55,
                          focus.radius * 1.3,
                        ],
                        target: [0, 0, 0],
                        radius: Math.min(6, focus.radius * 0.12),
                      },
                      city.colliders,
                      focus.center.y,
                    )
                  : viewFor(selectedPlace);
                cameraIndex = cameras.indexOf("landmark");
                $("camera-button").textContent = "Place · V";
              },
            });
          })
          .catch((error) =>
            showTravelStatus("Discoveries could not load. Reload to retry."),
          ),
      );
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
