/*
  SSBLOX RPC functions. All run as SECURITY DEFINER with an empty search_path
  and re-check the caller's role inside the function, so the browser can never
  escalate privileges by calling them directly.
*/

-- Registration helper: only the service role (edge function `register`) may call it.
create or replace function public.register_profile(p_user_id uuid, p_username text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_role text;
begin
  if p_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid_username' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('register_profile'));
  if exists (select 1 from public.profiles where lower(username) = lower(p_username)) then
    raise exception 'username_taken' using errcode = '23505';
  end if;
  -- First account on an empty platform becomes the owner.
  if exists (select 1 from public.profiles where role = 'owner') then
    v_role := 'user';
  else
    v_role := 'owner';
  end if;
  insert into public.profiles (id, username, role) values (p_user_id, p_username, v_role);
  return v_role;
end $$;

create or replace function public.is_username_available(p_username text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(btrim(p_username)))
$$;

create or replace function public.toggle_script_like(p_script_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_liked boolean; v_count integer;
begin
  if auth.uid() is null or not public.is_active() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.scripts where id = p_script_id and status = 'approved') then
    raise exception 'script_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.script_likes where script_id = p_script_id and user_id = auth.uid()) then
    delete from public.script_likes where script_id = p_script_id and user_id = auth.uid();
    v_liked := false;
  else
    insert into public.script_likes (script_id, user_id) values (p_script_id, auth.uid());
    v_liked := true;
  end if;
  select likes_count into v_count from public.scripts where id = p_script_id;
  return jsonb_build_object('liked', v_liked, 'likes_count', v_count);
end $$;

create or replace function public.record_script_view(p_script_id uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.scripts set views_count = views_count + 1
  where id = p_script_id and status = 'approved'
  returning views_count into v_count;
  return v_count;
end $$;

create or replace function public.create_report(p_script_id uuid, p_comment_id uuid, p_reason text, p_details text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_active() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if (p_script_id is null) = (p_comment_id is null) then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  if p_script_id is not null and not exists (
       select 1 from public.scripts where id = p_script_id and status = 'approved' and author_id <> auth.uid()) then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  if p_comment_id is not null and not exists (
       select 1 from public.script_comments where id = p_comment_id and author_id <> auth.uid()) then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  begin
    insert into public.script_reports (reporter_id, script_id, comment_id, reason, details)
    values (auth.uid(), p_script_id, p_comment_id, p_reason, left(coalesce(p_details, ''), 500));
  exception when unique_violation then
    raise exception 'already_reported' using errcode = '23505';
  end;
end $$;

create or replace function public.site_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'scripts', (select count(*) from public.scripts where status = 'approved'),
    'views', coalesce((select sum(views_count) from public.scripts where status = 'approved'), 0),
    'likes', coalesce((select sum(likes_count) from public.scripts where status = 'approved'), 0),
    'by_category', coalesce((
      select jsonb_object_agg(category, n)
      from (select category, count(*) n from public.scripts where status = 'approved' group by category) c
    ), '{}'::jsonb)
  )
$$;

create or replace function public.my_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'scripts', (select count(*) from public.scripts where author_id = auth.uid() and status = 'approved'),
    'likes', coalesce((select sum(likes_count) from public.scripts where author_id = auth.uid() and status = 'approved'), 0),
    'comments', (select count(*) from public.script_comments where author_id = auth.uid())
  )
$$;

-- ---------------------------------------------------------------- staff RPCs
create or replace function public.approve_script(p_script_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_author uuid; v_title text;
begin
  if not public.is_staff() then raise exception 'not_allowed' using errcode = '42501'; end if;
  update public.scripts set status = 'approved', rejection_reason = null
  where id = p_script_id returning author_id, title into v_author, v_title;
  if not found then raise exception 'script_not_found' using errcode = 'P0002'; end if;
  perform public.log_activity('script_approved', 'script', p_script_id, jsonb_build_object('title', v_title));
  perform public.notify(v_author, 'script_approved', 'اسکریپت شما تأیید شد', v_title, '/scripts/' || p_script_id);
end $$;

create or replace function public.reject_script(p_script_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_author uuid; v_title text; v_reason text := left(btrim(coalesce(p_reason, '')), 500);
begin
  if not public.is_staff() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if char_length(v_reason) < 3 then raise exception 'reason_required' using errcode = '22023'; end if;
  update public.scripts set status = 'rejected', rejection_reason = v_reason
  where id = p_script_id returning author_id, title into v_author, v_title;
  if not found then raise exception 'script_not_found' using errcode = 'P0002'; end if;
  perform public.log_activity('script_rejected', 'script', p_script_id, jsonb_build_object('title', v_title, 'reason', v_reason));
  perform public.notify(v_author, 'script_rejected', 'اسکریپت شما رد شد', v_reason, '/my-scripts');
end $$;

create or replace function public.admin_delete_script(p_script_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_title text;
begin
  if not public.is_staff() then raise exception 'not_allowed' using errcode = '42501'; end if;
  delete from public.scripts where id = p_script_id returning title into v_title;
  if not found then raise exception 'script_not_found' using errcode = 'P0002'; end if;
  perform public.log_activity('script_deleted', 'script', p_script_id, jsonb_build_object('title', v_title));
end $$;

create or replace function public.moderate_comment(p_comment_id uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'not_allowed' using errcode = '42501'; end if;
  update public.script_comments set is_hidden = p_hidden where id = p_comment_id;
  if not found then raise exception 'comment_not_found' using errcode = 'P0002'; end if;
  perform public.log_activity(case when p_hidden then 'comment_hidden' else 'comment_shown' end, 'comment', p_comment_id, '{}'::jsonb);
end $$;

create or replace function public.resolve_report(p_report_id uuid, p_decision text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
  if not public.is_staff() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_decision not in ('dismiss', 'action') then raise exception 'invalid_decision' using errcode = '22023'; end if;
  v_status := case when p_decision = 'dismiss' then 'dismissed' else 'resolved' end;
  update public.script_reports set status = v_status, resolved_by = auth.uid()
  where id = p_report_id and status = 'open';
  if not found then raise exception 'report_not_found' using errcode = 'P0002'; end if;
  perform public.log_activity(case when v_status = 'dismissed' then 'report_dismissed' else 'report_resolved' end, 'report', p_report_id, '{}'::jsonb);
end $$;

create or replace function public.admin_list_users()
returns table (id uuid, email text, username text, role text, verified boolean, banned boolean,
               ban_reason text, created_at timestamptz, scripts_count bigint, warnings_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'not_allowed' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.username, p.role, p.verified, p.banned, p.ban_reason, p.created_at,
           (select count(*) from public.scripts s where s.author_id = p.id),
           (select count(*) from public.warnings w where w.user_id = p.id)
    from public.profiles p join auth.users u on u.id = p.id
    order by p.created_at desc
    limit 500;
end $$;

create or replace function public.warn_user(p_user_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not public.is_staff() or not public.can_moderate(p_user_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(v_reason) not between 3 and 500 then raise exception 'reason_required' using errcode = '22023'; end if;
  insert into public.warnings (user_id, issued_by, reason) values (p_user_id, auth.uid(), v_reason);
  perform public.log_activity('user_warned', 'user', p_user_id, jsonb_build_object('reason', v_reason));
  perform public.notify(p_user_id, 'warning', 'اخطار از طرف مدیریت', v_reason, null);
end $$;

create or replace function public.set_user_banned(p_user_id uuid, p_banned boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_reason text := left(btrim(coalesce(p_reason, '')), 500);
begin
  if not public.is_staff() or not public.can_moderate(p_user_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.profiles set banned = p_banned, ban_reason = case when p_banned then nullif(v_reason, '') else null end
  where id = p_user_id;
  if p_banned then
    delete from auth.sessions where user_id = p_user_id;  -- force logout everywhere
  end if;
  perform public.log_activity(case when p_banned then 'user_banned' else 'user_unbanned' end, 'user', p_user_id,
                              jsonb_build_object('reason', v_reason));
end $$;

-- ---------------------------------------------------------------- owner RPCs
create or replace function public.set_user_verified(p_user_id uuid, p_verified boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'not_allowed' using errcode = '42501'; end if;
  update public.profiles set verified = p_verified where id = p_user_id;
  if not found then raise exception 'user_not_found' using errcode = 'P0002'; end if;
  perform public.log_activity(case when p_verified then 'user_verified' else 'user_unverified' end, 'user', p_user_id, '{}'::jsonb);
end $$;

create or replace function public.set_user_role(p_user_id uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_role not in ('user', 'moderator', 'owner') then raise exception 'invalid_role' using errcode = '22023'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot_change_self' using errcode = '42501'; end if;
  update public.profiles set role = p_role where id = p_user_id;
  if not found then raise exception 'user_not_found' using errcode = 'P0002'; end if;
  perform public.log_activity('user_role_changed', 'user', p_user_id, jsonb_build_object('role', p_role));
end $$;

-- ------------------------------------------------------------------ grants
do $$
declare f text;
begin
  foreach f in array array[
    'register_profile(uuid,text)', 'is_username_available(text)', 'toggle_script_like(uuid)',
    'record_script_view(uuid)', 'create_report(uuid,uuid,text,text)', 'site_stats()', 'my_stats()',
    'approve_script(uuid)', 'reject_script(uuid,text)', 'admin_delete_script(uuid)',
    'moderate_comment(uuid,boolean)', 'resolve_report(uuid,text)', 'admin_list_users()',
    'warn_user(uuid,text)', 'set_user_banned(uuid,boolean,text)', 'set_user_verified(uuid,boolean)',
    'set_user_role(uuid,text)', 'my_role()', 'is_active()', 'is_staff()', 'is_owner()',
    'can_moderate(uuid)', 'log_activity(text,text,uuid,jsonb)', 'notify(uuid,text,text,text,text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;

  -- callable from the browser (authenticated; each function re-checks the role)
  foreach f in array array[
    'toggle_script_like(uuid)', 'create_report(uuid,uuid,text,text)', 'my_stats()',
    'approve_script(uuid)', 'reject_script(uuid,text)', 'admin_delete_script(uuid)',
    'moderate_comment(uuid,boolean)', 'resolve_report(uuid,text)', 'admin_list_users()',
    'warn_user(uuid,text)', 'set_user_banned(uuid,boolean,text)', 'set_user_verified(uuid,boolean)',
    'set_user_role(uuid,text)'
  ] loop
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;

  -- public
  foreach f in array array['is_username_available(text)', 'record_script_view(uuid)', 'site_stats()'] loop
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;

  -- RLS helpers are evaluated as the calling role inside policies
  foreach f in array array['my_role()', 'is_active()', 'is_staff()', 'is_owner()'] loop
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

grant execute on function public.register_profile(uuid, text) to service_role;
