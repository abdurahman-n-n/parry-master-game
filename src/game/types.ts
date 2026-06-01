// Core game types — extensible foundation for PARRY!
// Future: characters with custom abilities, level editor, enemy library.

export type AttackKind = "slash" | "thrust" | "heavy";

export interface AttackPattern {
  id: string;
  kind: AttackKind;
  /** ms from spawn until the hit lands */
  windupMs: number;
  /** ms window around the hit moment where parry succeeds */
  parryWindowMs: number;
  /** damage dealt to player on hit */
  damage: number;
  /** damage reflected to enemy on perfect parry */
  reflect: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  /** color in oklch or hex for the sprite */
  color: string;
  /** which attacks this enemy uses (cycled or random) */
  attacks: AttackPattern[];
  /** delay between attacks in ms */
  cadenceMs: [number, number];
}

export interface CharacterDef {
  id: string;
  name: string;
  maxHp: number;
  color: string;
  /** ability hook — placeholder for future custom abilities */
  ability?: {
    name: string;
    description: string;
  };
}

export type GameState = "menu" | "playing" | "victory" | "defeat";
