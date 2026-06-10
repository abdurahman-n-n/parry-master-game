import { lsKey } from "./storage";

export type TitleId = "frame-perfect";

export type Achievement = {
  id: string;
  name: string;
  rewardTitle?: TitleId;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "parry-frame-perfect", name: "PARRY!!", rewardTitle: "frame-perfect" },
];

export const TITLES: Record<TitleId, string> = {
  "frame-perfect": "Frame Perfect",
};

const ACHIEVEMENT_KEY = "parry.achievements";
const TITLE_KEY = "parry.equippedTitle";

function readUnlocked(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(lsKey(ACHIEVEMENT_KEY)) || "[]") as string[]; }
  catch { return []; }
}

function writeUnlocked(ids: string[]) {
  localStorage.setItem(lsKey(ACHIEVEMENT_KEY), JSON.stringify([...new Set(ids)]));
}

export function getUnlockedAchievements() {
  return new Set(readUnlocked());
}

export function unlockAchievement(id: string) {
  const item = ACHIEVEMENTS.find((a) => a.id === id);
  if (!item) return false;
  const unlocked = readUnlocked();
  if (unlocked.includes(id)) return false;
  writeUnlocked([...unlocked, id]);
  if (item.rewardTitle && !getEquippedTitle()) setEquippedTitle(item.rewardTitle);
  return true;
}

export function getOwnedTitles(): TitleId[] {
  const unlocked = getUnlockedAchievements();
  return ACHIEVEMENTS
    .filter((a) => a.rewardTitle && unlocked.has(a.id))
    .map((a) => a.rewardTitle as TitleId);
}

export function getEquippedTitle(): TitleId | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(lsKey(TITLE_KEY)) as TitleId | null;
}

export function setEquippedTitle(id: TitleId | null) {
  if (id === null) localStorage.removeItem(lsKey(TITLE_KEY));
  else localStorage.setItem(lsKey(TITLE_KEY), id);
}
