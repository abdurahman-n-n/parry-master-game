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
    name: "Hollow Knight",
    title: "Balanced rhythm",
    maxHp: 1,
    color: "oklch(0.70 0.18 285)",
    shape: "pentagon",
    attacks: [
      mk("slash-a", "slash", 900, 180),
      mk("thrust-a", "thrust", 700, 160),
    ],
    cadenceMs: [700, 1100],
  },
  {
    id: "shade",
    name: "Shade",
    title: "Fast · tight windows",
    maxHp: 1,
    color: "oklch(0.55 0.20 295)",
    shape: "diamond",
    attacks: [
      mk("thrust-fast", "thrust", 480, 110),
      mk("thrust-faster", "thrust", 380, 95),
    ],
    cadenceMs: [400, 700],
  },
  {
    id: "phantom",
    name: "Phantom",
    title: "Erratic tempo",
    maxHp: 1,
    color: "oklch(0.85 0.18 200)",
    shape: "circle",
    attacks: [
      mk("p-slash", "slash", 1200, 150),
      mk("p-thrust", "thrust", 500, 130),
      mk("p-heavy", "heavy", 1600, 200),
    ],
    cadenceMs: [500, 1300],
  },
  {
    id: "twin-fang",
    name: "Twin Fang",
    title: "Chaining strikes",
    maxHp: 1,
    color: "oklch(0.78 0.20 130)",
    shape: "triangle",
    attacks: [
      mk("tf-a", "slash", 600, 140),
      mk("tf-b", "thrust", 550, 130),
    ],
    cadenceMs: [350, 600],
  },
];

// ----- Bosses: 5-10 parries to kill, appear every 5th wave -----
export const BOSSES: EnemyDef[] = [
  {
    id: "colossus",
    name: "Colossus",
    title: "Wave 5 · slow & heavy",
    maxHp: 5,
    isBoss: true,
    color: "oklch(0.65 0.22 30)",
    shape: "hex",
    attacks: [
      mk("c-heavy", "heavy", 1500, 240),
      mk("c-slash", "slash", 1100, 180),
    ],
    cadenceMs: [800, 1200],
  },
  {
    id: "warden",
    name: "Warden",
    title: "Wave 10 · relentless",
    maxHp: 7,
    isBoss: true,
    color: "oklch(0.60 0.20 60)",
    shape: "diamond",
    attacks: [
      mk("w-slash", "slash", 700, 140),
      mk("w-thrust", "thrust", 500, 110),
      mk("w-heavy", "heavy", 1200, 180),
    ],
    cadenceMs: [500, 900],
  },
  {
    id: "void-queen",
    name: "Void Queen",
    title: "Wave 15 · mixed mastery",
    maxHp: 9,
    isBoss: true,
    color: "oklch(0.55 0.25 320)",
    shape: "star",
    attacks: [
      mk("vq-slash", "slash", 700, 120),
      mk("vq-thrust", "thrust", 420, 95),
      mk("vq-heavy", "heavy", 1200, 160),
    ],
    cadenceMs: [400, 800],
  },
  {
    id: "abyss-lord",
    name: "Abyss Lord",
    title: "Wave 20+ · the final test",
    maxHp: 10,
    isBoss: true,
    color: "oklch(0.45 0.22 305)",
    shape: "star",
    attacks: [
      mk("a-slash", "slash", 600, 100),
      mk("a-thrust", "thrust", 380, 80),
      mk("a-heavy", "heavy", 1100, 140),
    ],
    cadenceMs: [350, 700],
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
