# Project Rules

## Deployment

- This is a TanStack Start SSR app that deploys to Vercel through Nitro.
- Keep the Vercel root directory at the repository root: `parry-master-game`.
- Use the Bun lockfile already in this repo. Vercel install command: `bun install --frozen-lockfile`.
- Vercel build command: `bun run build`.
- Vercel output directory: `.vercel/output`.
- Vercel framework preset may be `Other`, or `TanStack Start` if Vercel detects it.
- Keep `vite.config.ts` using Nitro's `vercel` preset so the build creates `.vercel/output`.
- Add or change `vercel.json` only when the deployment needs explicit build/install/output settings.

## Environment Safety

- Never commit real `.env` files or local secret handoff files.
- Keep `.env`, `.env.*`, `VERCEL_ENV_IMPORT.local.env`, and `VERCEL_ENV_VALUES.local.md` ignored.
- Keep `.env.example` committed with variable names only and no real values.
- Public browser variables use `VITE_*`; they are visible to users.
- Never put private keys in `VITE_*`, `NEXT_PUBLIC_*`, or other frontend-exposed variables.

## Supabase

- Supabase project ref: `zbztusjdxgqjixtctvyd`.
- `SUPABASE_URL` is the base project URL, for example `https://PROJECT_REF.supabase.co`; do not append `/rest/v1`.
- `SUPABASE_PUBLISHABLE_KEY` is the anon/public frontend-safe key.
- `VITE_SUPABASE_PUBLISHABLE_KEY` is the same anon/public key exposed to the browser.
- `VITE_SUPABASE_URL` is the same base project URL exposed to the browser.
- `VITE_SUPABASE_PROJECT_ID` is the project ref only.
- `SUPABASE_SERVICE_ROLE_KEY` is a secret backend/server-only key. Never expose it in frontend code.
- Service role is required here because server functions create accounts/sessions, save game data, read leaderboards, and reset season data against RLS-protected tables.

## Migrations

- Migrations are SQL files that create or update database tables.
- Supabase migrations live in `supabase/migrations`.
- Before deploy, make sure the target Supabase project has these migrations applied.
- If Supabase reports `Could not find the table ... in the schema cache`, apply the SQL migration in the Supabase SQL Editor or with the Supabase CLI.
- To find the Supabase project ref, use the part of `https://PROJECT_REF.supabase.co` before `.supabase.co`.

## AI Keys

- `GEMINI_API_KEY` is secret backend/server-only. Never use `VITE_GEMINI_API_KEY`.
- `GEMINI_MODEL` should default to `gemini-2.5-flash-lite` for student projects unless the user explicitly asks for another model.
- Do not add Gemini env vars unless the code actually uses Gemini.

## Before Deploy

- Confirm the Git remote and branch are the intended project.
- Confirm `.env` is ignored and not tracked.
- Confirm `.env.example` is committed and contains names only.
- Confirm all required Vercel env vars are set for Production, Preview, and Development.
- Confirm Supabase migrations are applied to project `zbztusjdxgqjixtctvyd`.
- Run `bun run build` and verify `.vercel/output` is created.
