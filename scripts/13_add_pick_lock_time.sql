-- Add column for fixed pick lock time of day (HH:MM)
ALTER TABLE IF EXISTS public.pools
  ADD COLUMN IF NOT EXISTS pick_lock_time TIME; 

-- generate UPDATE stubs for all PICKS_LOCKED rows
select
  'update shows set status=''PICKS_LOCKED'', setlist=null where id='''||id||'''; '||
  'update picks set result=''PENDING'' where show_id='''||id||'''; '||
  'update pool_participants set status=''ALIVE'', current_streak=0 where pool_id='''||pool_id||''';'
as sql_cmd
from shows
where venue_name = 'Petersen Events Center'
  and show_date  = '2025-06-24'
  and status     = 'PICKS_LOCKED'; 