-- Seed a list of common Phish songs into the public.songs table
-- This script uses ON CONFLICT DO NOTHING to avoid errors if songs already exist.

INSERT INTO public.songs (title) VALUES
  ('Tweezer'), ('You Enjoy Myself'), ('Reba'), ('Harry Hood'), ('Down with Disease'),
  ('Chalk Dust Torture'), ('Ghost'), ('Bathtub Gin'), ('Run Like an Antelope'),
  ('Divided Sky'), ('Stash'), ('Mike''s Song'), ('Weekapaug Groove'), ('Simple'),
  ('Piper'), ('David Bowie'), ('Slave to the Traffic Light'), ('Possum'),
  ('Golgi Apparatus'), ('Wilson'), ('AC/DC Bag'), ('The Moma Dance'), ('First Tube'),
  ('Birds of a Feather'), ('Character Zero'), ('Wolfman''s Brother'), ('Carini'),
  ('Sand'), ('Twist'), ('Free'), ('Theme From the Bottom'), ('Roggae'), ('Meatstick'),
  ('Bug'), ('Heavy Things'), ('Back on the Train'), ('Gotta Jibboo'), ('Farmhouse'),
  ('NICU'), ('Runaway Jim'), ('Cavern'), ('Suzy Greenberg'), ('Maze'), ('Sparkle'),
  ('Julius'), ('Punch You in the Eye'), ('Sample in a Jar'), ('Fee'), ('It''s Ice'), ('Foam')
ON CONFLICT (title) DO NOTHING;
