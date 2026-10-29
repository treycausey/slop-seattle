import * as THREE from "three/webgpu";
import { surface } from "./seattle-materials.js";
import { secretModel } from "./seattle-secrets-models.js";
import {
  SECRETS,
  createSecretState,
  SECRET_LIMIT,
  SECRET_DURATION,
} from "./seattle-secrets-plan.js";
const SLOT = "slop-seattle-discoveries-v1";
export function createSecrets(city, options) {
  let saved = null;
  try {
    saved = localStorage.getItem(SLOT);
  } catch {}
  const state = createSecretState(saved),
    active = new Map(),
    p = {
      ...city.palette,
      sun: surface("metal", 0xe3b744),
      navy: surface("metal", 0x122c49),
      lime: surface("metal", 0x77c738),
      pink: surface("metal", 0xe78fb9),
      glow: new THREE.MeshBasicNodeMaterial({ color: 0xffd985 }),
    };
  let now = 0,
    nearest = null,
    nearby = [],
    lastQuery = -Infinity,
    disposed = false,
    lastSecret = null,
    activations = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const row = document.createElement("aside");
  row.className = "secret-controls";
  row.setAttribute("aria-label", "Nearby discoveries");
  const discover = document.createElement("button"),
    look = document.createElement("button"),
    journal = document.createElement("button"),
    next = document.createElement("button");
  discover.type = look.type = journal.type = next.type = "button";
  discover.id = "secret-discover";
  look.id = "secret-look";
  journal.id = "secret-journal";
  next.id = "secret-next";
  next.textContent = "Another clue";
  next.onclick = () => {
    if (blocked() || nearby.length < 2) return;
    nearest = nearby[(nearby.indexOf(nearest) + 1) % nearby.length];
    refresh();
  };
  look.textContent = "Look";
  look.hidden = true;
  row.append(discover, next, look, journal);
  document.body.append(row);
  const toast = document.createElement("p");
  toast.id = "secret-toast";
  toast.setAttribute("role", "status");
  toast.hidden = true;
  document.body.append(toast);
  const dialog = document.createElement("dialog");
  dialog.id = "secret-book";
  dialog.setAttribute("aria-labelledby", "secret-book-title");
  const head = document.createElement("div");
  head.className = "dialog-head";
  const title = document.createElement("h2");
  title.id = "secret-book-title";
  title.textContent = "Seattle discoveries";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Close";
  close.onclick = () => dialog.close();
  head.append(title, close);
  const list = document.createElement("ul"),
    remaining = document.createElement("p");
  dialog.append(head, list, remaining);
  document.body.append(dialog);
  const resetInput = () => options.onModal?.();
  dialog.addEventListener("close", resetInput);
  function book() {
    list.replaceChildren();
    for (const s of SECRETS)
      if (state.found.has(s.id)) {
        const li = document.createElement("li"),
          strong = document.createElement("strong");
        strong.textContent = s.title;
        li.append(strong, document.createTextNode(" — " + s.message));
        list.append(li);
      }
    remaining.textContent = `${SECRETS.length - state.found.size} still waiting to be discovered.`;
  }
  journal.onclick = () => {
    book();
    resetInput();
    dialog.showModal();
  };
  function remove(id) {
    const a = active.get(id);
    if (a) {
      a.model.dispose();
      active.delete(id);
    }
  }
  const blocked = () => dialog.open || options.blocked();
  function trigger() {
    if (disposed || blocked() || !state.trigger(nearest, now)) return;
    const s = nearest;
    remove(s.id);
    while (active.size >= SECRET_LIMIT) remove(active.keys().next().value);
    const model = secretModel(s, p, city);
    city.group.add(model.group);
    active.set(s.id, { model, start: now, secret: s });
    activations++;
    lastSecret = s;
    try {
      localStorage.setItem(SLOT, state.serialize());
    } catch {}
    toast.textContent = s.title + " · " + s.message;
    toast.hidden = false;
    look.hidden = false;
    refresh();
  }
  function refresh() {
    document.body.classList.toggle(
      "has-discoveries",
      !!nearest || state.found.size > 0,
    );
    row.hidden = blocked();
    discover.hidden = !nearest;
    next.hidden = nearby.length < 2;
    discover.disabled = !!nearest && state.remaining(nearest.id, now) > 0;
    const text = nearest
      ? discover.disabled
        ? "Let it settle…"
        : nearest.clue + " · F"
      : "";
    if (discover.textContent !== text) discover.textContent = text;
    journal.hidden = state.found.size === 0;
    const count = `Discoveries · ${state.found.size}/${SECRETS.length}`;
    if (journal.textContent !== count) journal.textContent = count;
  }
  discover.onclick = trigger;
  look.onclick = () => {
    if (!lastSecret) return;
    const model = active.get(lastSecret.id)?.model;
    if (
      model &&
      !["troll", "rocket", "cloud", "eruption"].includes(lastSecret.id)
    ) {
      const bounds = new THREE.Box3().setFromObject(model.group),
        center = bounds.getCenter(new THREE.Vector3()),
        radius = Math.max(
          18,
          bounds.getSize(new THREE.Vector3()).length() * 1.2,
        );
      options.look(lastSecret.place, { center, radius });
    } else options.look(lastSecret.place);
  };
  function keydown(e) {
    if (
      e.key.toLowerCase() !== "f" ||
      e.repeat ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.target.matches("input,select,textarea")
    )
      return;
    if (!blocked() && nearest) {
      e.preventDefault();
      trigger();
    }
  }
  document.addEventListener("keydown", keydown);
  refresh();
  return {
    isOpen: () => dialog.open,
    update(position, time) {
      if (disposed) return;
      now = time;
      for (const [id, a] of active) {
        const v = (now - a.start) / (a.secret.duration ?? SECRET_DURATION);
        if (
          v >= 1 ||
          (a.secret.id !== "eruption" &&
            Math.hypot(position.x - a.secret.x, position.z - a.secret.z) > 420)
        ) {
          remove(id);
          continue;
        }
        a.model.update(
          reduced.matches ? 0.5 : Math.max(0.001, v),
          reduced.matches ? 0 : now,
        );
      }
      if (now - lastQuery > 0.2) {
        nearby = state.nearby(position);
        if (!nearby.includes(nearest)) nearest = nearby[0] ?? null;
        lastQuery = now;
        refresh();
        if (active.size === 0) toast.hidden = true;
      }
    },
    stats() {
      let meshes = 0,
        geometryBytes = 0;
      for (const a of active.values())
        a.model.group.traverse((o) => {
          if (o.isMesh) {
            meshes++;
            geometryBytes +=
              Object.values(o.geometry.attributes).reduce(
                (n, a) => n + a.array.byteLength,
                0,
              ) + (o.geometry.index?.array.byteLength ?? 0);
          }
        });
      return {
        ready: true,
        total: SECRETS.length,
        found: state.found.size,
        foundIds: [...state.found],
        nearest: nearest?.id ?? null,
        nearbyIds: nearby.map((s) => s.id),
        resident: active.size,
        limit: SECRET_LIMIT,
        activeIds: [...active.keys()],
        effects: [...active.values()]
          .filter((a) => a.model.stats)
          .map((a) => ({ id: a.secret.id, ...a.model.stats() })),
        poses: [...active.values()].map((a) => ({
          id: a.secret.id,
          position: a.model.group.position.toArray(),
          rotation: a.model.group.rotation.toArray(),
          scale: a.model.group.scale.toArray(),
        })),
        activations,
        meshes,
        geometryBytes,
        reducedMotion: reduced.matches,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const id of [...active.keys()]) remove(id);
      document.removeEventListener("keydown", keydown);
      row.remove();
      toast.remove();
      dialog.remove();
      p.glow.dispose();
      document.body.classList.remove("has-discoveries");
      nearest = null;
      lastSecret = null;
    },
  };
}
