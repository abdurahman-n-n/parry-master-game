// Character / skin catalog + ownership persistence.
// Original designs — names are homages, art is not 1:1 to any copyrighted figure.

export type Currency = "credits" | "gems";

export interface SkinEffects {
  slashColor?: string;     // tint for the strike VFX
  killNumbers?: boolean;   // pop "99999999" on kills
  stripes?: boolean;       // sweater palette tweak
}

export interface CharacterDef {
  id: string;
  name: string;
  cost: number;
  currency: Currency;
  blurb: string;
}

export interface SkinDef {
  id: string;            // "<characterId>:<skin>"
  characterId: string;
  name: string;
  cost: number;
  currency: Currency;
  effects?: SkinEffects;
}

export const CHARACTERS: CharacterDef[] = [
  { id: "kid",    name: "The Kid", cost: 0,   currency: "credits", blurb: "One soul. One chance." },
  { id: "hollow", name: "Hollow",  cost: 120, currency: "credits", blurb: "A small vessel with a long needle." },
  { id: "bjorn",  name: "Bjorn",   cost: 100, currency: "credits", blurb: "Bearded viking. Shield up, sword down." },
];

export const SKINS: SkinDef[] = [
  { id: "kid:default",    characterId: "kid",    name: "Default",    cost: 0, currency: "credits" },
  { id: "kid:fallen",     characterId: "kid",    name: "The Fallen", cost: 9, currency: "gems",
    effects: { slashColor: "oklch(0.55 0.25 25)", killNumbers: true, stripes: true } },
  { id: "hollow:default", characterId: "hollow", name: "Default",    cost: 0, currency: "credits" },
  { id: "bjorn:default",  characterId: "bjorn",  name: "Default",    cost: 0, currency: "credits" },
];

// ---------- ownership / equip persistence ----------

const OWNED_C = "parry-owned-characters";
const OWNED_S = "parry-owned-skins";
const EQUIPPED = "parry-equipped";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; }
}

export function getOwnedCharacters(): string[] {
  return readJSON<string[]>(OWNED_C, ["kid"]);
}
export function getOwnedSkins(): string[] {
  return readJSON<string[]>(OWNED_S, ["kid:default", "hollow:default", "bjorn:default"]);
}
export function getEquipped(): { characterId: string; skinId: string } {
  return readJSON(EQUIPPED, { characterId: "kid", skinId: "kid:default" });
}
export function ownCharacter(id: string) {
  const next = Array.from(new Set([...getOwnedCharacters(), id]));
  localStorage.setItem(OWNED_C, JSON.stringify(next));
}
export function ownSkin(id: string) {
  const next = Array.from(new Set([...getOwnedSkins(), id]));
  localStorage.setItem(OWNED_S, JSON.stringify(next));
}
export function equip(characterId: string, skinId: string) {
  localStorage.setItem(EQUIPPED, JSON.stringify({ characterId, skinId }));
}

export function findSkin(id: string): SkinDef | undefined {
  return SKINS.find((s) => s.id === id);
}
export function findCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
export function skinsFor(characterId: string): SkinDef[] {
  return SKINS.filter((s) => s.characterId === characterId);
}
