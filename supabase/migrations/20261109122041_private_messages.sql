/*
# Private messages between users

1. New table
- `messages`: id, sender_id, recipient_id, body (1 to 2000 characters), created_at, read_at (null until the recipient opens the conversation). Sender and recipient must differ.

2. New functions
- `send_message(p_recipient, p_body)`: sends a message. Checks that the caller is signed in and not banned, that the recipient exists and is not banned, that the body length is valid, and that the sender has not sent more than 20 messages in the last minute.
- `list_conversations()`: returns the caller's conversations with the other person's name, the latest message preview, the time, and the unread count.

3. Security
- Row level security is enabled. Users can read only messages where they are the sender or recipient, and only while their account is active.
- Recipients can update only `read_at` on messages they received. The message body cannot be edited.
- There is no direct insert or delete access; messages can only be created through `send_message`.
- Anonymous access is removed from the table and both functions.

4. Notes
- Message contents are visible only to the two participants through the app. Platform owners with database access can still read them.
*/

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT messages_not_self CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS messages_sender_recipient_created_idx
  ON public.messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_recipient_unread_idx
  ON public.messages (recipient_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS messages_recipient_created_idx
  ON public.messages (recipient_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.messages FROM PUBLIC, anon;
GRANT SELECT ON public.messages TO authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;

DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages FOR SELECT
  TO authenticated
  USING (public.is_active() AND (sender_id = auth.uid() OR recipient_id = auth.uid()));

DROP POLICY IF EXISTS messages_update_read ON public.messages;
CREATE POLICY messages_update_read ON public.messages FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE OR REPLACE FUNCTION public.send_message(p_recipient uuid, p_body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
begin
  if not public.is_active() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  if p_recipient = auth.uid() then
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_recipient and not banned) then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
  if (select count(*) from public.messages
      where sender_id = auth.uid() and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited' using errcode = '53400';
  end if;

  insert into public.messages (sender_id, recipient_id, body)
  values (auth.uid(), p_recipient, v_body)
  returning id into v_id;
  return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.list_conversations()
RETURNS TABLE (
  other_id uuid,
  username text,
  display_name text,
  last_body text,
  last_at timestamptz,
  unread bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
begin
  if not public.is_active() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
  with mine as (
    select m.*,
      case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end as other
    from public.messages m
    where m.sender_id = auth.uid() or m.recipient_id = auth.uid()
  ),
  latest as (
    select distinct on (mine.other) mine.other, mine.body, mine.created_at
    from mine
    order by mine.other, mine.created_at desc
  ),
  unread_counts as (
    select m.sender_id as other, count(*) as n
    from public.messages m
    where m.recipient_id = auth.uid() and m.read_at is null
    group by m.sender_id
  )
  select l.other, p.username::text, p.display_name::text, l.body, l.created_at, coalesce(u.n, 0)::bigint
  from latest l
  join public.profiles p on p.id = l.other
  left join unread_counts u on u.other = l.other
  order by l.created_at desc;
end
$function$;

REVOKE EXECUTE ON FUNCTION public.send_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_message(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_conversations() TO authenticated;
