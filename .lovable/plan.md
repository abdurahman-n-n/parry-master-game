## Insta-Kill: Boss First, Else Closest

In `src/game/ParryGame.tsx`, replace the "strongest alive" target selection in `useInstakill` (~lines 255–261) with:

1. Scan `enemiesRef.current` for any alive enemy whose `def.isBoss === true`. If found, that's the target.
2. Otherwise, pick the alive enemy with the smallest Euclidean distance to `playerRef.current`.
3. Apply the kill exactly as today (`target.hp = 0`, flash, log, `checkVictory()`).

No other files affected.