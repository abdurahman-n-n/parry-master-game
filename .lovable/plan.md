## Goal

Add an **Inventory** button on the main menu that opens a screen showing everything the player has purchased. Restructure the **Store** into three sections: Abilities, Skins, Upgrades. Items are bought once and persist; the Inventory reflects ownership.

## New files

### `src/game/inventory.ts`
Single source of truth for purchasable items + ownership persistence (`localStorage`, key `parry.inventory`).

- `type ItemKind = "ability" | "skin" | "upgrade"`
- `interface StoreItem { id; kind; name; desc; creditCost; gemCost?; icon?; }`
- `STORE_ITEMS: StoreItem[]`:
  - Abilities: `instakill` (50 credits), `dash` (25 credits) — buying unlocks them for battle use
  - Skins: `skin-crimson`, `skin-mint`, `skin-gold` (30 / 30 / 80 credits) — change player accent color
  - Upgrades: `hp-up` (+1 max HP, 60 credits), `dmg-up` (+1 strike damage, 80 credits), `cd-down` (-2s ability CD, 50 credits)
- `getOwned(): Set<string>`, `isOwned(id)`, `buyItem(id): {ok, reason?}` (checks ownership + spends credits/gems via `Currency.ts`)
- `getEquippedSkin() / setEquippedSkin(id)` for skin selection

### `src/game/InventoryScreen.tsx`
Read-only screen listing owned items grouped by section (Abilities / Skins / Upgrades). Empty section shows muted "None yet — visit the Store". Skins section has an **Equip** button per owned skin (highlights the equipped one). Back button returns to menu.

## Edits

### `src/game/StoreScreen.tsx`
Replace current single-section layout with three sections (Abilities / Skins / Upgrades) driven by `STORE_ITEMS`. Each card shows name, desc, cost, and a **Buy** / **Owned** button. Buying calls `buyItem`, updates local state, and refreshes the currency HUD. Show insufficient-funds feedback inline.

### `src/game/GameShell.tsx`
- Add `"inventory"` to the `Screen` union.
- Add `🎒 Inventory` button on the main menu (next to Store).
- Route `"inventory"` to `<InventoryScreen onBack={() => setScreen("menu")} />`.

### `src/game/ParryGame.tsx` (minimal wiring so purchases matter)
- Abilities: `useInstakill` / `useDash` early-return with a log message if `!isOwned("instakill")` / `!isOwned("dash")`.
- Skin: read `getEquippedSkin()` and pass its color into `<PixelCharacter accent={...} />` (player tint only — no other gameplay changes).
- Upgrades (read once at mount):
  - `hp-up` → `character.maxHp + 1`
  - `dmg-up` → riposte/strike deal `2` instead of `1`
  - `cd-down` → ability cooldowns `-2000ms`

### Runtime error fix (silent)
`GameShell.tsx` no longer imports the deleted `./content`. Confirm and remove any stale import if present — the current snapshot already looks clean, but the preview is showing a stale error, so we'll re-save the file to clear it.

## Out of scope
No backend, no new currencies, no balance retuning beyond the upgrade effects above. Existing level/reward system untouched.
