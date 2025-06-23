-- Seed some shows for the "Summer Tour Survivor" pool
-- This script will add the shows for the pool with ID: ee60fddd-d532-405b-944b-2d12e030372c

DO $$
DECLARE
  summer_pool_id uuid := 'ee60fddd-d532-405b-944b-2d12e030372c'; -- Your Pool ID
  show_date_1 date;
  show_date_2 date;
  show_date_3 date;
  show_date_4 date;
  
  -- Song UUIDs (replace with actual UUIDs from your songs table if different)
  -- These are examples based on common song titles. Verify them if you have specific UUIDs.
  -- For simplicity, I'm using placeholder UUIDs. You should have these from your songs table.
  -- Let's assume these are the correct UUIDs for Tweezer, Reba, Ghost from your 'songs' table.
  -- If you have the actual UUIDs, please replace them here.
  -- If not, this script will still run but the setlist for the first show might be symbolic if these UUIDs don't match.
  tweezer_uuid uuid; 
  reba_uuid uuid;
  ghost_uuid uuid;

BEGIN
  -- Attempt to find song UUIDs. If not found, they will remain NULL and setlist might be affected.
  SELECT id INTO tweezer_uuid FROM public.songs WHERE title = 'Tweezer' LIMIT 1;
  SELECT id INTO reba_uuid FROM public.songs WHERE title = 'Reba' LIMIT 1;
  SELECT id INTO ghost_uuid FROM public.songs WHERE title = 'Ghost' LIMIT 1;

  -- Set show dates relative to today for dynamic testing
  show_date_1 := current_date - interval '2 days'; -- Past show
  show_date_2 := current_date + interval '3 days'; -- Upcoming show
  show_date_3 := current_date + interval '7 days'; -- Further upcoming show
  show_date_4 := current_date + interval '1 days'; -- Upcoming show, picks might lock soon

  -- Ensure the pool exists before adding shows
  IF NOT EXISTS (SELECT 1 FROM public.pools WHERE id = summer_pool_id) THEN
    RAISE NOTICE 'Pool with ID % not found. Shows not added.', summer_pool_id;
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding shows for pool ID: %', summer_pool_id;

  -- Show 1 (Past)
  -- Using COALESCE to handle cases where song UUIDs might not be found, storing as an array of text.
  INSERT INTO public.shows (pool_id, show_date, venue_name, city_state, set_time, status, setlist)
  VALUES (summer_pool_id, show_date_1, 'The Sphere', 'Las Vegas, NV', '8:00 PM PT', 'PLAYED', 
    jsonb_build_array(
        COALESCE(tweezer_uuid::text, 'Tweezer (UUID not found)'), 
        COALESCE(reba_uuid::text, 'Reba (UUID not found)'), 
        COALESCE(ghost_uuid::text, 'Ghost (UUID not found)')
    )
  )
  ON CONFLICT (pool_id, show_date, venue_name) DO UPDATE SET
    status = EXCLUDED.status,
    setlist = EXCLUDED.setlist;

  -- Show 2 (Upcoming)
  INSERT INTO public.shows (pool_id, show_date, venue_name, city_state, set_time, status)
  VALUES (summer_pool_id, show_date_2, 'Hollywood Bowl', 'Los Angeles, CA', '7:30 PM PT', 'UPCOMING')
  ON CONFLICT (pool_id, show_date, venue_name) DO NOTHING;

  -- Show 3 (Upcoming)
  INSERT INTO public.shows (pool_id, show_date, venue_name, city_state, set_time, status)
  VALUES (summer_pool_id, show_date_3, 'Chase Center', 'San Francisco, CA', '8:00 PM PT', 'UPCOMING')
  ON CONFLICT (pool_id, show_date, venue_name) DO NOTHING;
  
  -- Show 4 (Upcoming, closer date)
  INSERT INTO public.shows (pool_id, show_date, venue_name, city_state, set_time, status)
  VALUES (summer_pool_id, show_date_4, 'Climate Pledge Arena', 'Seattle, WA', '7:00 PM PT', 'UPCOMING')
  ON CONFLICT (pool_id, show_date, venue_name) DO NOTHING;

  RAISE NOTICE 'Finished seeding shows for pool ID: %', summer_pool_id;
END $$;
