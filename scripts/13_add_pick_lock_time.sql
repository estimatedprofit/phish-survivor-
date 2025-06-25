-- Add column for fixed pick lock time of day (HH:MM)
ALTER TABLE IF EXISTS public.pools
  ADD COLUMN IF NOT EXISTS pick_lock_time TIME; 