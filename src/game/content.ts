import type { AttackPattern, CharacterDef, EnemyDef } from "./types";

const slash: AttackPattern = {
  id: "slash",
  kind: "slash",
  windupMs: 900,
  parryWindowMs: 180,
  damage: 15,
  reflect: 10,
};

const thrust: AttackPattern = {
  id: "thrust",
  kind: "thrust",
  windupMs: 650,
  parryWindowMs: 140,
  damage: 12,
  reflect: 8,
};

const heavy: AttackPattern = {
  id: "heavy",
  kind: "heavy",
  windupMs: 1400,
  parryWindowMs: 220,
  damage: 28,
  reflect: 22,
};

export const DEFAULT_CHARACTER: CharacterDef = {
  id: "hero",
  name: "The Kid",
  maxHp: 100,
  color: "oklch(1 0 0)",
  ability: { name: "Determination", description: "Refuses to fall." },
};

export const DEFAULT_ENEMY: EnemyDef = {
  id: "training-dummy",
  name: "Hollow Knight",
  maxHp: 120,
  color: "oklch(0.85 0.18 90)",
  attacks: [slash, thrust, slash, heavy],
  cadenceMs: [550, 950],
};
