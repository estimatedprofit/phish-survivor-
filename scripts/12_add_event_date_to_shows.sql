-- Add event_date to shows table to store actual Phish.net concert date
ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS event_date DATE;

-- Back-fill existing rows so event_date starts equal to current show_date
UPDATE shows SET event_date = show_date WHERE event_date IS NULL; 