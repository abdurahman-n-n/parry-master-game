// Currency icons + persistence helpers.
// CreditIcon = a stylized "C" with a single vertical line through it.
// GemIcon    = a faceted diamond. Earned 1 per boss kill.

const CREDITS_KEY = "parry-credits";
const GEMS_KEY = "parry-gems";

export function getCredits(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(CREDITS_KEY) ?? 0) || 0;
}
export function getGems(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(GEMS_KEY) ?? 0) || 0;
}
export function addCredits(n: number): number {
  const next = getCredits() + n;
  localStorage.setItem(CREDITS_KEY, String(next));
  return next;
}
export function addGems(n: number): number {
  const next = getGems() + n;
  localStorage.setItem(GEMS_KEY, String(next));
  return next;
}

/**
 * Reward formula:
 * Regular enemy = 5 base credits + a speed bonus (faster kill -> more).
 * Boss          = 10 base credits + speed bonus + 1 gem.
 *
 * Speed bonus = round( max(0, (8000 - fightMs) / 700) ), capped at +10.
 */
export function rewardFor(opts: { isBoss: boolean; fightMs: number }) {
  const speedBonus = Math.min(
    10,
    Math.max(0, Math.round((8000 - opts.fightMs) / 700)),
  );
  const base = opts.isBoss ? 10 : 5;
  return {
    credits: base + speedBonus,
    gems: opts.isBoss ? 1 : 0,
    speedBonus,
  };
}

export function CreditIcon({ size = 14 }: { size?: number }) {
  // A "C" with a vertical bar running top-to-bottom through it.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-2px" }}
    >
      {/* C shape (open on the right) */}
      <path
        d="M12 4.2 A5 5 0 1 0 12 11.8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="square"
        fill="none"
      />
      {/* Vertical line through the C */}
      <line
        x1="8"
        y1="0.8"
        x2="8"
        y2="15.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function GemIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-2px" }}
    >
      <polygon
        points="8,1 14,6 8,15 2,6"
        fill="currentColor"
        opacity="0.85"
      />
      <polygon
        points="8,1 14,6 2,6"
        fill="currentColor"
        opacity="0.55"
      />
      <line x1="2" y1="6" x2="14" y2="6" stroke="var(--color-background)" strokeWidth="0.8" />
      <line x1="8" y1="1" x2="8" y2="15" stroke="var(--color-background)" strokeWidth="0.6" opacity="0.5" />
    </svg>
  );
}

export function CurrencyHUD({
  credits,
  gems,
  reward,
}: {
  credits: number;
  gems: number;
  reward?: { credits: number; gems: number } | null;
}) {
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-foreground">
      <span className="inline-flex items-center gap-1">
        <CreditIcon size={14} />
        <span>{credits}</span>
        {reward && reward.credits > 0 && (
          <span className="text-accent">+{reward.credits}</span>
        )}
      </span>
      <span className="inline-flex items-center gap-1" style={{ color: "var(--color-accent)" }}>
        <GemIcon size={14} />
        <span>{gems}</span>
        {reward && reward.gems > 0 && <span>+{reward.gems}</span>}
      </span>
    </div>
  );
}
