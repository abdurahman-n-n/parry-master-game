Replace the combined credits+gem upgrade cost with a **choice**: for upgrades only, the user picks one currency per purchase. Abilities and skins stay credits-only.

## UX

On each upgrade card in `StoreScreen.tsx`, replace the single Buy button with **two buttons side-by-side**:
- `Buy — {creditPrice} ⛃`  (pays credits only)
- `Buy — {gemPrice} ◆`  (pays gems only)

Each disables independently when its currency is insufficient. Owned-state styling (`✓ Owned`) does not apply to upgrades (stackable). Abilities/skins keep the single Buy button.

The bottom hint line is updated to: "Upgrades: pay with credits OR gems."

## Pricing rules

- **Credit price** (unchanged): `creditCost + 10 * upgradeCount`
- **Gem price** (new): `1 + floor(upgradeCount / 5)` — increases by 1 every 5 stacks of that upgrade.
- Non-upgrades: gem price = `item.gemCost ?? 0` (unchanged, currently 0 for all).

## Changes

**`src/game/inventory.ts`**
- Remove the flat `UPGRADE_GEM_COST = 1` model.
- `getUpgradeGemCost(item)` → for upgrades returns `1 + Math.floor(getUpgradeCount(item.id) / 5)`; otherwise `item.gemCost ?? 0`.
- `buyItem(id, currency?)` → add optional `currency: "credits" | "gems"` arg.
  - For upgrades: required. If `"credits"` → spend only credits at `getUpgradePrice`. If `"gems"` → spend only gems at `getUpgradeGemCost`. Never both.
  - For non-upgrades: ignore arg, behave as today (credits + any `item.gemCost`).
- `BuyResult` reasons unchanged (`credits` | `gems` | `owned` | `missing`).

**`src/game/StoreScreen.tsx`**
- `handleBuy(id, currency?)` forwards currency to `buyItem`.
- `StoreCard`: when `item.kind === "upgrade"`, render two Buy buttons (credits / gems), each with its own price + icon and disabled state based on current balance. Drop the separate price row for upgrades (price lives on each button). For non-upgrades, keep current layout.
- Update the footer hint copy.

**No changes** to `InventoryScreen.tsx`, `ParryGame.tsx`, `Currency.tsx`, abilities, or skins.

## Rationale

User asked for a button to choose gems or coins, **only for upgrades**. Gem price scales "by 1 every time that stat was upgraded by +5" → `1 + floor(count / 5)`: purchases 1–5 cost 1 gem, 6–10 cost 2 gems, etc. Credit scaling stays as previously established.
