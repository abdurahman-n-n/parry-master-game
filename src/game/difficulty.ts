export type Difficulty = "easy" | "normal" | "hard" | "nightmare";

export interface DifficultyMods {
  windupMul: number;      // attack telegraph time multiplier (<1 = faster)
  cadenceMul: number;     // delay between attacks multiplier (<1 = more often)
  parryWindowMul: number; // parry window multiplier (<1 = tighter)
  damageMul: number;      // enemy damage multiplier
  hpMul: number;          // enemy HP multiplier
  label: string;
  color: string;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyMods> = {
  easy:      { windupMul: 1.35, cadenceMul: 1.45, parryWindowMul: 1.6, damageMul: 0.75, hpMul: 0.8,  label: "Easy",      color: "oklch(0.78 0.16 145)" },
  normal:    { windupMul: 1.0,  cadenceMul: 1.0,  parryWindowMul: 1.0, damageMul: 1.0,  hpMul: 1.0,  label: "Normal",    color: "oklch(0.78 0.15 85)"  },
  hard:      { windupMul: 0.78, cadenceMul: 0.75, parryWindowMul: 0.75, damageMul: 1.4,  hpMul: 1.25, label: "Hard",      color: "oklch(0.7 0.22 35)"   },
  nightmare: { windupMul: 0.6,  cadenceMul: 0.55, parryWindowMul: 0.55, damageMul: 2.0,  hpMul: 1.6,  label: "Nightmare", color: "oklch(0.58 0.27 15)"  },
};

const KEY = "parry.difficulty";

export function getDifficulty(): Difficulty {
  if (typeof window === "undefined") return "normal";
  const v = localStorage.getItem(KEY) as Difficulty | null;
  return v && v in DIFFICULTIES ? v : "normal";
}

export function setDifficulty(d: Difficulty) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, d);
}
