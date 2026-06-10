import type { AttackPattern, CharacterDef, EnemyDef } from "./types";
import { lsKey } from "./storage";


const mk = (
  id: string,
  kind: AttackPattern["kind"],
  windupMs: number,
  parryWindowMs: number,
): AttackPattern => ({
  id, kind, windupMs, parryWindowMs, damage: 1, reflect: 1,
});

export const TOTAL_LEVELS = 100;

export const DEFAULT_CHARACTER: CharacterDef = {
  id: "hero",
  name: "Sword Master",
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
    id: "shade", name: "Shade", title: "Fast strikes",
    color: "oklch(0.55 0.20 295)", shape: "diamond" as const,
    attacks: [mk("thrust-fast", "thrust", 420, 110), mk("slash-fast", "slash", 520, 130)],
    cadenceMs: [700, 1200] as [number, number],
  },
  {
    id: "phantom", name: "Phantom", title: "Erratic tempo",
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
  {
    id: "leviathan", name: "Leviathan", title: "Tidal force",
    color: "oklch(0.50 0.20 230)", shape: "circle" as const,
    attacks: [mk("l-heavy", "heavy", 950, 170), mk("l-slash", "slash", 720, 140), mk("l-thrust", "thrust", 480, 120)],
    cadenceMs: [750, 1250] as [number, number],
  },
  {
    id: "inferno", name: "Inferno", title: "Burning fury",
    color: "oklch(0.60 0.24 25)", shape: "star" as const,
    attacks: [mk("i-slash", "slash", 540, 120), mk("i-thrust", "thrust", 380, 95), mk("i-heavy", "heavy", 880, 160)],
    cadenceMs: [600, 1050] as [number, number],
  },
  {
    id: "voidlord", name: "Voidlord", title: "Eater of light",
    color: "oklch(0.30 0.15 290)", shape: "pentagon" as const,
    attacks: [mk("v-heavy", "heavy", 1050, 180), mk("v-slash", "slash", 620, 130), mk("v-thrust", "thrust", 400, 100)],
    cadenceMs: [650, 1100] as [number, number],
  },
  {
    id: "warden", name: "Warden", title: "Iron precision",
    color: "oklch(0.45 0.10 220)", shape: "hex" as const,
    attacks: [mk("wd-slash", "slash", 580, 125), mk("wd-thrust", "thrust", 360, 90), mk("wd-heavy", "heavy", 900, 165)],
    cadenceMs: [600, 1000] as [number, number],
  },
  {
    id: "seraph", name: "Seraph", title: "Radiant blades",
    color: "oklch(0.85 0.18 95)", shape: "star" as const,
    attacks: [mk("sr-slash", "slash", 500, 115), mk("sr-thrust", "thrust", 340, 90), mk("sr-heavy", "heavy", 820, 155)],
    cadenceMs: [550, 950] as [number, number],
  },
  {
    id: "tyrant", name: "Tyrant", title: "Unchained wrath",
    color: "oklch(0.40 0.22 15)", shape: "hex" as const,
    attacks: [mk("t-heavy", "heavy", 950, 170), mk("t-slash", "slash", 540, 120), mk("t-thrust", "thrust", 320, 85)],
    cadenceMs: [500, 900] as [number, number],
  },
  {
    id: "ancient", name: "Ancient", title: "Born of stars",
    color: "oklch(0.70 0.25 180)", shape: "circle" as const,
    attacks: [mk("a-heavy", "heavy", 880, 160), mk("a-slash", "slash", 500, 115), mk("a-thrust", "thrust", 300, 80)],
    cadenceMs: [480, 850] as [number, number],
  },
];

