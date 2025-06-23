-- Master list of songs
CREATE TABLE IF NOT EXISTS public.songs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
title TEXT NOT NULL UNIQUE,
phish_net_song_id TEXT -- Optional
);

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Songs are viewable by everyone." ON public.songs;
CREATE POLICY "Songs are viewable by everyone."
ON public.songs FOR SELECT
USING ( TRUE );

DROP POLICY IF EXISTS "Admins can manage songs." ON public.songs;
CREATE POLICY "Admins can manage songs."
ON public.songs FOR ALL
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );
