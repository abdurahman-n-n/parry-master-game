// Per-user localStorage namespace.
// Each account gets its own bucket so progress, currency, inventory,
// settings, and level data don't bleed between accounts.

let activeUser: string | null = null;

export function setActiveUser(nickname: string | null) {
  activeUser = nickname;
}

export function getActiveUser(): string | null {
  return activeUser;
}

// Build a per-user key. If no user is active we fall back to the bare key
// so the unscoped legacy data is still readable (used only for migration).
export function lsKey(base: string): string {
  return activeUser ? `${base}::user::${activeUser.toLowerCase()}` : base;
}

// Keys that get migrated from the unscoped/legacy bucket into the first
// account that logs in after the multi-user system was added.
const LEGACY_KEYS = [
  "parry-credits",
  "parry-gems",
  "parry.inventory",
  "parry.equippedSkin",
  "parry.equippedAbility",
  "parry.upgradeCounts",
  "parry.beatenLevels",
  "parry-accent-rgb",
];

const MIGRATION_FLAG = "parry.legacyMigrated";

// One-time migration: copy any legacy (unscoped) progress into the given
// nickname's bucket the first time anyone logs in. Subsequent accounts
// start from zero.
export function migrateLegacyIfNeeded(nickname: string) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG)) return;
  const nick = nickname.toLowerCase();
  for (const base of LEGACY_KEYS) {
    const legacy = localStorage.getItem(base);
    if (legacy === null) continue;
    const scoped = `${base}::user::${nick}`;
    if (localStorage.getItem(scoped) === null) {
      localStorage.setItem(scoped, legacy);
    }
    localStorage.removeItem(base);
  }
  localStorage.setItem(MIGRATION_FLAG, "1");
}
