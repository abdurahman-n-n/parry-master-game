// Global leaderboard registry. Stores per-account total gems ever earned
// and the timestamp of the very first gem. Score favors more gems; ties
// (and ranking weight) reward earning gems earlier.

export type LeaderboardEntry = {
  nickname: string;
  gems: number;          // total gems ever earned (lifetime)
  firstGemAt: number;    // ms epoch of first gem earned (0 = none yet)
};

const LB_KEY = "parry.leaderboard";

function load(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LB_KEY);
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
  } catch {
    return [];
  }
}
function save(list: LeaderboardEntry[]) {
  localStorage.setItem(LB_KEY, JSON.stringify(list));
}

export function recordGemGain(nickname: string, gained: number) {
  if (!nickname || gained <= 0) return;
  const list = load();
  const idx = list.findIndex(
    (e) => e.nickname.toLowerCase() === nickname.toLowerCase(),
  );
  const now = Date.now();
  if (idx === -1) {
    list.push({ nickname, gems: gained, firstGemAt: now });
  } else {
    const e = list[idx];
    e.gems += gained;
    if (!e.firstGemAt) e.firstGemAt = now;
  }
  save(list);
}

// Score: gems dominate; among equal gems, earlier firstGemAt wins.
// Combined into one number so a single sort produces the ranking.
export function scoreOf(e: LeaderboardEntry): number {
  // 1e13 ~ year 2286 in ms; safely larger than any real firstGemAt.
  const earliness = e.firstGemAt ? 1e13 - e.firstGemAt : 0;
  return e.gems * 1e13 + earliness;
}

export function getLeaderboard(): LeaderboardEntry[] {
  return load()
    .filter((e) => e.gems > 0)
    .sort((a, b) => scoreOf(b) - scoreOf(a));
}
