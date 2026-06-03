// Per-account lifetime gem tracking. The leaderboard itself is now read
// from the cloud (see getCloudLeaderboards in cloudSave.functions.ts); this
// module only records the local per-user lifetime totals, which mirror to
// the cloud automatically via storage.ts.

const LIFETIME_KEY = "parry.lifetimeGems";

function userKey(base: string, nickname: string) {
  return `${base}::user::${nickname.toLowerCase()}`;
}

export function recordGemGain(nickname: string, gained: number) {
  if (typeof window === "undefined") return;
  if (!nickname || gained <= 0) return;
  const lk = userKey(LIFETIME_KEY, nickname);
  const prev = Number(localStorage.getItem(lk) ?? 0) || 0;
  localStorage.setItem(lk, String(prev + gained));
}
