// Per-account best wave reached in the Infinite Dungeon.

export type InfiniteEntry = {
  nickname: string;
  bestWave: number;
  achievedAt: number;
};

const LB_KEY = "parry.infiniteLeaderboard";

function load(): InfiniteEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LB_KEY);
    return raw ? (JSON.parse(raw) as InfiniteEntry[]) : [];
  } catch {
    return [];
  }
}
function save(list: InfiniteEntry[]) {
  localStorage.setItem(LB_KEY, JSON.stringify(list));
}

/** Record a run's final cleared-wave count. Keeps the highest per account. */
export function recordInfiniteRun(nickname: string, wavesCleared: number) {
  if (!nickname || wavesCleared <= 0) return;
  const list = load();
  const idx = list.findIndex(
    (e) => e.nickname.toLowerCase() === nickname.toLowerCase(),
  );
  if (idx === -1) {
    list.push({ nickname, bestWave: wavesCleared, achievedAt: Date.now() });
  } else if (wavesCleared > list[idx].bestWave) {
    list[idx] = { ...list[idx], bestWave: wavesCleared, achievedAt: Date.now() };
  }
  save(list);
}

export function getBestWaveFor(nickname: string): number {
  if (!nickname) return 0;
  const list = load();
  const e = list.find((x) => x.nickname.toLowerCase() === nickname.toLowerCase());
  return e?.bestWave ?? 0;
}

export function getInfiniteLeaderboard(): InfiniteEntry[] {
  return load()
    .filter((e) => e.bestWave > 0)
    .sort((a, b) => b.bestWave - a.bestWave || a.achievedAt - b.achievedAt)
    .slice(0, 100);
}
