import { useState } from "react";
import {
  itemsByKind, isOwned, getUpgradeCount,
  getEquippedSkin, setEquippedSkin,
  getEquippedAbility, setEquippedAbility,
  getEquippedWeapon, setEquippedWeapon,
  type ItemKind, type StoreItem,
} from "./inventory";
import { CurrencyHUD, getCredits, getGems } from "./Currency";
import { getEquippedTitle, getOwnedTitles, setEquippedTitle, TITLES, type TitleId } from "./achievements";

const SECTIONS: { kind: ItemKind; title: string }[] = [
  { kind: "ability", title: "Abilities" },
  { kind: "weapon", title: "Weapons" },
  { kind: "skin",    title: "Weapon Effects" },
  { kind: "upgrade", title: "Upgrades" },
];

export function InventoryScreen({ onBack }: { onBack: () => void }) {
  const [, force] = useState(0);
  const credits = getCredits();
  const gems = getGems();
  const equippedSkin = getEquippedSkin();
  const equippedAbility = getEquippedAbility();
  const equippedWeapon = getEquippedWeapon();
  const equippedTitle = getEquippedTitle();
  const titles = getOwnedTitles();
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
              {kind === "weapon" && (
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  Only one weapon can be equipped
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
                    equippedWeapon={equippedWeapon}
                    onEquipSkin={() => { setEquippedSkin(item.id); refresh(); }}
                    onEquipAbility={() => { setEquippedAbility(item.id); refresh(); }}
                    onUnequipAbility={() => { setEquippedAbility(null); refresh(); }}
                    onEquipWeapon={() => { setEquippedWeapon(item.id); refresh(); }}
                    onUnequipWeapon={() => { setEquippedWeapon(null); refresh(); }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="w-full max-w-2xl">
        <div className="mb-2 text-[11px] uppercase tracking-widest text-accent">Titles</div>
        {titles.length === 0 ? (
          <div className="border-2 border-dashed border-border bg-background p-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
            None unlocked
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {titles.map((id) => (
              <TitleCard
                key={id}
                id={id}
                equippedTitle={equippedTitle}
                onEquip={() => { setEquippedTitle(id); refresh(); }}
                onUnequip={() => { setEquippedTitle(null); refresh(); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TitleCard({
  id, equippedTitle, onEquip, onUnequip,
}: {
  id: TitleId;
  equippedTitle: TitleId | null;
  onEquip: () => void;
  onUnequip: () => void;
}) {
  const equipped = equippedTitle === id;
  return (
    <div className="flex flex-col gap-2 border-2 border-border bg-background p-4">
      <div className="text-[12px] uppercase tracking-widest">{TITLES[id]}</div>
      <button
        onClick={equipped ? onUnequip : onEquip}
        className="mt-1 border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background data-[on=true]:bg-accent data-[on=true]:text-background"
        data-on={equipped}
      >
        {equipped ? "Equipped (Unequip)" : "Equip"}
      </button>
    </div>
  );
}

function OwnedCard({
  item, equippedSkin, equippedAbility, equippedWeapon,
  onEquipSkin, onEquipAbility, onUnequipAbility, onEquipWeapon, onUnequipWeapon,
}: {
  item: StoreItem;
  equippedSkin: string | null;
  equippedAbility: string | null;
  equippedWeapon: string | null;
  onEquipSkin: () => void;
  onEquipAbility: () => void;
  onUnequipAbility: () => void;
  onEquipWeapon: () => void;
  onUnequipWeapon: () => void;
}) {
  const isEquippedSkin = item.kind === "skin" && equippedSkin === item.id;
  const isEquippedAbility = item.kind === "ability" && equippedAbility === item.id;
  const isEquippedWeapon = item.kind === "weapon" && equippedWeapon === item.id;

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
        {item.kind === "weapon" && item.weapon && (
          <div className="border border-border px-2 py-0.5 text-[9px] tracking-widest">{(item.weapon.cooldownMs / 1000).toFixed(1)}s</div>
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
      {item.kind === "weapon" && (
        <button
          onClick={isEquippedWeapon ? onUnequipWeapon : onEquipWeapon}
          className="mt-1 border-2 border-border bg-background px-3 py-1 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background data-[on=true]:bg-accent data-[on=true]:text-background"
          data-on={isEquippedWeapon}
        >
          {isEquippedWeapon ? "✓ Equipped (Unequip)" : "Equip"}
        </button>
      )}
    </div>
  );
}
