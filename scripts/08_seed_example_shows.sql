-- Seed some example shows for a pool
-- IMPORTANT: You MUST replace 'YOUR_ACTUAL_POOL_ID_HERE' with a valid pool_id from your public.pools table.
-- Create a pool through your application's admin interface first if you haven't already.

DO $$
DECLARE
  example_pool_id UUID; -- Will be set to your actual pool ID
  show_date_1 DATE;
  show_date_2 DATE;
  show_date_3 DATE;
  show_date_4 DATE;
BEGIN
  -- !!! IMPORTANT: SET YOUR POOL ID HERE !!!
  -- Find a valid pool_id from your 'public.pools' table after creating a pool.
  -- For example: example_pool_id := 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
  example_pool_id := 'ee60fddd-d532-405b-944b-2d12e030372c'; -- REPLACE THIS WITH YOUR ACTUAL POOL ID

  -- Check if the pool_id was set
  IF example_pool_id IS NULL THEN
    RAISE EXCEPTION 'The example_pool_id variable is not set. Please edit this script and provide a valid pool_id.';
  END IF;

  -- Check if the pool exists
  IF NOT EXISTS (SELECT 1 FROM public.pools WHERE id = example_pool_id) THEN
    RAISE NOTICE 'Pool with ID % not found. Shows will not be added. Please ensure the pool_id is correct and the pool exists.', example_pool_id;
    RETURN;
  END IF;

  RAISE NOTICE 'Attempting to seed shows for pool ID: %', example_pool_id;

  -- Set show dates relative to today for dynamic testing
  show_date_1 := current_date - INTERVAL '2 days'; -- Past show
  show_date_2 := current_date + INTERVAL '3 days'; -- Upcoming show
  show_date_3 := current_date + INTERVAL '7 days'; -- Further upcoming show
  show_date_4 := current_date + INTERVAL '1 day';  -- Upcoming show, closer

  -- Show 1 (Past)
  INSERT INTO public.shows (pool_id, show_date, venue_name, city_state, set_time, status, setlist)
  VALUES (example_pool_id, show_date_1, 'The Sphere', 'Las Vegas, NV', '8:00 PM PT', 'PLAYED', '["Tweezer", "Reba", "Ghost"]') -- Example setlist with song titles
  ON CONFLICT (pool_id, show_date, venue_name) DO UPDATE SET
    status = EXCLUDED.status,
    setlist = EXCLUDED.setlist;

  -- Show 2 (Upcoming)
  INSERT INTO public.shows (pool_id, show_date, venue_name, city_state, set_time, status)
  VALUES (example_pool_id, show_date_2, 'Hollywood Bowl', 'Los Angeles, CA', '7:30 PM PT', 'UPCOMING')
  ON CONFLICT (pool_id, show_date, venue_name) DO NOTHING;

  -- Show 3 (Upcoming)
  INSERT INTO public.shows (pool_id, show_date, venue_name, city_state, set_time, status)
  VALUES (example_pool_id, show_date_3, 'Chase Center', 'San Francisco, CA', '8:00 PM PT', 'UPCOMING')
  ON CONFLICT (pool_id, show_date, venue_name) DO NOTHING;
  
  -- Show 4 (Upcoming, closer date)
  INSERT INTO public.shows (pool_id, show_date, venue_name, city_state, set_time, status)
  VALUES (example_pool_id, show_date_4, 'Climate Pledge Arena', 'Seattle, WA', '7:00 PM PT', 'UPCOMING')
  ON CONFLICT (pool_id, show_date, venue_name) DO NOTHING;

  RAISE NOTICE 'Finished seeding/updating shows for pool ID: %', example_pool_id;
END $$;
