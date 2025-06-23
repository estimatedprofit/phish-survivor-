-- Adds times_played column to songs table
ALTER TABLE IF EXISTS public.songs
  ADD COLUMN IF NOT EXISTS times_played INTEGER; 