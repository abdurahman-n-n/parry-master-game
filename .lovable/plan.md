## Settings Color → Lobby & Arena Background

The color picker in `SettingsScreen` currently sets `--accent` and `--border`. The user wants it to set the **background color** of both the lobby (menu, level select, store, etc.) and the in-fight arena. Both already use `bg-background`, so writing to `--background` will cover everything in one shot.

### Changes

**`src/game/SettingsScreen.tsx`**
1. Rewrite `applyAccent(rgb)`:
   - Set `--background: rgb(r, g, b)` on `document.documentElement`.
   - Compute perceived luminance (`0.299*r + 0.587*g + 0.114*b`) and pick a contrasting `--foreground` (near-black for light bg, near-white for dark bg) so text/buttons stay readable. Also derive a `--border` and `--muted-foreground` from that foreground at lower opacity (or a darker/lighter shade of bg).
   - Stop overriding `--accent` (leave the theme accent intact) — or keep it; user didn't ask to change accent behavior. Prefer leaving `--accent` alone.
2. Rename the section heading from "Accent Color" to "Background Color".
3. Keep the existing storage key + default RGB; only the meaning changes. (Optionally rename `STORAGE_KEY` to `parry-bg-rgb` with a one-time migration — skipping unless you want it.)
4. Function names `getSavedAccent` / `applyAccent` stay (used by `GameShell`) to avoid churn, or rename to `getSavedBgColor` / `applyBgColor` and update the two call sites in `GameShell.tsx`. Recommend renaming for clarity.

**`src/game/GameShell.tsx`**
- If renamed, update imports and the two call sites (lines 8, 28). No other logic changes — `bg-background` Tailwind class already picks up the new variable.

No changes needed in `ParryGame.tsx` — its `bg-background` arena container will follow automatically.

### Notes
- Contrast handling is essential, otherwise picking a pale yellow will make white-on-bg text invisible. The luminance-based foreground swap solves this without needing per-screen tweaks.