# Vercel Deployment

This app is a TanStack Start SSR app. Vercel should build it with Nitro's
Vercel preset, configured in `vite.config.ts`.

## Project Settings

- Root Directory: project root (`parry-master-game`)
- Framework Preset: TanStack Start if Vercel detects it
- Install Command: `bun install --frozen-lockfile`
- Build Command: `bun run build`
- Output Directory: leave unset in Vercel settings so TanStack Start/Nitro
  detection can use the Build Output API output in `.vercel/output`.

## Environment Variables

Add these in Vercel Project Settings > Environment Variables for Production,
Preview, and Development:

```env
SUPABASE_URL=https://zbztusjdxgqjixtctvyd.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=zbztusjdxgqjixtctvyd
VITE_SUPABASE_URL=https://zbztusjdxgqjixtctvyd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
```

## Supabase Auth

Enable Google sign-in in Supabase:

1. Open Supabase Dashboard > Authentication > Providers > Google.
2. Enable Google.
3. Add the Google OAuth client ID and client secret from Google Cloud Console.
4. In Google Cloud Console, add this authorized redirect URI:

```text
https://zbztusjdxgqjixtctvyd.supabase.co/auth/v1/callback
```

5. In Supabase Dashboard > Authentication > URL Configuration, set the Site URL
   to the deployed Vercel URL.
6. Add allowed redirect URLs for production and local development, for example:

```text
https://your-vercel-domain.vercel.app
http://localhost:5173
```

## Database

Migrations are SQL files that create or update the Supabase tables the app uses.
Apply the files in `supabase/migrations` to the Supabase project before deploying
or cloud saves, sessions, and leaderboards will fail at runtime.

The Supabase project ref is `zbztusjdxgqjixtctvyd`, which is the part before
`.supabase.co` in the project URL.
