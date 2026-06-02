# Plan: Add Logout Confirmation Dialog

## What to build
A confirmation modal that appears when the user presses the Logout button, asking "Are you sure you want to logout?" with two options: **Logout** and **Cancel**.

## Where to change
- `src/game/GameShell.tsx` — add the confirmation flow before the actual logout action

## How
1. Add a new `showLogoutConfirm` state boolean in `GameShell`.
2. Replace the Logout button's `onClick` handler to set `showLogoutConfirm` to `true` instead of logging out immediately.
3. Render a centered modal overlay (matching the game's existing pixel-styled UI with border-2, border-border, bg-background, etc.) when `showLogoutConfirm` is true. The modal contains:
   - The confirmation message: "Are you sure you want to logout?"
   - A "Logout" button that calls the actual logout logic and closes the modal
   - A "Cancel" button that closes the modal without logging out
4. The modal sits above all other content with a semi-transparent or solid overlay to block interaction with the background.

No other files need changes. No backend or auth logic changes needed.