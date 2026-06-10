// Currency icons + persistence helpers.
// Credits (C with vertical bar), Gems (level / ability currency).

import { lsKey, getActiveUser } from "./storage";
import { recordGemGain } from "./Leaderboard";


const CREDITS_KEY = "parry-credits";
const GEMS_KEY = "parry-gems";

function read(key: string): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(lsKey(key)) ?? 0) || 0;
}
function write(key: string, n: number) {
  localStorage.setItem(lsKey(key), String(n));
}


export function getCredits() { return read(CREDITS_KEY); }
export function getGems()    { return read(GEMS_KEY); }

export function setCredits(n: number) { const v = Math.max(0, Math.round(n)); write(CREDITS_KEY, v); return v; }
export function setGems(n: number) { const v = Math.max(0, Math.round(n)); write(GEMS_KEY, v); return v; }
export function addCredits(n: number) { const v = getCredits() + n; write(CREDITS_KEY, v); return v; }
export function addGems(n: number) {
  const v = getGems() + n;
  write(GEMS_KEY, v);
  if (n > 0) {
    const u = getActiveUser();
    if (u) recordGemGain(u, n);
  }
  return v;
}

export function spendCredits(n: number): boolean {
  const v = getCredits();
  if (v < n) return false;
  write(CREDITS_KEY, v - n);
  return true;
}
export function spendGems(n: number): boolean {
  const v = getGems();
  if (v < n) return false;
  write(GEMS_KEY, v - n);
  return true;
}

export function CreditIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-2px" }}>
      <path d="M12 4.2 A5 5 0 1 0 12 11.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" fill="none" />
      <line x1="8" y1="0.8" x2="8" y2="15.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}

export function GemIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-2px" }}>
      <polygon points="8,1 14,6 8,15 2,6" fill="currentColor" opacity="0.85" />
      <polygon points="8,1 14,6 2,6" fill="currentColor" opacity="0.55" />
      <line x1="2" y1="6" x2="14" y2="6" stroke="var(--color-background)" strokeWidth="0.8" />
    </svg>
  );
}

export function CurrencyHUD({
  credits, gems, reward,
}: {
  credits: number; gems: number;
  reward?: { credits: number; gems: number } | null;
}) {
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-foreground">
      <span className="inline-flex items-center gap-1">
        <CreditIcon size={14} /><span>{credits}</span>
        {reward && reward.credits > 0 && <span className="text-accent">+{reward.credits}</span>}
      </span>
      <span className="inline-flex items-center gap-1" style={{ color: "var(--color-accent)" }}>
        <GemIcon size={14} /><span>{gems}</span>
        {reward && reward.gems > 0 && <span>+{reward.gems}</span>}
      </span>
    </div>
  );
}
