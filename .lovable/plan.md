## Goal

In Infinite Dungeon, the player's HP should carry over between waves. If you finish wave N with 6/10 HP, wave N+1 starts at 6/10 HP (not refilled to max). Buff-induced max HP increases raise the cap; current HP stays where it was (clamped to new max).

Only Infinite Dungeon is affected — normal Story levels keep their current "full HP each level" behavior.

## Changes

### `src/game/ParryGame.tsx`
- Add optional prop `startHpOverride?: number`.
- Initialize `playerHp` state to `Math.min(playerMaxHp, startHpOverride ?? playerMaxHp)`.
- Extend `FightResult` with `playerHpRemaining: number`.
- In `endFight`, include current `playerHp` in the `_payload` (0 on defeat, remaining hp on victory).

### `src/game/InfiniteDungeon.tsx`
- Add `currentHp` state (nullable; `null` = use max).
- Reset to `null` in `startRun`.
- In `onFightEnd` victory branch, store `res.playerHpRemaining` into `currentHp`.
- Pass `startHpOverride={currentHp ?? undefined}` into `<ParryGame>`.
- Buff picks don't touch `currentHp` — the HP buff raises max, current stays (ParryGame clamps via the `Math.min` init on the next mount, which is fine since hpMul only grows).

No other files affected. Story mode (`GameShell`) doesn't pass `startHpOverride`, so it continues healing fully between levels.
