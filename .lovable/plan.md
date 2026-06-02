## Infinite Dungeon tweaks

### Rewards
- Each cleared wave grants **50 coins + 1 gem**, awarded immediately as the wave ends (so an abandoned run still keeps everything earned up to that point).
- Show a small "+50 / +1💎" toast or HUD bump on wave clear; final run summary shows totals (waves, coins, gems).

### Wave scaling
- Start at **1 enemy** on wave 1 (was 25).
- Keep "+1 enemy every 5 waves" progression → wave 1:1, wave 6:2, wave 11:3, etc.
- **Boss every 10 waves** (waves 10, 20, 30…). Remove the previous "every 10" duplicate logic — single source of truth.
- Buff selection still triggers every 20 waves.

### Files to edit
- `src/game/InfiniteDungeon.tsx`
  - Change base enemy count `25 → 1`.
  - On each successful wave completion: increment local `coinsEarned += 50`, `gemsEarned += 1`, persist to currency store, show toast.
  - Pass cumulative totals into the end-of-run summary.
- `src/game/ParryGame.tsx` — no logic change, just verify `enemyCountOverride` still flows through.
- Currency helper (wherever `rewardForLevel` lives, e.g. `src/game/levels.ts` or a currency module) — reuse existing add-coins / add-gems function; no new API needed.

No changes to controls, pause/abandon, or leaderboard logic.