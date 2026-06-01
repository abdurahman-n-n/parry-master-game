import { useState } from "react";
import {
  CHARACTERS, SKINS, getOwnedCharacters, getOwnedSkins, getEquipped,
  ownCharacter, ownSkin, equip, findCharacter, skinsFor,
} from "./characters";
import {
  CurrencyHUD, CreditIcon, GemIcon,
  getCredits, getGems, getCrowns, spendCredits, spendGems,
} from "./Currency";
import { PixelCharacter } from "./PixelCharacters";

export function ShopScreen({ onBack }: { onBack: () => void }) {
  const [, setBump] = useState(0);
  const bump = () => setBump((n) => n + 1);

  const credits = getCredits();
  const gems = getGems();
  const crowns = getCrowns();
  const ownedC = getOwnedCharacters();
  const ownedS = getOwnedSkins();
  const equipped = getEquipped();

  const buyCharacter = (id: string, cost: number, currency: "credits" | "gems") => {
    const ok = currency === "credits" ? spendCredits(cost) : spendGems(cost);
    if (!ok) return;
    ownCharacter(id);
    bump();
  };
  const buySkin = (id: string, cost: number, currency: "credits" | "gems") => {
    const ok = currency === "credits" ? spendCredits(cost) : spendGems(cost);
    if (!ok) return;
    ownSkin(id);
    bump();
  };
  const equipChar = (id: string) => {
    const skin = skinsFor(id).find((s) => ownedS.includes(s.id)) ?? skinsFor(id)[0];
    equip(id, skin.id);
    bump();
  };
  const equipSkin = (charId: string, skinId: string) => {
    equip(charId, skinId);
    bump();
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
        <div className="text-2xl tracking-[0.3em]">SHOP</div>
        <CurrencyHUD credits={credits} gems={gems} crowns={crowns} />
      </div>

      {/* Characters */}
      <div className="w-full max-w-2xl">
        <div className="mb-2 text-[11px] uppercase tracking-widest text-accent">Characters</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CHARACTERS.map((c) => {
            const owned = ownedC.includes(c.id);
            const isEquipped = equipped.characterId === c.id;
            const defaultSkin = `${c.id}:default`;
            return (
              <div key={c.id} className="flex flex-col items-center gap-2 border-2 border-border bg-background p-3">
                <PixelCharacter skinId={defaultSkin} size={72} />
                <div className="text-[11px] uppercase tracking-widest">{c.name}</div>
                <div className="text-center text-[9px] normal-case tracking-wider text-muted-foreground">{c.blurb}</div>
                {owned ? (
                  <button
                    onClick={() => equipChar(c.id)}
                    disabled={isEquipped}
                    className="w-full border-2 border-border bg-foreground px-2 py-1 text-[9px] uppercase tracking-widest text-background hover:bg-accent disabled:opacity-50"
                  >
                    {isEquipped ? "Equipped" : "Equip"}
                  </button>
                ) : (
                  <button
                    onClick={() => buyCharacter(c.id, c.cost, c.currency)}
                    className="inline-flex w-full items-center justify-center gap-1 border-2 border-border bg-background px-2 py-1 text-[9px] uppercase tracking-widest hover:bg-foreground hover:text-background"
                  >
                    Buy {c.cost}{" "}
                    {c.currency === "credits" ? <CreditIcon size={11} /> : <GemIcon size={11} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Skins */}
      <div className="w-full max-w-2xl">
        <div className="mb-2 text-[11px] uppercase tracking-widest text-accent">Skins</div>
        <div className="flex flex-col gap-3">
          {CHARACTERS.map((c) => {
            const skins = skinsFor(c.id);
            return (
              <div key={c.id} className="border-2 border-border bg-background p-3">
                <div className="mb-2 text-[10px] uppercase tracking-widest text-foreground">{c.name}</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {skins.map((s) => {
                    const owned = ownedS.includes(s.id);
                    const isEquipped = equipped.skinId === s.id;
                    const charOwned = ownedC.includes(c.id);
                    return (
                      <div key={s.id} className="flex flex-col items-center gap-1 border border-border p-2">
                        <PixelCharacter skinId={s.id} size={48} />
                        <div className="text-[9px] uppercase tracking-widest">{s.name}</div>
                        {owned ? (
                          <button
                            onClick={() => equipSkin(c.id, s.id)}
                            disabled={isEquipped || !charOwned}
                            className="w-full border border-border bg-foreground px-1 py-0.5 text-[8px] uppercase tracking-widest text-background hover:bg-accent disabled:opacity-50"
                          >
                            {isEquipped ? "Equipped" : charOwned ? "Equip" : "Locked"}
                          </button>
                        ) : (
                          <button
                            onClick={() => buySkin(s.id, s.cost, s.currency)}
                            className="inline-flex w-full items-center justify-center gap-1 border border-border bg-background px-1 py-0.5 text-[8px] uppercase tracking-widest hover:bg-foreground hover:text-background"
                          >
                            {s.cost}{" "}
                            {s.currency === "credits" ? <CreditIcon size={9} /> : <GemIcon size={9} />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-[8px] uppercase tracking-widest text-muted-foreground">
        Equipped: {findCharacter(equipped.characterId)?.name} · {equipped.skinId.split(":")[1]}
      </div>
    </div>
  );
}
