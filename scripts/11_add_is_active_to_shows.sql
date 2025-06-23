-- Add is_active flag to indicate whether a show is part of the pool game
ALTER TABLE public.shows
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE; 