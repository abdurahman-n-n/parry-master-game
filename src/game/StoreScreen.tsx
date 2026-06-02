import { useState } from "react";
import {
  itemsByKind, isOwned, buyItem, getUpgradeCount, getUpgradePrice, getUpgradeGemCost,
  type ItemKind, type StoreItem,
} from "./inventory";
import { CurrencyHUD, CreditIcon, GemIcon, getCredits, getGems } from "./Currency";

const SECTIONS: { kind: ItemKind; title: string; blurb: string }[] = [
  { kind: "ability", title: "Abilities", blurb: "Unlock special combat moves" },
  { kind: "skin",    title: "Skins",     blurb: "Change your hero's look" },
  { kind: "upgrade", title: "Upgrades",  blurb: "Permanent stat boosts" },
];

export function StoreScreen({ onBack }: { onBack: () => void }) {
  const [, force] = useState(0);
  const [feedback, setFeedback] = useState<string>("");
  const credits = getCredits();
  const gems = getGems();

  const handleBuy = (id: string, currency?: "credits" | "gems") => {
    const r = buyItem(id, currency);
    if (r.ok) {
      setFeedback(`Purchased!`);
    } else {
      setFeedback(
        r.reason === "credits" ? "Not enough credits."
        : r.reason === "gems" ? "Not enough gems."
        : r.reason === "owned" ? "Already owned."
        : "Unavailable."
      );
    }
    force((n) => n + 1);
    setTimeout(() => setFeedback(""), 1600);
  };

  return (
    <div className="flex h-full w-full flex-col items-center gap-4 overflow-auto bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <button
          onClick={onBack}
          className="border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
        >
          ← Back
        </button>
        <div className="text-2xl tracking-[0.3em]">STORE</div>
        <CurrencyHUD credits={credits} gems={gems} />
      </div>

      {feedback && (
        <div className="text-[10px] uppercase tracking-widest text-accent">{feedback}</div>
      )}

      {SECTIONS.map(({ kind, title, blurb }) => (
        <div key={kind} className="w-full max-w-2xl">
          <div className="mb-1 flex items-baseline justify-between">
            <div className="text-[11px] uppercase tracking-widest text-accent">{title}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{blurb}</div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {itemsByKind(kind).map((item) => (
              <StoreCard key={item.id} item={item} owned={isOwned(item.id)}
                credits={credits} gems={gems}
                onBuy={(currency) => handleBuy(item.id, currency)} />
            ))}
          </div>
        </div>
      ))}

      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
        Upgrades: pay with <CreditIcon size={10} /> credits OR <GemIcon size={10} /> gems.
      </div>
    </div>
  );
}

function StoreCard({
  item, owned, credits, gems, onBuy,
}: {
  item: StoreItem; owned: boolean;
  credits: number; gems: number;
  onBuy: (currency?: "credits" | "gems") => void;
}) {
  const isUpgrade = item.kind === "upgrade";
  const price = getUpgradePrice(item);
  const gemPrice = getUpgradeGemCost(item);
  const stack = isUpgrade ? getUpgradeCount(item.id) : 0;
  const ownedDisabled = !isUpgrade && owned;
  return (
    <div className="flex flex-col gap-2 border-2 border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] uppercase tracking-widest">
          {item.kind === "skin" && item.color && (
            <span className="inline-block h-3 w-3 border border-border" style={{ background: item.color }} />
          )}
          {item.name}
          {isUpgrade && stack > 0 && (
            <span className="text-[10px] text-accent">×{stack}</span>
          )}
        </div>
        {item.hotkey && (
          <div className="border border-border px-2 py-0.5 text-[9px] tracking-widest">[{item.hotkey}]</div>
        )}
      </div>
      <div className="text-[10px] normal-case leading-relaxed tracking-wider text-muted-foreground">
        {item.desc}
        {isUpgrade && <span className="block text-muted-foreground/80">Stackable · +10 credits / +1 gem per 5 stacks.</span>}
      </div>

      {isUpgrade ? (
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            onClick={() => onBuy("credits")}
            disabled={credits < price}
            className="inline-flex items-center justify-center gap-1 border-2 border-border bg-background px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background disabled:cursor-default disabled:opacity-40"
          >
            <span>Buy</span><span>{price}</span><CreditIcon size={11} />
          </button>
          <button
            onClick={() => onBuy("gems")}
            disabled={gems < gemPrice}
            className="inline-flex items-center justify-center gap-1 border-2 border-border bg-background px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background disabled:cursor-default disabled:opacity-40"
            style={{ color: "var(--color-accent)" }}
          >
            <span>Buy</span><span>{gemPrice}</span><GemIcon size={11} />
          </button>
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest">
          <span className="inline-flex items-center gap-1">
            <span>{item.creditCost}</span><CreditIcon size={11} />
            {(item.gemCost ?? 0) > 0 ? (<><span className="ml-1">{item.gemCost}</span><GemIcon size={11} /></>) : null}
          </span>
          <button
            onClick={() => onBuy()}
            disabled={ownedDisabled}
            className="border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background disabled:cursor-default disabled:bg-accent disabled:text-background disabled:opacity-100"
          >
            {ownedDisabled ? "✓ Owned" : "Buy"}
          </button>
        </div>
      )}
    </div>
  );
}
