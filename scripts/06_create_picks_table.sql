-- User song picks for specific shows in a pool
CREATE TABLE IF NOT EXISTS public.picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_participant_id UUID REFERENCES public.pool_participants ON DELETE CASCADE NOT NULL,
  show_id UUID REFERENCES public.shows ON DELETE CASCADE NOT NULL,
  song_id UUID REFERENCES public.songs ON DELETE RESTRICT NOT NULL,
  picked_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  result TEXT DEFAULT 'PENDING', -- PENDING, WIN, LOSE
  UNIQUE (pool_participant_id, show_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_picks_pool_participant_id ON public.picks(pool_participant_id);
CREATE INDEX IF NOT EXISTS idx_picks_show_id ON public.picks(show_id);

ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own picks." ON public.picks;
CREATE POLICY "Users can view their own picks."
  ON public.picks FOR SELECT
  USING ( EXISTS (SELECT 1 FROM pool_participants WHERE pool_participants.id = pool_participant_id AND pool_participants.user_id = auth.uid()) );

DROP POLICY IF EXISTS "Users can insert/update their own picks." ON public.picks;
CREATE POLICY "Users can insert/update their own picks."
  ON public.picks FOR INSERT -- Changed from ALL to INSERT
  WITH CHECK ( EXISTS (SELECT 1 FROM pool_participants WHERE pool_participants.id = pool_participant_id AND pool_participants.user_id = auth.uid()) );

DROP POLICY IF EXISTS "Users can update their own picks." ON public.picks;
CREATE POLICY "Users can update their own picks."
  ON public.picks FOR UPDATE
  USING ( EXISTS (SELECT 1 FROM pool_participants WHERE pool_participants.id = pool_participant_id AND pool_participants.user_id = auth.uid()) );

-- Admins can view all picks
DROP POLICY IF EXISTS "Admins can view all picks." ON public.picks;
CREATE POLICY "Admins can view all picks."
  ON public.picks FOR SELECT
  USING ( public.is_admin() );

-- Admins can update pick results
DROP POLICY IF EXISTS "Admins can update pick results." ON public.picks;
CREATE POLICY "Admins can update pick results."
  ON public.picks FOR UPDATE -- Changed from ALL to UPDATE
  USING ( public.is_admin() );
