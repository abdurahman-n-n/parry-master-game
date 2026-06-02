# Adaptive enemies + scaled rewards

Scale enemies with level tier and boost late-game payouts. Tier = `floor((level-1)/10)` (0 for levels 1–10, 1 for 11–20, 2 for 21–30).

## `src/game/levels.ts`

- Export a small `levelTier(level)` helper.
- `enemyForLevel`: regular enemies get **+1 maxHp per tier** (in addition to existing scaling) and **attack windups reduced by 5% per tier** (faster hits, narrower parry windows scale proportionally so timing stays fair). Bosses get the same treatment so tier 2 boss is meaningfully harder than tier 0.
- `rewardForLevel(level, alreadyBeaten, isBoss)`:
  - Base credits: `15 + 5 * tier` (so +5 coins every 10 levels).
  - Gems unchanged.
  - If `isBoss`: double both credits and gems.
  - Replay still pays 1/3 (floor) of the computed reward.

## `src/game/ParryGame.tsx`

- Add `enemySpeedForLevel(level) = ENEMY_SPEED * (1 + 0.1 * tier)` and use it in the chase block instead of the constant `ENEMY_SPEED`. (+10% speed every 10 levels.)
- Enemies already chase the player; add **aiming** so attack zones face the player:
  - Compute `aimAngle = atan2(player.y - en.y, player.x - en.x)` at the moment the attack is scheduled, store it on `Incoming`.
  - Extend `zoneFor` to accept the angle and offset the zone in the aim direction (slash/thrust rectangles project forward from the enemy toward the player; heavy stays radial).
  - Render the telegraph rotated by `aimAngle` so the player sees the swing pointed at them.
- No change to enemy count or boss-vs-minion logic.

## `src/game/GameShell.tsx`

- Pass `enemy.isBoss` into `rewardForLevel(level, already, enemy.isBoss)` so boss rewards double.

## Technical notes

- Speed/hp/cadence scaling is read from `level` (passed to `ParryGame` already) so no new plumbing is needed.
- Parry window scales with windup (e.g. `parryWindowMs * (1 - 0.05 * tier)`) so the difficulty actually rises — otherwise faster attacks with same window become easier to parry blind.
- Aim angle is captured once per attack (at schedule time), not continuously tracked — keeps current "telegraph then commit" feel intact.

## Result by tier

| Tier | Levels | Speed | +HP | Hit speed | Coin reward | Boss reward |
|------|--------|-------|-----|-----------|-------------|-------------|
| 0 | 1–10 | 100% | +0 | 100% | 15 | 30 cr / 2 gems |
| 1 | 11–20 | 110% | +1 | 105% faster | 20 | 40 cr / 2 gems |
| 2 | 21–30 | 120% | +2 | 110% faster | 25 | 50 cr / 2 gems |
