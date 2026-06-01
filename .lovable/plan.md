## Goal
Permanent upgrades (Vitality, Sharpened, Quick Hands) become infinitely repurchasable. Each purchase increases that upgrade's price by 10 credits.

## Changes

**`src/game/inventory.ts`**
- Track upgrade purchase counts in localStorage (`parry.upgradeCounts`, `Record<string, number>`).
- Add `getUpgradeCount(id)` and `getUpgradePrice(item)` = `baseCost + 10 * count`.
- `buyItem`: for `kind === "upgrade"`, skip the "already owned" check, use dynamic price, increment count instead of pushing into the owned list. Other kinds (ability, skin) keep current one-time-buy behavior.
- Add `getUpgradeBonus(id)` helper returning the count (used by combat).

**`src/game/StoreScreen.tsx`**
- For upgrade cards: display dynamic price via `getUpgradePrice`, show "Owned: xN" instead of disabling, button always reads "Buy".
- Abilities/skins unchanged.

**`src/game/InventoryScreen.tsx`**
- Upgrades section shows each upgrade with its current stack count (e.g. "Vitality ×3"). Hide upgrades with count 0.

**`src/game/ParryGame.tsx`**
- Replace `isOwned("hp-up" | "dmg-up" | "cd-down")` checks with `getUpgradeCount(...)`:
  - `playerHp` bonus: `+count("hp-up")`
  - `strikeDmg`: `1 + count("dmg-up")`
  - `cdAdjust`: `-2 * count("cd-down")` seconds (floor at a small minimum like 1s).

No other systems touched.
