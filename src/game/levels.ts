import type { AttackPattern, CharacterDef, EnemyDef } from "./types";

const mk = (
  id: string,
  kind: AttackPattern["kind"],
  windupMs: number,
  parryWindowMs: number,
): AttackPattern => ({
  id, kind, windupMs, parryWindowMs, damage: 1, reflect: 1,
});

export const TOTAL_LEVELS = 30;

export const DEFAULT_CHARACTER: CharacterDef = {
  id: "hero",
  name: "The Kid",
  maxHp: 1,
  color: "oklch(0.97 0.01 280)",
  ability: { name: "Determination", description: "One soul. One chance." },
};

const REGULAR_TEMPLATES = [
  {
    id: "knight", name: "Knight", title: "Balanced rhythm",
    color: "oklch(0.70 0.18 285)", shape: "pentagon" as const,
    attacks: [mk("slash-a", "slash", 700, 160), mk("thrust-a", "thrust", 540, 130)],
    cadenceMs: [800, 1300] as [number, number],
  },
  {
    id: "knight", name: "Shade", title: "Fast strikes",
    color: "oklch(0.55 0.20 295)", shape: "diamond" as const,
    attacks: [mk("thrust-fast", "thrust", 420, 110), mk("slash-fast", "slash", 520, 130)],
    cadenceMs: [700, 1200] as [number, number],
  },
  {
    id: "knight", name: "Phantom", title: "Erratic tempo",
    color: "oklch(0.85 0.18 200)", shape: "circle" as const,
    attacks: [mk("p-slash", "slash", 900, 140), mk("p-thrust", "thrust", 460, 110), mk("p-heavy", "heavy", 1100, 170)],
    cadenceMs: [800, 1500] as [number, number],
  },
];

const BOSS_TEMPLATES = [
  {
    id: "colossus", name: "Colossus", title: "Heavy hitter",
    color: "oklch(0.65 0.22 30)", shape: "hex" as const,
    attacks: [mk("c-heavy", "heavy", 1100, 200), mk("c-slash", "slash", 800, 150)],
    cadenceMs: [900, 1400] as [number, number],
  },
  {
    id: "wraith", name: "Wraith", title: "Erratic strikes",
    color: "oklch(0.60 0.20 310)", shape: "star" as const,
    attacks: [mk("w-thrust", "thrust", 380, 100), mk("w-slash", "slash", 560, 130), mk("w-heavy", "heavy", 950, 170)],
    cadenceMs: [650, 1100] as [number, number],
  },
  {
    id: "sovereign", name: "Sovereign", title: "Crown of edges",
    color: "oklch(0.55 0.22 70)", shape: "hex" as const,
    attacks: [mk("s-heavy", "heavy", 1000, 180), mk("s-slash", "slash", 680, 140), mk("s-thrust", "thrust", 440, 110)],
    cadenceMs: [700, 1200] as [number, number],
  },
];

/** Levels are 1-indexed. Every 10th level is a boss. */
export function enemyForLevel(level: number): EnemyDef {
  const tier = Math.floor((level - 1) / 10); // 0 for levels 1..10
  if (level % 10 === 0) {
    const tpl = BOSS_TEMPLATES[Math.min(BOSS_TEMPLATES.length - 1, tier)];
    return {
      ...tpl,
      isBoss: true,
      maxHp: 6 + tier * 2,
      title: `Level ${level} · Boss`,
    };
  }
  // Deterministic pick so each level has a stable enemy.
  const tpl = REGULAR_TEMPLATES[(level - 1) % REGULAR_TEMPLATES.length];
  // 3-4 HP, +1 per 10-level tier. Even levels get 4 hp, odd get 3.
  const baseHp = 3 + (level % 2 === 0 ? 1 : 0);
  return {
    ...tpl,
    maxHp: baseHp + tier,
    title: `Level ${level}`,
  };
}

/** Minion that accompanies the boss in a boss fight. */
export function minionForLevel(level: number): EnemyDef {
  const tier = Math.floor((level - 1) / 10);
  const tpl = REGULAR_TEMPLATES[(level - 1) % REGULAR_TEMPLATES.length];
  return {
    ...tpl,
    maxHp: 2 + tier,
    title: `Level ${level} · Minion`,
  };
}

// ----- Level progress persistence -----
const BEATEN_KEY = "parry.beatenLevels";

export function getBeatenLevels(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const arr = JSON.parse(localStorage.getItem(BEATEN_KEY) || "[]") as number[];
    return new Set(arr);
  } catch { return new Set(); }
}
export function markLevelBeaten(level: number) {
  const s = getBeatenLevels();
  s.add(level);
  localStorage.setItem(BEATEN_KEY, JSON.stringify([...s]));
}
export function isLevelUnlocked(level: number): boolean {
  if (level <= 1) return true;
  return getBeatenLevels().has(level - 1);
}

/** Reward for finishing a level. Replays pay 1/3 (floor). */
export function rewardForLevel(level: number, alreadyBeaten: boolean) {
  const base = { credits: 15, gems: 1 };
  if (!alreadyBeaten) return base;
  return {
    credits: Math.floor(base.credits / 3),
    gems: Math.floor(base.gems / 3),
  };
}
