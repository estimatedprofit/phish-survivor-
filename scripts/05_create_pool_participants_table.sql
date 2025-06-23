-- Tracks which users are in which pool and their status
CREATE TABLE IF NOT EXISTS public.pool_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  status TEXT NOT NULL DEFAULT 'ALIVE', -- ALIVE, OUT
  current_streak INTEGER DEFAULT 0,
  UNIQUE (pool_id, user_id) -- A user can only be in a specific pool once
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pool_participants_pool_id ON public.pool_participants(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_participants_user_id ON public.pool_participants(user_id);

ALTER TABLE public.pool_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their own entries." ON public.pool_participants;
CREATE POLICY "Participants can view their own entries."
  ON public.pool_participants FOR SELECT
  USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can join pools." ON public.pool_participants;
CREATE POLICY "Users can join pools."
  ON public.pool_participants FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- Admins can see all participant records for management
DROP POLICY IF EXISTS "Admins can view all participant records." ON public.pool_participants;
CREATE POLICY "Admins can view all participant records."
  ON public.pool_participants FOR SELECT
  USING ( public.is_admin() );

-- Admins can update participant status (e.g., for elimination)
DROP POLICY IF EXISTS "Admins can update participant records." ON public.pool_participants;
CREATE POLICY "Admins can update participant records."
  ON public.pool_participants FOR UPDATE
  USING ( public.is_admin() );
