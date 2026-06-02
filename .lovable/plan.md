## Goal
Show dates as all-numeric values (DD/MM/YY) instead of locale-formatted text like "Jun 2, 26".

## Change
In `src/game/LeaderboardScreen.tsx`, replace the `toLocaleDateString` call for the "First Gem" column with a numeric format:

```ts
const d = new Date(e.firstGemAt);
const dd = String(d.getDate()).padStart(2, "0");
const mm = String(d.getMonth() + 1).padStart(2, "0");
const yy = String(d.getFullYear()).slice(-2);
const date = `${dd}/${mm}/${yy}`;
```

No other files use date formatting, so this is the only spot to change.