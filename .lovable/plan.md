# Email 2FA on Login

Add a second step to login: after correct nickname + password, the user gets a 6-digit code emailed to them and must enter it to enter the game.

## Flow

1. **Register** — add an `email` field next to nickname/password. Stored on the local account.
2. **Login step 1** — nickname + password (as today). On success, server generates a 6-digit code, emails it, returns success (no code to client).
3. **Login step 2** — new screen: "Enter the 6-digit code sent to a***@gmail.com". Resend button (30s cooldown). On verify success → enter game.

## Setup

- Connect **Resend** (the previous attempt was rejected — I'll re-trigger it). Sender starts as `onboarding@resend.dev` for testing; for production delivery to arbitrary inboxes the user will need a verified domain in Resend.

## Backend

- New table `auth_codes` (email, code_hash, expires_at, attempts) — code hashed with SHA-256, 10‑min expiry, max 5 attempts, RLS denies all (only service role writes/reads).
- Server function `requestLoginCode({ email })` — generates code, hashes, upserts row, sends email via Resend gateway.
- Server function `verifyLoginCode({ email, code })` — checks hash + expiry + attempts, deletes row on success.

## Frontend

- `src/game/AuthScreen.tsx` — add email field on register; on login success, transition to step 2.
- New `TwoFactorStep` rendered inside AuthScreen with 6-digit input, resend button, error display.
- Account record extended to `{ nickname, password, email }`; existing accounts without an email get prompted once to add one before they can log in.

## Technical notes

- Codes never travel to the client.
- Rate-limit `requestLoginCode` to 1/30s per email server-side.
- All Supabase calls go through `createServerFn` with `supabaseAdmin` (no user session exists yet at login).
