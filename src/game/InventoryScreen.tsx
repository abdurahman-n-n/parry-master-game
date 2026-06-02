import { useState } from "react";
import {
  itemsByKind, isOwned, getUpgradeCount,
  getEquippedSkin, setEquippedSkin,
  getEquippedAbility, setEquippedAbility,
  type ItemKind, type StoreItem,
} from "./inventory";
import { CurrencyHUD, getCredits, getGems } from "./Currency";

const SECTIONS: { kind: ItemKind; title: string }[] = [
  { kind: "ability", title: "Abilities" },
  { kind: "skin",    title: "Weapon Effects" },
  { kind: "upgrade", title: "Upgrades" },
];

export function InventoryScreen({ onBack }: { onBack: () => void }) {
  const [, force] = useState(0);
  const credits = getCredits();
  const gems = getGems();
  const equippedSkin = getEquippedSkin();
  const equippedAbility = getEquippedAbility();
  const refresh = () => force((n) => n + 1);

  return (
    <div className="flex h-full w-full flex-col items-center gap-4 overflow-auto bg-background p-6 font-pixel text-foreground">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <button
          onClick={onBack}
          className="border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background"
        >
          ← Back
        </button>
        <div className="text-2xl tracking-[0.3em]">INVENTORY</div>
        <CurrencyHUD credits={credits} gems={gems} />
      </div>

      {SECTIONS.map(({ kind, title }) => {
        const owned = itemsByKind(kind).filter((i) => isOwned(i.id));
        return (
          <div key={kind} className="w-full max-w-2xl">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="text-[11px] uppercase tracking-widest text-accent">{title}</div>
              {kind === "ability" && (
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  Only one ability can be equipped · [E] in battle
                </div>
              )}
            </div>
            {owned.length === 0 ? (
              <div className="border-2 border-dashed border-border bg-background p-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                None yet — visit the Store
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {owned.map((item) => (
                  <OwnedCard
                    key={item.id}
                    item={item}
                    equippedSkin={equippedSkin}
                    equippedAbility={equippedAbility}
                    onEquipSkin={() => { setEquippedSkin(item.id); refresh(); }}
                    onEquipAbility={() => { setEquippedAbility(item.id); refresh(); }}
                    onUnequipAbility={() => { setEquippedAbility(null); refresh(); }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OwnedCard({
  item, equippedSkin, equippedAbility,
  onEquipSkin, onEquipAbility, onUnequipAbility,
}: {
  item: StoreItem;
  equippedSkin: string | null;
  equippedAbility: string | null;
  onEquipSkin: () => void;
  onEquipAbility: () => void;
  onUnequipAbility: () => void;
}) {
  const isEquippedSkin = item.kind === "skin" && equippedSkin === item.id;
  const isEquippedAbility = item.kind === "ability" && equippedAbility === item.id;

  return (
    <div className="flex flex-col gap-2 border-2 border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] uppercase tracking-widest">
          {item.kind === "skin" && item.color && (
            <span className="inline-block h-3 w-3 border border-border" style={{ background: item.color }} />
          )}
          {item.name}
          {item.kind === "upgrade" && (
            <span className="text-[10px] text-accent">×{getUpgradeCount(item.id)}</span>
          )}
        </div>
        {item.kind === "ability" && (
          <div className="border border-border px-2 py-0.5 text-[9px] tracking-widest">[E]</div>
        )}
      </div>
      <div className="text-[10px] normal-case leading-relaxed tracking-wider text-muted-foreground">
        {item.desc}
      </div>
      {item.kind === "skin" && (
        <button
          onClick={onEquipSkin}
          disabled={isEquippedSkin}
          className="mt-1 border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background disabled:cursor-default disabled:bg-accent disabled:text-background disabled:opacity-100"
        >
          {isEquippedSkin ? "✓ Equipped" : "Equip"}
        </button>
      )}
      {item.kind === "ability" && (
        <button
          onClick={isEquippedAbility ? onUnequipAbility : onEquipAbility}
          className="mt-1 border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background data-[on=true]:bg-accent data-[on=true]:text-background"
          data-on={isEquippedAbility}
        >
          {isEquippedAbility ? "✓ Equipped (Unequip)" : "Equip"}
        </button>
      )}
    </div>
  );
}
