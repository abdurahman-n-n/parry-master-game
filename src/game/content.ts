import type { AttackPattern, CharacterDef, EnemyDef } from "./types";

// Sudden-death tuning: one hit = lethal. Windows below differ per enemy "feel".

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
  damage: 1,
  reflect: 1,
});

export const DEFAULT_CHARACTER: CharacterDef = {
  id: "hero",
  name: "The Kid",
  maxHp: 1,
  color: "oklch(0.97 0.01 280)",
  ability: { name: "Determination", description: "One soul. One chance." },
};

export const ENEMIES: EnemyDef[] = [
  {
    id: "hollow-knight",
    name: "Hollow Knight",
    title: "The trainer · balanced rhythm",
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
    id: "colossus",
    name: "Colossus",
    title: "Slow · heavy · forgiving",
    maxHp: 1,
    color: "oklch(0.65 0.22 30)",
    shape: "hex",
    attacks: [
      mk("heavy-a", "heavy", 1500, 260),
      mk("heavy-b", "heavy", 1750, 240),
    ],
    cadenceMs: [900, 1400],
  },
  {
    id: "phantom",
    name: "Phantom",
    title: "Erratic · random tempo",
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
    title: "Chaining strikes · short cadence",
    maxHp: 1,
    color: "oklch(0.78 0.20 130)",
    shape: "triangle",
    attacks: [
      mk("tf-a", "slash", 600, 140),
      mk("tf-b", "thrust", 550, 130),
    ],
    cadenceMs: [350, 600],
  },
  {
    id: "void-queen",
    name: "Void Queen",
    title: "Final test · mixed mastery",
    maxHp: 1,
    color: "oklch(0.55 0.25 320)",
    shape: "star",
    attacks: [
      mk("vq-slash", "slash", 750, 130),
      mk("vq-thrust", "thrust", 450, 100),
      mk("vq-heavy", "heavy", 1300, 180),
    ],
    cadenceMs: [450, 900],
  },
];

export const DEFAULT_ENEMY = ENEMIES[0];
