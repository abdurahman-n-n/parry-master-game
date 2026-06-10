export interface AbilityDef {
  id: "instakill" | "dash";
  name: string;
  desc: string;
  cooldownMs: number;
  gemCost: number;
  hotkey: string;
}

export const ABILITIES: AbilityDef[] = [
  {
    id: "instakill",
    name: "Insta Kill",
    desc: "Instantly kills the strongest enemy on screen.",
    cooldownMs: 10_000,
    gemCost: 5,
    hotkey: "E",
  },
  {
    id: "dash",
    name: "Dash",
    desc: "Dashes away from the enemy's attack zone.",
    cooldownMs: 10_000,
    gemCost: 0,
    hotkey: "E",
  },
];

export function findAbility(id: AbilityDef["id"]) {
  return ABILITIES.find((a) => a.id === id)!;
}
