// Per-user localStorage namespace + cloud mirroring.
// Each account gets its own bucket so progress, currency, inventory,
// settings, and level data don't bleed between accounts. Writes are
// also mirrored to the backend so accounts work across devices.

import { pushSave, pullSaves } from "@/lib/cloudSave.functions";

let activeUser: string | null = null;

export function setActiveUser(email: string | null) {
  activeUser = email;
}

export function getActiveUser(): string | null {
  return activeUser;
}

// Build a per-user key. If no user is active we fall back to the bare key
// so the unscoped legacy data is still readable (used only for migration).
export function lsKey(base: string): string {
  return activeUser ? `${base}::user::${activeUser.toLowerCase()}` : base;
}

// Per-user keys we sync to the cloud. We store under the base key on the
// server (no per-user suffix needed — the account_id scopes it already).
const SYNCED_BASES = new Set<string>([
  "parry-credits",
  "parry-gems",
  "parry.inventory",
  "parry.equippedSkin",
  "parry.equippedAbility",
  "parry.achievements",
  "parry.equippedTitle",
  "parry.upgradeCounts",
  "parry.beatenLevels",
  "parry-accent-rgb",
  "parry.infinite.bestWave",
  "parry.infinite.bestWaveAt",
  "parry.lifetimeGems",
]);

// Keys wiped on "Start New Season". For these, a missing cloud value is
// authoritative — clear local instead of re-uploading stale local data
// (which would otherwise undo the season reset for everyone else).
const SEASON_RESET_BASES = new Set<string>([
  "parry-gems",
  "parry.lifetimeGems",
  "parry.infinite.bestWave",
  "parry.infinite.bestWaveAt",
]);



// Debounced cloud push per key.
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
function schedulePush(base: string, value: string | null) {
  if (!activeUser) return;
  const existing = pendingTimers.get(base);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    pendingTimers.delete(base);
    pushSave({ data: { key: base, value } }).catch(() => {
      /* best-effort; local copy is still saved */
    });
  }, 400);
  pendingTimers.set(base, t);
}

// Install a one-time interceptor on localStorage so any setItem/removeItem
// on a synced per-user key also pushes to the cloud.
let installed = false;
function installMirror() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const ls = window.localStorage;
  const origSet = ls.setItem.bind(ls);
  const origRemove = ls.removeItem.bind(ls);

  ls.setItem = (k: string, v: string) => {
    origSet(k, v);
    const base = parseBase(k);
    if (base && SYNCED_BASES.has(base)) schedulePush(base, v);
  };
  ls.removeItem = (k: string) => {
    origRemove(k);
    const base = parseBase(k);
    if (base && SYNCED_BASES.has(base)) schedulePush(base, null);
  };
}

function parseBase(scopedKey: string): string | null {
  const idx = scopedKey.indexOf("::user::");
  if (idx === -1) return null;
  return scopedKey.slice(0, idx);
}

// Called on login: merge cloud + local progress.
// - If the cloud has a value for a key, write it into the local per-user bucket.
// - If the cloud doesn't have it but local does, push the local value up so
//   progress made before signing into the cloud isn't lost.
let hydrating = false;
export async function hydrateFromCloud(email: string) {
  if (typeof window === "undefined") return;
  installMirror();
  setActiveUser(email);
  try {
    const res = await pullSaves({ data: {} });
    const saves = res.saves ?? {};
    hydrating = true;
    const userKey = email.toLowerCase();

    for (const base of SYNCED_BASES) {
      const scopedKey = `${base}::user::${userKey}`;
      const cloudValue = saves[base];
      const localValue = window.localStorage.getItem(scopedKey);

      if (cloudValue !== undefined) {
        // Cloud wins — overwrite local copy.
        window.localStorage.setItem(scopedKey, cloudValue);
        const pending = pendingTimers.get(base);
        if (pending) {
          clearTimeout(pending);
          pendingTimers.delete(base);
        }
      } else if (SEASON_RESET_BASES.has(base)) {
        // Cloud is absent for a season-reset key: the season was reset.
        // Clear the local mirror so we don't push stale data back up.
        if (localValue !== null) window.localStorage.removeItem(scopedKey);
      } else if (localValue !== null) {
        // First-time sync on this account: upload the local value.
        schedulePush(base, localValue);
      }
    }
  } catch {
    // Offline: keep whatever's local. The mirror will retry on next write.
  } finally {
    hydrating = false;
  }
}


// Legacy keys carried over from the original local-only auth flow.
const LEGACY_KEYS = [
  "parry-credits",
  "parry-gems",
  "parry.inventory",
  "parry.equippedSkin",
  "parry.equippedAbility",
  "parry.achievements",
  "parry.equippedTitle",
  "parry.upgradeCounts",
  "parry.beatenLevels",
  "parry-accent-rgb",
];

const MIGRATION_FLAG = "parry.legacyMigrated";

// One-time migration: copy any legacy (unscoped) progress into the given
// user's bucket the first time anyone logs in.
export function migrateLegacyIfNeeded(email: string) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG)) return;
  const userKey = email.toLowerCase();
  for (const base of LEGACY_KEYS) {
    const legacy = localStorage.getItem(base);
    if (legacy === null) continue;
    const scoped = `${base}::user::${userKey}`;
    if (localStorage.getItem(scoped) === null) {
      localStorage.setItem(scoped, legacy);
    }
    localStorage.removeItem(base);
  }
  localStorage.setItem(MIGRATION_FLAG, "1");
}
