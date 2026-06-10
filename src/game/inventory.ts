// Inventory: purchasable items, ownership persistence, equipped skin.
import { getCredits, spendCredits, getGems, spendGems } from "./Currency";
import { lsKey } from "./storage";


export type ItemKind = "ability" | "weapon" | "skin" | "upgrade";

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
  weapon?: {
    cooldownMs: number;
    damage?: number;
    damageMultiplier?: number;
    ranged?: boolean;
  };
}

export const STORE_ITEMS: StoreItem[] = [
  // Abilities
  { id: "instakill", kind: "ability", name: "Insta Kill", desc: "Unlocks [E] — instantly kills the enemy. Costs 5 gems per use.", creditCost: 50, hotkey: "E" },
  { id: "dash",      kind: "ability", name: "Dash",       desc: "Unlocks [E] — dashes away from the enemy. Free to use.",      creditCost: 25, hotkey: "E" },

  // Weapons
  { id: "weapon-daggers", kind: "weapon", name: "Daggers", desc: "Fast throwable daggers with endless ammo. 0.1s cooldown.", creditCost: 300, gemCost: 30, weapon: { cooldownMs: 100, ranged: true } },
  { id: "weapon-mace", kind: "weapon", name: "Mace", desc: "Slow heavy hit. Deals 10x your upgraded strike damage. 1s cooldown.", creditCost: 500, gemCost: 50, weapon: { cooldownMs: 1000, damageMultiplier: 10 } },
  { id: "weapon-heavy-sword", kind: "weapon", name: "Heavy Sword", desc: "Massive swing. Deals 12 damage. 1.5s cooldown.", creditCost: 400, gemCost: 40, weapon: { cooldownMs: 1500, damage: 12 } },

  // Weapon Effects
  { id: "skin-crimson", kind: "skin", name: "Crimson Edge", desc: "Wreathes your blade in a bloody red aura.",   creditCost: 30, color: "oklch(0.65 0.22 25)" },
  { id: "skin-mint",    kind: "skin", name: "Mint Pulse",   desc: "A cool mint glow trails every swing.",         creditCost: 30, color: "oklch(0.85 0.15 165)" },
  { id: "skin-gold",    kind: "skin", name: "Gold Aura",    desc: "A radiant gold halo — the mark of a champion.", creditCost: 80, color: "oklch(0.85 0.17 90)" },

  // Upgrades
  { id: "hp-up",   kind: "upgrade", name: "Vitality",      desc: "+1 max HP.",                         creditCost: 60 },
  { id: "dmg-up",  kind: "upgrade", name: "Sharpened",    desc: "Strikes and ripostes deal +1 damage.", creditCost: 80 },
  { id: "cd-down", kind: "upgrade", name: "Haste",         desc: "Hit and block cooldowns reduced by 0.1s.", creditCost: 50 },
];

const OWNED_KEY = "parry.inventory";
const SKIN_KEY = "parry.equippedSkin";
const ABILITY_KEY = "parry.equippedAbility";
const WEAPON_KEY = "parry.equippedWeapon";
const UPGRADE_COUNT_KEY = "parry.upgradeCounts";
const UPGRADE_PRICE_STEP = 10;
const UPGRADE_GEM_STEP = 5;

export function getUpgradeGemCost(item: StoreItem): number {
  if (item.kind === "upgrade") return 1 + Math.floor(getUpgradeCount(item.id) / UPGRADE_GEM_STEP);
  return item.gemCost ?? 0;
}

function readOwned(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(lsKey(OWNED_KEY)) || "[]") as string[]; }
  catch { return []; }
}
function writeOwned(arr: string[]) {
  localStorage.setItem(lsKey(OWNED_KEY), JSON.stringify(arr));
}

function readUpgradeCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(lsKey(UPGRADE_COUNT_KEY)) || "{}") as Record<string, number>; }
  catch { return {}; }
}
function writeUpgradeCounts(counts: Record<string, number>) {
  localStorage.setItem(lsKey(UPGRADE_COUNT_KEY), JSON.stringify(counts));
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

export function grantItem(id: string) {
  const item = findItem(id);
  if (!item) return false;
  if (item.kind === "upgrade") {
    setUpgradeCount(id, getUpgradeCount(id) + 1);
    return true;
  }
  const owned = readOwned();
  if (!owned.includes(id)) writeOwned([...owned, id]);
  if (item.kind === "skin" && !getEquippedSkin()) setEquippedSkin(id);
  if (item.kind === "ability" && !getEquippedAbility()) setEquippedAbility(id);
  if (item.kind === "weapon" && !getEquippedWeapon()) setEquippedWeapon(id);
  return true;
}

export function removeItem(id: string) {
  const item = findItem(id);
  if (!item) return false;
  if (item.kind === "upgrade") {
    setUpgradeCount(id, Math.max(0, getUpgradeCount(id) - 1));
    return true;
  }
  writeOwned(readOwned().filter((ownedId) => ownedId !== id));
  if (getEquippedSkin() === id) setEquippedSkin(null);
  if (getEquippedAbility() === id) setEquippedAbility(null);
  if (getEquippedWeapon() === id) setEquippedWeapon(null);
  return true;
}

export function setUpgradeCount(id: string, count: number) {
  const counts = readUpgradeCounts();
  const next = Math.max(0, Math.round(count));
  if (next === 0) delete counts[id];
  else counts[id] = next;
  writeUpgradeCounts(counts);
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

export function buyItem(id: string, currency?: "credits" | "gems"): BuyResult {
  const item = findItem(id);
  if (!item) return { ok: false, reason: "missing" };
  const isUpgrade = item.kind === "upgrade";
  if (!isUpgrade && isOwned(id)) return { ok: false, reason: "owned" };

  if (isUpgrade) {
    const pay = currency ?? "credits";
    if (pay === "gems") {
      const gemPrice = getUpgradeGemCost(item);
      if (getGems() < gemPrice) return { ok: false, reason: "gems" };
      if (!spendGems(gemPrice)) return { ok: false, reason: "gems" };
    } else {
      const price = getUpgradePrice(item);
      if (getCredits() < price) return { ok: false, reason: "credits" };
      if (price > 0 && !spendCredits(price)) return { ok: false, reason: "credits" };
    }
  } else {
    const pay = currency ?? "credits";
    const price = item.creditCost;
    const gemPrice = item.gemCost ?? 0;
    if (pay === "gems" && gemPrice > 0) {
      if (getGems() < gemPrice) return { ok: false, reason: "gems" };
      if (!spendGems(gemPrice)) return { ok: false, reason: "gems" };
    } else {
      if (getCredits() < price) return { ok: false, reason: "credits" };
      if (price > 0 && !spendCredits(price)) return { ok: false, reason: "credits" };
    }
  }

  if (isUpgrade) {
    const counts = readUpgradeCounts();
    counts[id] = (counts[id] ?? 0) + 1;
    writeUpgradeCounts(counts);
  } else {
    const arr = readOwned();
    arr.push(id);
    writeOwned(arr);
  }

  // Auto-equip the first skin / ability purchased.
  if (item.kind === "skin" && !getEquippedSkin()) setEquippedSkin(id);
  if (item.kind === "ability" && !getEquippedAbility()) setEquippedAbility(id);
  if (item.kind === "weapon" && !getEquippedWeapon()) setEquippedWeapon(id);
  return { ok: true };
}

export function getEquippedAbility(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(lsKey(ABILITY_KEY));
}
export function setEquippedAbility(id: string | null) {
  if (id === null) localStorage.removeItem(lsKey(ABILITY_KEY));
  else localStorage.setItem(lsKey(ABILITY_KEY), id);
}

export function getEquippedWeapon(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(lsKey(WEAPON_KEY));
}
export function setEquippedWeapon(id: string | null) {
  if (id === null) localStorage.removeItem(lsKey(WEAPON_KEY));
  else localStorage.setItem(lsKey(WEAPON_KEY), id);
}

export function getEquippedSkin(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(lsKey(SKIN_KEY));
}
export function setEquippedSkin(id: string | null) {
  if (id === null) localStorage.removeItem(lsKey(SKIN_KEY));
  else localStorage.setItem(lsKey(SKIN_KEY), id);
}

export function getEquippedSkinColor(): string | null {
  const id = getEquippedSkin();
  if (!id) return null;
  return findItem(id)?.color ?? null;
}

export function itemsByKind(kind: ItemKind): StoreItem[] {
  return STORE_ITEMS.filter((i) => i.kind === kind);
}
