/*
# Leaderboard: top script authors

1. New functions
- `leaderboard_top_authors(p_limit int)` returns the top approved script authors ranked by total likes received, then total views, then number of approved scripts.

2. Security
- The function is SECURITY INVOKER, so it reads through the existing row rules: only approved scripts and public profile columns are visible.
- Only banned-free profiles are included.
- EXECUTE is granted to anon and authenticated; PUBLIC is revoked so no other role can call it.

3. Notes
- The limit is clamped between 1 and 50 to keep responses small.
*/

create or replace function public.leaderboard_top_authors(p_limit int default 20)
returns table (
  rank bigint,
  username text,
  display_name text,
  role text,
  verified boolean,
  scripts_count bigint,
  likes_count bigint,
  views_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with totals as (
    select
      p.id,
      p.username,
      p.display_name,
      p.role,
      p.verified,
      count(s.id) as scripts_count,
      coalesce(sum(s.likes_count), 0) as likes_count,
      coalesce(sum(s.views_count), 0) as views_count
    from public.profiles p
    join public.scripts s on s.author_id = p.id and s.status = 'approved'
    where not p.banned
    group by p.id, p.username, p.display_name, p.role, p.verified
  )
  select
    row_number() over (order by t.likes_count desc, t.views_count desc, t.scripts_count desc, t.username asc) as rank,
    t.username,
    t.display_name,
    t.role,
    t.verified,
    t.scripts_count,
    t.likes_count,
    t.views_count
  from totals t
  order by rank
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

revoke execute on function public.leaderboard_top_authors(int) from public, anon;
grant execute on function public.leaderboard_top_authors(int) to anon, authenticated;