/** One unique minion type per boss tier (10/20/30). */
const MINION_TEMPLATES = [
  {
    id: "squire", name: "Squire", title: "Boss minion",
    color: "oklch(0.62 0.14 35)", shape: "triangle" as const,
    attacks: [mk("sq-slash", "slash", 620, 140), mk("sq-thrust", "thrust", 480, 120)],
    cadenceMs: [850, 1300] as [number, number],
  },
  {
    id: "shade", name: "Shade", title: "Boss minion",
    color: "oklch(0.55 0.18 305)", shape: "diamond" as const,
    attacks: [mk("sh-thrust", "thrust", 400, 110), mk("sh-slash", "slash", 520, 130)],
    cadenceMs: [700, 1150] as [number, number],
  },
  {
    id: "herald", name: "Herald", title: "Boss minion",
    color: "oklch(0.60 0.18 80)", shape: "star" as const,
    attacks: [mk("h-slash", "slash", 560, 130), mk("h-heavy", "heavy", 900, 160)],
    cadenceMs: [750, 1200] as [number, number],
  },
  {
    id: "tidecaller", name: "Tidecaller", title: "Boss minion",
    color: "oklch(0.55 0.16 230)", shape: "circle" as const,
    attacks: [mk("tc-thrust", "thrust", 420, 110), mk("tc-slash", "slash", 540, 130)],
    cadenceMs: [700, 1150] as [number, number],
  },
  {
    id: "emberkin", name: "Emberkin", title: "Boss minion",
    color: "oklch(0.65 0.22 30)", shape: "triangle" as const,
    attacks: [mk("em-slash", "slash", 480, 115), mk("em-thrust", "thrust", 360, 95)],
    cadenceMs: [600, 1000] as [number, number],
  },
  {
    id: "voidling", name: "Voidling", title: "Boss minion",
    color: "oklch(0.35 0.14 290)", shape: "diamond" as const,
    attacks: [mk("vl-slash", "slash", 520, 120), mk("vl-heavy", "heavy", 850, 155)],
    cadenceMs: [650, 1100] as [number, number],
  },
  {
    id: "ironguard", name: "Ironguard", title: "Boss minion",
    color: "oklch(0.50 0.10 220)", shape: "hex" as const,
    attacks: [mk("ig-thrust", "thrust", 340, 90), mk("ig-slash", "slash", 500, 115)],
    cadenceMs: [580, 980] as [number, number],
  },
  {
    id: "lightspur", name: "Lightspur", title: "Boss minion",
    color: "oklch(0.82 0.16 95)", shape: "star" as const,
    attacks: [mk("ls-slash", "slash", 460, 110), mk("ls-thrust", "thrust", 320, 85)],
    cadenceMs: [520, 920] as [number, number],
  },
  {
    id: "bloodclaw", name: "Bloodclaw", title: "Boss minion",
    color: "oklch(0.45 0.22 15)", shape: "triangle" as const,
    attacks: [mk("bc-slash", "slash", 480, 110), mk("bc-thrust", "thrust", 300, 80)],
    cadenceMs: [480, 880] as [number, number],
  },
  {
    id: "starborn", name: "Starborn", title: "Boss minion",
    color: "oklch(0.72 0.22 180)", shape: "diamond" as const,
    attacks: [mk("sb-thrust", "thrust", 280, 75), mk("sb-slash", "slash", 440, 105)],
    cadenceMs: [460, 840] as [number, number],
  },
];

/** 0 for levels 1..10, 1 for 11..20, 2 for 21..30. */
export function levelTier(level: number): number {
  return Math.floor((level - 1) / 10);
}

/** Speed up windups by 5% per tier, and shrink parry window in proportion. */
function scaleAttacks(attacks: AttackPattern[], tier: number): AttackPattern[] {
  const f = 1 - 0.05 * tier;
  return attacks.map((a) => ({
    ...a,
    windupMs: Math.max(120, Math.round(a.windupMs * f)),
    parryWindowMs: Math.max(60, Math.round(a.parryWindowMs * f)),
  }));
}

/** Levels are 1-indexed. Every 10th level is a boss. */
export function enemyForLevel(level: number): EnemyDef {
  const tier = levelTier(level);
  if (level % 10 === 0) {
    const tpl = BOSS_TEMPLATES[Math.min(BOSS_TEMPLATES.length - 1, tier)];
    return {
      ...tpl,
      attacks: scaleAttacks(tpl.attacks, tier),
      isBoss: true,
      maxHp: 6 + tier * 2 + tier, // +1 HP per tier on top of existing scaling
      title: `Level ${level} · Boss`,
    };
  }
  const tpl = REGULAR_TEMPLATES[(level - 1) % REGULAR_TEMPLATES.length];
  const baseHp = 3 + (level % 2 === 0 ? 1 : 0);
  return {
    ...tpl,
    attacks: scaleAttacks(tpl.attacks, tier),
    maxHp: baseHp + tier + tier, // tier from prior rule + new +1/tier
    title: `Level ${level}`,
  };
}

/** Minion that accompanies the boss in a boss fight. Unique per boss tier. */
export function minionForLevel(level: number): EnemyDef {
  const tier = levelTier(level);
  const tpl = MINION_TEMPLATES[Math.min(MINION_TEMPLATES.length - 1, tier)];
  return {
    ...tpl,
    attacks: scaleAttacks(tpl.attacks, tier),
    maxHp: 2 + tier + tier,
    title: `Level ${level} · Minion`,
  };
}


// ----- Level progress persistence -----
const BEATEN_KEY = "parry.beatenLevels";

export function getBeatenLevels(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const arr = JSON.parse(localStorage.getItem(lsKey(BEATEN_KEY)) || "[]") as number[];
    return new Set(arr);
  } catch { return new Set(); }
}
export function markLevelBeaten(level: number) {
  const s = getBeatenLevels();
  s.add(level);
  localStorage.setItem(lsKey(BEATEN_KEY), JSON.stringify([...s]));
}

export function isLevelUnlocked(level: number): boolean {
  if (level <= 1) return true;
  return getBeatenLevels().has(level - 1);
}

/** Reward for finishing a level. Replays pay 1/3 (floor). Bosses pay double. */
export function rewardForLevel(level: number, alreadyBeaten: boolean, isBoss = false) {
  const tier = levelTier(level);
  const mult = isBoss ? 2 : 1;
  const base = { credits: (15 + 5 * tier) * mult, gems: 1 * mult };
  if (!alreadyBeaten) return base;
  return {
    credits: Math.floor(base.credits / 3),
    gems: Math.floor(base.gems / 3),
  };
}

