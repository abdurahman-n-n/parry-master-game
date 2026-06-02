Expand the game from 10 to **30 levels** and change enemy scaling so each fight gains **+1 enemy every 5 levels**.

## Changes

**`src/game/levels.ts`**
- `TOTAL_LEVELS`: `10` → `30`.
- `enemyForLevel(level)`: still treats every 10th level as a boss (so bosses at 10, 20, 30). `tier = floor((level-1)/10)` already supports 3 tiers — extend `BOSS_TEMPLATES` so each tier has a distinct boss:
  - Tier 0 (lvl 10): existing **Colossus** (heavy hitter).
  - Tier 1 (lvl 20): **Wraith** — fast, erratic; lower HP scaling already handled.
  - Tier 2 (lvl 30): **Sovereign** — mixes heavy + slash + thrust, high HP.
- Regular HP formula unchanged (already scales with tier), so levels 11–29 naturally get harder.

**`src/game/ParryGame.tsx`**
- `enemyCountForLevel(level)`: change from `5 + floor((level-1)/10)` to `5 + floor((level-1)/5)`.
  - Result: levels 1–5 → 5 enemies, 6–10 → 6, 11–15 → 7, … 26–30 → 10 enemies.
- Update the doc comment to match the new rule.

## Notes

- No type changes; existing spawn / chase / aggregate-HP logic already supports any enemy count.
- Boss levels (10/20/30) still spawn `enemyCountForLevel(level)` instances of the boss — consistent with current behavior. (If you want bosses to always be solo, say so and I'll special-case `isBoss` to count = 1.)
- Levels page / unlocks already iterate via `TOTAL_LEVELS`, so bumping to 30 automatically shows all new levels.
