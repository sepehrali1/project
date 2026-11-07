-- Run this in the Supabase SQL editor BEFORE applying the migrations, and keep
-- the output. It only reads.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

select role, count(*) from public.profiles group by role;   -- may fail if profiles does not exist yet
select count(*) as auth_users from auth.users;
