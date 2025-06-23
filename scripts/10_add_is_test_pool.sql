-- Add is_test_pool flag to differentiate real pools from manual test pools
ALTER TABLE public.pools
ADD COLUMN IF NOT EXISTS is_test_pool BOOLEAN NOT NULL DEFAULT FALSE; 