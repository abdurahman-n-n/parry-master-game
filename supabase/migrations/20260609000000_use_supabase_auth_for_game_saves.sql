-- Move PARRY from custom nickname/password auth to Supabase Auth.
-- Existing custom-account saves cannot be safely mapped to auth.users, so the
-- old save rows are cleared before user_id constraints are added.

DROP TABLE IF EXISTS public.auth_codes;
DROP TABLE IF EXISTS public.game_sessions;

ALTER TABLE public.game_saves DROP CONSTRAINT IF EXISTS game_saves_account_id_fkey;
TRUNCATE TABLE public.game_saves;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'game_saves'
      AND column_name = 'account_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'game_saves'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.game_saves RENAME COLUMN account_id TO user_id;
  END IF;
END $$;

ALTER TABLE public.game_saves
  ADD CONSTRAINT game_saves_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

DROP TABLE IF EXISTS public.game_accounts;

CREATE TABLE IF NOT EXISTS public.game_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.game_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.game_profiles TO authenticated;

GRANT SELECT ON public.game_saves TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.game_saves TO authenticated;

DROP POLICY IF EXISTS game_profiles_public_read ON public.game_profiles;
DROP POLICY IF EXISTS game_profiles_own_insert ON public.game_profiles;
DROP POLICY IF EXISTS game_profiles_own_update ON public.game_profiles;

CREATE POLICY game_profiles_public_read
  ON public.game_profiles
  FOR SELECT
  USING (true);

CREATE POLICY game_profiles_own_insert
  ON public.game_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY game_profiles_own_update
  ON public.game_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS game_saves_public_leaderboard_read ON public.game_saves;
DROP POLICY IF EXISTS game_saves_own_read ON public.game_saves;
DROP POLICY IF EXISTS game_saves_own_insert ON public.game_saves;
DROP POLICY IF EXISTS game_saves_own_update ON public.game_saves;
DROP POLICY IF EXISTS game_saves_own_delete ON public.game_saves;
DROP POLICY IF EXISTS game_saves_admin_season_delete ON public.game_saves;

CREATE POLICY game_saves_public_leaderboard_read
  ON public.game_saves
  FOR SELECT
  USING (key IN (
    'parry.lifetimeGems',
    'parry.infinite.bestWave',
    'parry.infinite.bestWaveAt',
    'parry-gems'
  ));

CREATE POLICY game_saves_own_read
  ON public.game_saves
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY game_saves_own_insert
  ON public.game_saves
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY game_saves_own_update
  ON public.game_saves
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY game_saves_own_delete
  ON public.game_saves
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY game_saves_admin_season_delete
  ON public.game_saves
  FOR DELETE
  USING ((auth.jwt() ->> 'email') ILIKE 'abdurahman%');
