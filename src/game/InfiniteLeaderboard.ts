// Per-account best wave tracking. The leaderboard itself is read from the
// cloud (see getCloudLeaderboards in cloudSave.functions.ts); this module
// only records the local per-user best wave + timestamp, which mirror to
// the cloud automatically via storage.ts.

const BEST_KEY = "parry.infinite.bestWave";
const BEST_AT_KEY = "parry.infinite.bestWaveAt";

function userKey(base: string, nickname: string) {
  return `${base}::user::${nickname.toLowerCase()}`;
}

export function recordInfiniteRun(nickname: string, wavesCleared: number) {
  if (typeof window === "undefined") return;
  if (!nickname || wavesCleared <= 0) return;
  const bk = userKey(BEST_KEY, nickname);
  const ak = userKey(BEST_AT_KEY, nickname);
  const prev = Number(localStorage.getItem(bk) ?? 0) || 0;
  if (wavesCleared > prev) {
    localStorage.setItem(bk, String(wavesCleared));
    localStorage.setItem(ak, String(Date.now()));
  }
}

export function getBestWaveFor(nickname: string): number {
  if (typeof window === "undefined" || !nickname) return 0;
  return Number(localStorage.getItem(userKey(BEST_KEY, nickname)) ?? 0) || 0;
}
