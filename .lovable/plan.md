The player's HP is tracked internally (`playerHp` state) but the `StatusRow` component only shows "Alive" / "Down" with a full/empty bar. Update it to show actual HP values.

**Changes to `src/game/ParryGame.tsx`:**

1. **Refactor `StatusRow`** — add optional `hp` / `maxHp` number props. When both are provided, render the bar width proportionally (`(hp / maxHp) * 100%`) and display `"{hp}/{maxHp}"` on the right instead of "Alive" / "Down". Keep the existing `alive` boolean behavior as a fallback when hp/maxHp are omitted.

2. **Wire player stats** — at the call site (line 725), pass:
   - `hp={playerHp}`
   - `maxHp={character.maxHp + hpUpCount}`
   (computed the same way as the initial `playerHp` state)

This gives the player a proportional HP bar and exact numeric readout during fights, matching how enemy HP is already displayed.