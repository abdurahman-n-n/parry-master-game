
# Email verification via 6-digit code

Goal: confirm the user actually owns the Gmail (or any email) they typed by sending a real 6-digit code to it. Required on register AND on every login.

## Flow

**Register**
1. User enters nickname + password + email.
2. App sends a 6-digit code to that email.
3. New "Enter code" screen — on success, account is created and they enter the game.

**Login**
1. User enters nickname + password (as today).
2. App sends a 6-digit code to the email on file.
3. "Enter code" screen — on success, they enter the game.

Resend button with 30s cooldown. Wrong code = error; 5 wrong attempts invalidates the code.

## Backend

- New `auth_codes` table: `email`, `code_hash` (SHA-256), `purpose` ('register' | 'login'), `expires_at` (10 min), `attempts`. RLS denies all — only server (service role) reads/writes.
- Server function `requestEmailCode({ email, purpose })` — generates 6-digit code, hashes it, upserts row, sends email through Lovable Emails. Rate-limited 1 per 30s per email.
- Server function `verifyEmailCode({ email, code, purpose })` — checks hash + expiry + attempts, deletes row on success.

## Frontend (`src/game/AuthScreen.tsx`)

- Add `email` input to register.
- Account record extended to `{ nickname, password, email }` in localStorage. Existing accounts without an email get prompted once to add+verify one before they can log in.
- After step 1 (register or login passes), render a new `EmailCodeStep` component: 6 digit boxes, "Resend code" (30s cooldown), error text.
- On verify success → `onAuthed(nickname)` as today.

## Technical notes

- Codes never travel to the client.
- Email delivery uses Lovable Emails (no API key needed). Setup requires a workspace email domain — if not already configured, I'll trigger the email setup dialog so you (or a workspace admin) can complete it; without it, emails can't actually go out.
- Game data still lives in localStorage per nickname; only the verification step uses the backend.
