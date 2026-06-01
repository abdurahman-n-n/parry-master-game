Add a flat 1-gem cost to every permanent upgrade purchase, alongside the existing scaling credit cost.

## Changes

**`src/game/inventory.ts`**
- Add constant `UPGRADE_GEM_COST = 1`.
- Add helper `getUpgradeGemCost(item)` → returns `UPGRADE_GEM_COST` for upgrades, `item.gemCost ?? 0` otherwise.
- In `buyItem`:
  - For upgrades, require and spend 1 gem (in addition to the dynamic credit price).
  - Check both balances before spending either currency (no partial debits).
  - Keep the existing +10 credit-per-purchase scaling and stack-count increment.

**`src/game/StoreScreen.tsx`**
- Show the 1 gem cost next to the credit cost on upgrade cards (use existing `GemIcon`).
- "Buy" button feedback already handles the `gems` reason from `buyItem`.

No changes to abilities, skins, or `ParryGame.tsx`.

## Rationale
User said "upgrades are bought for 1 gem". Interpreted as an additional gem cost layered on top of the existing credit price (rather than replacing it), since the +10 credits-per-purchase scaling was just added in the prior turn and removing it would contradict that. Gem cost stays flat at 1 per purchase.