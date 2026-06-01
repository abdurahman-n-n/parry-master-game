// Inventory: purchasable items, ownership persistence, equipped skin.
import { getCredits, spendCredits, getGems, spendGems } from "./Currency";

export type ItemKind = "ability" | "skin" | "upgrade";

export interface StoreItem {
  id: string;
  kind: ItemKind;
  name: string;
  desc: string;
  creditCost: number;
  gemCost?: number;
  /** For skins: color used to tint the player. */
  color?: string;
  hotkey?: string;
}

export const STORE_ITEMS: StoreItem[] = [
  // Abilities
  { id: "instakill", kind: "ability", name: "Insta Kill", desc: "Unlocks [Q] — instantly kills the enemy. Costs 5 gems per use.", creditCost: 50, hotkey: "Q" },
  { id: "dash",      kind: "ability", name: "Dash",       desc: "Unlocks [E] — dashes away from the enemy. Free to use.",      creditCost: 25, hotkey: "E" },

  // Skins
  { id: "skin-crimson", kind: "skin", name: "Crimson",    desc: "A bloody red tint for your hero.",      creditCost: 30, color: "oklch(0.65 0.22 25)" },
  { id: "skin-mint",    kind: "skin", name: "Mint",       desc: "Cool mint glow.",                        creditCost: 30, color: "oklch(0.85 0.15 165)" },
  { id: "skin-gold",    kind: "skin", name: "Gold",       desc: "Pure gold. The mark of a champion.",     creditCost: 80, color: "oklch(0.85 0.17 90)" },

  // Upgrades
  { id: "hp-up",   kind: "upgrade", name: "Vitality",      desc: "+1 max HP.",                         creditCost: 60 },
  { id: "dmg-up",  kind: "upgrade", name: "Sharpened",    desc: "Strikes and ripostes deal +1 damage.", creditCost: 80 },
  { id: "cd-down", kind: "upgrade", name: "Quick Hands",   desc: "Ability cooldowns reduced by 2s.",   creditCost: 50 },
];

const OWNED_KEY = "parry.inventory";
const SKIN_KEY = "parry.equippedSkin";
const ABILITY_KEY = "parry.equippedAbility";
const UPGRADE_COUNT_KEY = "parry.upgradeCounts";
const UPGRADE_PRICE_STEP = 10;

function readOwned(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(OWNED_KEY) || "[]") as string[]; }
  catch { return []; }
}
function writeOwned(arr: string[]) {
  localStorage.setItem(OWNED_KEY, JSON.stringify(arr));
}

function readUpgradeCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(UPGRADE_COUNT_KEY) || "{}") as Record<string, number>; }
  catch { return {}; }
}
function writeUpgradeCounts(counts: Record<string, number>) {
  localStorage.setItem(UPGRADE_COUNT_KEY, JSON.stringify(counts));
}
export function getUpgradeCount(id: string): number {
  return readUpgradeCounts()[id] ?? 0;
}
export function getUpgradePrice(item: StoreItem): number {
  if (item.kind !== "upgrade") return item.creditCost;
  return item.creditCost + UPGRADE_PRICE_STEP * getUpgradeCount(item.id);
}

export function getOwned(): Set<string> {
  return new Set(readOwned());
}
export function findItem(id: string): StoreItem | undefined {
  return STORE_ITEMS.find((i) => i.id === id);
}
export function isOwned(id: string): boolean {
  const item = findItem(id);
  if (item?.kind === "upgrade") return getUpgradeCount(id) > 0;
  return readOwned().includes(id);
}

export type BuyResult =
  | { ok: true }
  | { ok: false; reason: "owned" | "missing" | "credits" | "gems" };

export function buyItem(id: string): BuyResult {
  const item = findItem(id);
  if (!item) return { ok: false, reason: "missing" };
  if (isOwned(id)) return { ok: false, reason: "owned" };
  if (getCredits() < item.creditCost) return { ok: false, reason: "credits" };
  if ((item.gemCost ?? 0) > 0 && getGems() < (item.gemCost ?? 0)) return { ok: false, reason: "gems" };

  if (item.creditCost > 0 && !spendCredits(item.creditCost)) return { ok: false, reason: "credits" };
  if ((item.gemCost ?? 0) > 0 && !spendGems(item.gemCost!)) return { ok: false, reason: "gems" };

  const arr = readOwned();
  arr.push(id);
  writeOwned(arr);

  // Auto-equip the first skin / ability purchased.
  if (item.kind === "skin" && !getEquippedSkin()) setEquippedSkin(id);
  if (item.kind === "ability" && !getEquippedAbility()) setEquippedAbility(id);
  return { ok: true };
}

export function getEquippedAbility(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ABILITY_KEY);
}
export function setEquippedAbility(id: string | null) {
  if (id === null) localStorage.removeItem(ABILITY_KEY);
  else localStorage.setItem(ABILITY_KEY, id);
}

export function getEquippedSkin(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SKIN_KEY);
}
export function setEquippedSkin(id: string | null) {
  if (id === null) localStorage.removeItem(SKIN_KEY);
  else localStorage.setItem(SKIN_KEY, id);
}
export function getEquippedSkinColor(): string | null {
  const id = getEquippedSkin();
  if (!id) return null;
  return findItem(id)?.color ?? null;
}

export function itemsByKind(kind: ItemKind): StoreItem[] {
  return STORE_ITEMS.filter((i) => i.kind === kind);
}
