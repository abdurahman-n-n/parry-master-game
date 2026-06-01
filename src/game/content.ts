import type { AttackPattern, CharacterDef, EnemyDef } from "./types";

// Sudden-death for the player; regulars die in 1 parry; bosses take 5-10.

const mk = (
  id: string,
  kind: AttackPattern["kind"],
  windupMs: number,
  parryWindowMs: number,
): AttackPattern => ({
  id,
  kind,
  windupMs,
  parryWindowMs,
  damage: 1, // any hit kills the player
  reflect: 1, // each successful parry = 1 wound
});

export const DEFAULT_CHARACTER: CharacterDef = {
  id: "hero",
  name: "The Kid",
  maxHp: 1,
  color: "oklch(0.97 0.01 280)",
  ability: { name: "Determination", description: "One soul. One chance." },
};

// ----- Regular enemies: 1 parry = dead -----
export const REGULAR_ENEMIES: EnemyDef[] = [
  {
    id: "hollow-knight",
    name: "Knight",
    title: "Balanced rhythm",
    maxHp: 1,
    color: "oklch(0.70 0.18 285)",
    shape: "pentagon",
    attacks: [
      mk("slash-a", "slash", 680, 140),
      mk("thrust-a", "thrust", 520, 120),
    ],
    cadenceMs: [500, 850],
  },
  {
    id: "shade",
    name: "Knight",
    title: "Fast · tight windows",
    maxHp: 1,
    color: "oklch(0.55 0.20 295)",
    shape: "diamond",
    attacks: [
      mk("thrust-fast", "thrust", 360, 85),
      mk("thrust-faster", "thrust", 280, 70),
    ],
    cadenceMs: [280, 520],
  },
  {
    id: "phantom",
    name: "Knight",
    title: "Erratic tempo",
    maxHp: 1,
    color: "oklch(0.85 0.18 200)",
    shape: "circle",
    attacks: [
      mk("p-slash", "slash", 900, 110),
      mk("p-thrust", "thrust", 380, 95),
      mk("p-heavy", "heavy", 1200, 150),
    ],
    cadenceMs: [350, 950],
  },
  {
    id: "twin-fang",
    name: "Knight",
    title: "Chaining strikes",
    maxHp: 2,
    color: "oklch(0.78 0.20 130)",
    shape: "triangle",
    attacks: [
      mk("tf-a", "slash", 460, 100),
      mk("tf-b", "thrust", 420, 95),
    ],
    cadenceMs: [240, 460],
  },
];

// ----- Bosses: 5-10 parries to kill, appear every 5th wave -----
export const BOSSES: EnemyDef[] = [
  {
    id: "colossus",
    name: "Colossus",
    title: "Wave 5 · slow & heavy",
    maxHp: 8,
    isBoss: true,
    color: "oklch(0.65 0.22 30)",
    shape: "hex",
    attacks: [
      mk("c-heavy", "heavy", 1150, 190),
      mk("c-slash", "slash", 820, 140),
    ],
    cadenceMs: [600, 950],
  },
  {
    id: "warden",
    name: "Warden",
    title: "Wave 10 · relentless",
    maxHp: 11,
    isBoss: true,
    color: "oklch(0.60 0.20 60)",
    shape: "diamond",
    attacks: [
      mk("w-slash", "slash", 520, 105),
      mk("w-thrust", "thrust", 360, 80),
      mk("w-heavy", "heavy", 900, 140),
    ],
    cadenceMs: [340, 650],
  },
  {
    id: "void-queen",
    name: "Void Queen",
    title: "Wave 15 · mixed mastery",
    maxHp: 14,
    isBoss: true,
    color: "oklch(0.55 0.25 320)",
    shape: "star",
    attacks: [
      mk("vq-slash", "slash", 520, 90),
      mk("vq-thrust", "thrust", 300, 70),
      mk("vq-heavy", "heavy", 900, 125),
    ],
    cadenceMs: [280, 580],
  },
  {
    id: "abyss-lord",
    name: "Abyss Lord",
    title: "Wave 20+ · the final test",
    maxHp: 18,
    isBoss: true,
    color: "oklch(0.45 0.22 305)",
    shape: "star",
    attacks: [
      mk("a-slash", "slash", 440, 75),
      mk("a-thrust", "thrust", 270, 60),
      mk("a-heavy", "heavy", 820, 110),
    ],
    cadenceMs: [240, 500],
  },
];

/** Pick the enemy for a given 1-based wave. Every 5th = boss. */
export function enemyForWave(wave: number): EnemyDef {
  if (wave % 5 === 0) {
    const bossIndex = Math.min(BOSSES.length - 1, Math.floor(wave / 5) - 1);
    return BOSSES[bossIndex];
  }
  return REGULAR_ENEMIES[Math.floor(Math.random() * REGULAR_ENEMIES.length)];
}
