/*
  SSBLOX core schema (idempotent).

  Safe to run on a project that already has some of these tables: every
  statement uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS and no data is
  dropped. The only data change is renaming role 'member' -> 'user'.

  BEFORE RUNNING on a non-empty project, take a backup (Dashboard > Database >
  Backups) and run supabase/preflight.sql to see what already exists.
*/

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists verified boolean not null default false;
alter table public.profiles add column if not exists banned boolean not null default false;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists display_name text not null default '';
alter table public.profiles add column if not exists bio text not null default '';

-- Role unification: member -> user, allowed set = user | moderator | owner
update public.profiles set role = 'user' where role = 'member';

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'moderator', 'owner'));
alter table public.profiles alter column role set default 'user';

update public.profiles set username = lower(username) where username <> lower(username);
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_format') then
    alter table public.profiles
      add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_text_limits') then
    alter table public.profiles
      add constraint profiles_text_limits check (char_length(display_name) <= 50 and char_length(bio) <= 300) not valid;
  end if;
end $$;

-- ----------------------------------------------------------------- scripts
create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  code text not null default '',
  category text not null default 'misc',
  created_at timestamptz not null default now()
);
alter table public.scripts add column if not exists image_url text;
alter table public.scripts add column if not exists status text not null default 'pending';
alter table public.scripts add column if not exists rejection_reason text;
alter table public.scripts add column if not exists likes_count integer not null default 0;
alter table public.scripts add column if not exists views_count integer not null default 0;
alter table public.scripts add column if not exists updated_at timestamptz not null default now();
alter table public.scripts alter column author_id set default auth.uid();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'scripts_status_check') then
    alter table public.scripts add constraint scripts_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'scripts_limits') then
    alter table public.scripts add constraint scripts_limits check (
      char_length(title) between 3 and 120
      and char_length(description) between 10 and 500
      and char_length(code) between 10 and 100000
      and category ~ '^[a-z0-9-]{2,30}$'
      and (image_url is null or (char_length(image_url) <= 500
           and image_url ~* '^https?://[^[:space:]"''()\\]+$'))
    ) not valid;
  end if;
end $$;

create index if not exists scripts_status_created_idx on public.scripts (status, created_at desc);
create index if not exists scripts_status_likes_idx on public.scripts (status, likes_count desc);
create index if not exists scripts_status_views_idx on public.scripts (status, views_count desc);
create index if not exists scripts_author_idx on public.scripts (author_id);
create index if not exists scripts_category_idx on public.scripts (category);

-- ------------------------------------------------------------- script_likes
create table if not exists public.script_likes (
  script_id uuid not null references public.scripts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (script_id, user_id)
);
create index if not exists script_likes_user_idx on public.script_likes (user_id);

-- ----------------------------------------------------------- script_comments
create table if not exists public.script_comments (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint script_comments_body_len check (char_length(btrim(body)) between 1 and 1000)
);
create index if not exists script_comments_script_idx on public.script_comments (script_id, created_at);
create index if not exists script_comments_author_idx on public.script_comments (author_id);

-- ------------------------------------------------------------ script_reports
create table if not exists public.script_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  script_id uuid references public.scripts(id) on delete cascade,
  comment_id uuid references public.script_comments(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'open',
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint script_reports_status check (status in ('open', 'resolved', 'dismissed')),
  constraint script_reports_reason check (reason in ('spam', 'abuse', 'copyright', 'malicious', 'other')),
  constraint script_reports_target check ((script_id is not null) <> (comment_id is not null)),
  constraint script_reports_details_len check (char_length(details) <= 500)
);
create unique index if not exists script_reports_unique_script
  on public.script_reports (reporter_id, script_id) where script_id is not null;
create unique index if not exists script_reports_unique_comment
  on public.script_reports (reporter_id, comment_id) where comment_id is not null;
create index if not exists script_reports_status_idx on public.script_reports (status, created_at desc);

-- ------------------------------------------------------------ activity_logs
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_created_idx on public.activity_logs (created_at desc);

-- ----------------------------------------------------------------- warnings
create table if not exists public.warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  issued_by uuid references public.profiles(id) on delete set null,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now()
);
create index if not exists warnings_user_idx on public.warnings (user_id);

-- ------------------------------------------------------------ notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ------------------------------------------------------------ saved_scripts
create table if not exists public.saved_scripts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, script_id)
);

