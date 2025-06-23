-- Information about each survivor pool
CREATE TABLE IF NOT EXISTS public.pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()),
  name TEXT NOT NULL,
  description TEXT,
  tour_name TEXT NOT NULL,
  signup_deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'SIGNUPS_OPEN', -- SIGNUPS_OPEN, ACTIVE, COMPLETED
  visibility TEXT NOT NULL DEFAULT 'public', -- public, private
  max_players INTEGER,
  pick_lock_offset_hours INTEGER DEFAULT 1,
  pick_lock_offset_minutes INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles NOT NULL
);

ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pools are viewable by everyone." ON public.pools;
CREATE POLICY "Pools are viewable by everyone."
  ON public.pools FOR SELECT
  USING ( TRUE );

DROP POLICY IF EXISTS "Admins can manage pools." ON public.pools;
CREATE POLICY "Admins can manage pools."
  ON public.pools FOR ALL
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- Enable moddatetime extension for updated_at trigger
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- Trigger to update `updated_at` timestamp
DROP TRIGGER IF EXISTS handle_pool_updated_at ON public.pools;
CREATE TRIGGER handle_pool_updated_at
BEFORE UPDATE ON public.pools
FOR EACH ROW
EXECUTE PROCEDURE extensions.moddatetime (updated_at);
