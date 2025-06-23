-- Information about each Phish show relevant to a pool
CREATE TABLE IF NOT EXISTS public.shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools ON DELETE CASCADE NOT NULL, -- Each show belongs to one pool
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  phish_net_show_id TEXT, -- Optional, from phish.net
  show_date DATE NOT NULL,
  venue_name TEXT NOT NULL,
  city_state TEXT,
  set_time TEXT, -- e.g., "9:00 PM ET"
  pick_deadline TIMESTAMPTZ, -- Calculated based on set_time and pool's offset
  status TEXT NOT NULL DEFAULT 'UPCOMING', -- UPCOMING, PICKS_LOCKED, PLAYED
  setlist JSONB, -- Stores an array of song IDs (as text or actual UUIDs if songs table uses UUIDs for IDs) or song titles
  CONSTRAINT uq_pool_date_venue UNIQUE (pool_id, show_date, venue_name) -- Prevent duplicate shows in the same pool
);
