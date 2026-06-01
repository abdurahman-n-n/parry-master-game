import { ABILITIES } from "./abilities";
import { CurrencyHUD, CreditIcon, GemIcon, getCredits, getGems } from "./Currency";

export function StoreScreen({ onBack }: { onBack: () => void }) {
  const credits = getCredits();
  const gems = getGems();

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

      <div className="w-full max-w-2xl">
        <div className="mb-2 text-[11px] uppercase tracking-widest text-accent">Abilities</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ABILITIES.map((a) => (
            <div key={a.id} className="flex flex-col gap-2 border-2 border-border bg-background p-4">
              <div className="flex items-center justify-between">
                <div className="text-[12px] uppercase tracking-widest">{a.name}</div>
                <div className="border border-border px-2 py-0.5 text-[9px] tracking-widest">[{a.hotkey}]</div>
              </div>
              <div className="text-[10px] normal-case leading-relaxed tracking-wider text-muted-foreground">
                {a.desc}
              </div>
              <div className="mt-1 flex items-center gap-3 text-[10px] uppercase tracking-widest">
                <span className="inline-flex items-center gap-1">
                  Cost:
                  {a.gemCost > 0 ? (
                    <>
                      <span>{a.gemCost}</span>
                      <GemIcon size={11} />
                    </>
                  ) : (
                    <span className="text-accent">Free</span>
                  )}
                </span>
                <span className="text-muted-foreground">CD: {a.cooldownMs / 1000}s</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[9px] uppercase tracking-widest text-muted-foreground">
          Abilities unlock automatically. Pay with <GemIcon size={10} /> gems and credits <CreditIcon size={10} /> in battle.
        </div>
      </div>
    </div>
  );
}