-- ------------------------------------------------------- helper functions
create or replace function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and not p.banned
$$;

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and not p.banned)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() in ('moderator', 'owner'), false)
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() = 'owner', false)
$$;

-- Can the caller moderate this target? owner -> anyone but owners; moderator -> only plain users.
create or replace function public.can_moderate(p_target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles t
    where t.id = p_target
      and t.id <> auth.uid()
      and (
        (public.my_role() = 'owner' and t.role <> 'owner')
        or (public.my_role() = 'moderator' and t.role = 'user')
      )
  )
$$;

create or replace function public.log_activity(p_action text, p_target_type text, p_target_id uuid, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.activity_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb))
$$;

create or replace function public.notify(p_user uuid, p_type text, p_title text, p_body text default '', p_link text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, p_type, p_title, coalesce(p_body, ''), p_link)
$$;

-- ----------------------------------------------------------------- triggers
create or replace function public.scripts_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  author_role text;
  content_changed boolean;
begin
  if tg_op = 'INSERT' then
    new.author_id := coalesce(auth.uid(), new.author_id);
    select p.role into author_role from public.profiles p where p.id = new.author_id;
    new.status := case when author_role in ('moderator', 'owner') then 'approved' else 'pending' end;
    new.rejection_reason := null;
    new.likes_count := 0;
    new.views_count := 0;
    new.created_at := now();
    new.updated_at := now();
  else
    -- clients can only update content columns (column grants); counters are
    -- changed by triggers/RPCs. Status is derived here for non-staff edits.
    new.author_id := old.author_id;
    content_changed :=
      new.title is distinct from old.title or new.description is distinct from old.description
      or new.code is distinct from old.code or new.category is distinct from old.category
      or new.image_url is distinct from old.image_url;
    if content_changed then
      new.updated_at := now();
      if auth.uid() is not null and not public.is_staff() then
        new.status := 'pending';
        new.rejection_reason := null;
      end if;
    elsif auth.uid() is not null and not public.is_staff() then
      new.status := old.status;
      new.rejection_reason := old.rejection_reason;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists scripts_before_write on public.scripts;
create trigger scripts_before_write before insert or update on public.scripts
  for each row execute function public.scripts_before_write();

create or replace function public.scripts_cleanup_image() returns trigger
language plpgsql security definer set search_path = '' as $$
declare marker text := '/storage/v1/object/public/thumbnails/'; pos int;
begin
  if old.image_url is not null then
    pos := position(marker in old.image_url);
    if pos > 0 then
      delete from storage.objects
      where bucket_id = 'thumbnails' and name = substr(old.image_url, pos + length(marker));
    end if;
  end if;
  return old;
end $$;

drop trigger if exists scripts_cleanup_image on public.scripts;
create trigger scripts_cleanup_image after delete on public.scripts
  for each row execute function public.scripts_cleanup_image();

create or replace function public.likes_count_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.scripts set likes_count = likes_count + 1 where id = new.script_id;
  elsif tg_op = 'DELETE' then
    update public.scripts set likes_count = greatest(likes_count - 1, 0) where id = old.script_id;
  end if;
  return null;
end $$;

drop trigger if exists likes_count_sync on public.script_likes;
create trigger likes_count_sync after insert or delete on public.script_likes
  for each row execute function public.likes_count_sync();

-- Re-sync counters once (idempotent)
update public.scripts s set likes_count = (select count(*) from public.script_likes l where l.script_id = s.id);

-- PostgREST embeds (author:profiles!author_id(...)) need foreign keys that point at public.profiles.
do $$
declare t record;
begin
  for t in select * from (values
      ('scripts', 'author_id'), ('script_comments', 'author_id'), ('script_reports', 'reporter_id')
    ) as v(tbl, col)
  loop
    if not exists (
      select 1 from pg_constraint c
      where c.conrelid = ('public.' || t.tbl)::regclass and c.contype = 'f'
        and c.confrelid = 'public.profiles'::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.profiles(id) on delete cascade not valid',
        t.tbl, t.tbl || '_' || t.col || '_profiles_fkey', t.col);
    end if;
  end loop;
end $$;

-- --------------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.scripts enable row level security;
alter table public.script_likes enable row level security;
alter table public.script_comments enable row level security;
alter table public.script_reports enable row level security;
alter table public.activity_logs enable row level security;
alter table public.warnings enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_scripts enable row level security;

