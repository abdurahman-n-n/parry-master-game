ALTER TABLE public.game_profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT;