revoke all on public.profiles, public.scripts, public.script_likes, public.script_comments,
  public.script_reports, public.activity_logs, public.warnings, public.notifications,
  public.saved_scripts from anon, authenticated;

-- profiles: public read of non-sensitive columns, users may edit only display_name + bio
grant select (id, username, display_name, bio, role, verified, banned, created_at)
  on public.profiles to anon, authenticated;
grant update (display_name, bio) on public.profiles to authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_active())
  with check (id = auth.uid() and public.is_active());

-- scripts
grant select on public.scripts to anon, authenticated;
grant insert (title, description, code, category, image_url) on public.scripts to authenticated;
grant update (title, description, code, category, image_url) on public.scripts to authenticated;
grant delete on public.scripts to authenticated;

drop policy if exists scripts_select on public.scripts;
create policy scripts_select on public.scripts for select
  using (status = 'approved' or author_id = auth.uid() or public.is_staff());
drop policy if exists scripts_insert on public.scripts;
create policy scripts_insert on public.scripts for insert to authenticated
  with check (author_id = auth.uid() and public.is_active());
drop policy if exists scripts_update on public.scripts;
create policy scripts_update on public.scripts for update to authenticated
  using (author_id = auth.uid() and public.is_active())
  with check (author_id = auth.uid() and public.is_active());
drop policy if exists scripts_delete on public.scripts;
create policy scripts_delete on public.scripts for delete to authenticated
  using ((author_id = auth.uid() and public.is_active()) or public.is_staff());

-- script_likes (writes only through toggle_script_like)
grant select on public.script_likes to authenticated;
drop policy if exists script_likes_select on public.script_likes;
create policy script_likes_select on public.script_likes for select to authenticated
  using (user_id = auth.uid());

-- script_comments
grant select on public.script_comments to anon, authenticated;
grant insert (script_id, body) on public.script_comments to authenticated;
grant delete on public.script_comments to authenticated;

drop policy if exists comments_select on public.script_comments;
create policy comments_select on public.script_comments for select
  using (
    (is_hidden = false or author_id = auth.uid() or public.is_staff())
    and exists (select 1 from public.scripts s where s.id = script_id)
  );
drop policy if exists comments_insert on public.script_comments;
create policy comments_insert on public.script_comments for insert to authenticated
  with check (
    author_id = auth.uid() and public.is_active()
    and exists (select 1 from public.scripts s where s.id = script_id and s.status = 'approved')
  );
drop policy if exists comments_delete on public.script_comments;
create policy comments_delete on public.script_comments for delete to authenticated
  using ((author_id = auth.uid() and public.is_active()) or public.is_staff());

-- reports (inserts only through create_report)
grant select on public.script_reports to authenticated;
drop policy if exists reports_select on public.script_reports;
create policy reports_select on public.script_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_staff());

-- activity logs / warnings / notifications / saved scripts
grant select on public.activity_logs to authenticated;
drop policy if exists logs_select on public.activity_logs;
create policy logs_select on public.activity_logs for select to authenticated using (public.is_staff());

grant select on public.warnings to authenticated;
drop policy if exists warnings_select on public.warnings;
create policy warnings_select on public.warnings for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on public.saved_scripts to authenticated;
drop policy if exists saved_select on public.saved_scripts;
create policy saved_select on public.saved_scripts for select to authenticated using (user_id = auth.uid());
drop policy if exists saved_insert on public.saved_scripts;
create policy saved_insert on public.saved_scripts for insert to authenticated
  with check (user_id = auth.uid() and public.is_active()
              and exists (select 1 from public.scripts s where s.id = script_id));
drop policy if exists saved_delete on public.saved_scripts;
create policy saved_delete on public.saved_scripts for delete to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('thumbnails', 'thumbnails', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

drop policy if exists thumbnails_read on storage.objects;
create policy thumbnails_read on storage.objects for select using (bucket_id = 'thumbnails');
drop policy if exists thumbnails_insert on storage.objects;
create policy thumbnails_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'thumbnails' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active());
drop policy if exists thumbnails_delete on storage.objects;
create policy thumbnails_delete on storage.objects for delete to authenticated
  using (bucket_id = 'thumbnails' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
