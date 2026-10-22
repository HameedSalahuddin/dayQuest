-- dayQuest social foundation. Apply this migration to the existing Supabase project.
-- Invitation secrets are returned only by create_my_friend_invitation(); only SHA-256
-- hashes are stored. Friendship transitions are available only through RPC functions.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_id text not null default 'sprout' check (avatar_id in ('sprout', 'ember', 'tide', 'moss')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.presence_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  share_status boolean not null default true,
  invisible_mode boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'free' check (status in ('free', 'in_class', 'studying', 'hanging_out', 'busy')),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_online_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_online boolean not null default false,
  last_seen_at timestamptz not null default now()
);

create table if not exists public.friend_invitations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists friend_requests_one_pending_pair_idx
  on public.friend_requests (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
  where status = 'pending';
create index if not exists friend_requests_addressee_status_idx
  on public.friend_requests (addressee_id, status, created_at desc);
create index if not exists friend_requests_requester_status_idx
  on public.friend_requests (requester_id, status, created_at desc);

create table if not exists public.friendships (
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high)
);

create or replace function private.are_accepted_friends(p_owner uuid, p_viewer uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select p_owner <> p_viewer and exists (
    select 1 from public.friendships f
    where f.user_low = least(p_owner, p_viewer) and f.user_high = greatest(p_owner, p_viewer)
  );
$$;

create or replace function private.can_view_friend_status(p_owner uuid, p_viewer uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select private.are_accepted_friends(p_owner, p_viewer)
    and exists (select 1 from public.presence_preferences p where p.user_id = p_owner and p.share_status);
$$;

create or replace function private.can_view_friend_online(p_owner uuid, p_viewer uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select private.are_accepted_friends(p_owner, p_viewer)
    and exists (select 1 from public.presence_preferences p where p.user_id = p_owner and p.share_status and not p.invisible_mode);
$$;

revoke all on function private.are_accepted_friends(uuid, uuid) from public, anon;
revoke all on function private.can_view_friend_status(uuid, uuid) from public, anon;
revoke all on function private.can_view_friend_online(uuid, uuid) from public, anon;
grant execute on function private.are_accepted_friends(uuid, uuid) to authenticated;
grant execute on function private.can_view_friend_status(uuid, uuid) to authenticated;
grant execute on function private.can_view_friend_online(uuid, uuid) to authenticated;

create or replace function public.handle_new_dayquest_user()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  candidate_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', 'Hero'));
  candidate_avatar text := coalesce(new.raw_user_meta_data ->> 'avatar_id', 'sprout');
begin
  if candidate_name = '' then candidate_name := 'Hero'; end if;
  if char_length(candidate_name) > 40 then candidate_name := left(candidate_name, 40); end if;
  if candidate_avatar not in ('sprout', 'ember', 'tide', 'moss') then candidate_avatar := 'sprout'; end if;
  insert into public.profiles (user_id, display_name, avatar_id)
    values (new.id, candidate_name, candidate_avatar) on conflict (user_id) do nothing;
  insert into public.presence_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.friend_status (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_dayquest on auth.users;
create trigger on_auth_user_created_dayquest after insert on auth.users
for each row execute function public.handle_new_dayquest_user();

insert into public.profiles (user_id, display_name, avatar_id)
select u.id,
  left(coalesce(nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''), 'Hero'), 40),
  case when u.raw_user_meta_data ->> 'avatar_id' in ('sprout', 'ember', 'tide', 'moss') then u.raw_user_meta_data ->> 'avatar_id' else 'sprout' end
from auth.users u on conflict (user_id) do nothing;
insert into public.presence_preferences (user_id) select id from auth.users on conflict (user_id) do nothing;
insert into public.friend_status (user_id) select id from auth.users on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.presence_preferences enable row level security;
alter table public.friend_status enable row level security;
alter table public.friend_online_presence enable row level security;
alter table public.friend_invitations enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

drop policy if exists profiles_select_self_or_friend on public.profiles;
create policy profiles_select_self_or_friend on public.profiles for select to authenticated
using (user_id = (select auth.uid()) or private.are_accepted_friends(user_id, (select auth.uid())));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists presence_preferences_select_self on public.presence_preferences;
create policy presence_preferences_select_self on public.presence_preferences for select to authenticated
using (user_id = (select auth.uid()));
drop policy if exists presence_preferences_update_self on public.presence_preferences;
create policy presence_preferences_update_self on public.presence_preferences for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists friend_status_select_allowed on public.friend_status;
create policy friend_status_select_allowed on public.friend_status for select to authenticated
using (user_id = (select auth.uid()) or private.can_view_friend_status(user_id, (select auth.uid())));
drop policy if exists friend_status_write_self on public.friend_status;
create policy friend_status_write_self on public.friend_status for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists friend_online_select_allowed on public.friend_online_presence;
create policy friend_online_select_allowed on public.friend_online_presence for select to authenticated
using (user_id = (select auth.uid()) or private.can_view_friend_online(user_id, (select auth.uid())));
drop policy if exists friend_online_write_self on public.friend_online_presence;
create policy friend_online_write_self on public.friend_online_presence for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists invitations_owner_only on public.friend_invitations;
create policy invitations_owner_only on public.friend_invitations for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists requests_participants_read on public.friend_requests;
create policy requests_participants_read on public.friend_requests for select to authenticated
using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));
drop policy if exists friendships_participants_read on public.friendships;
create policy friendships_participants_read on public.friendships for select to authenticated
using ((select auth.uid()) in (user_low, user_high));

revoke all on public.profiles, public.presence_preferences, public.friend_status, public.friend_online_presence,
  public.friend_invitations, public.friend_requests, public.friendships from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.presence_preferences to authenticated;
grant select on public.friend_status, public.friend_online_presence to authenticated;
grant select on public.friend_requests, public.friendships to authenticated;

create or replace function public.create_my_friend_invitation()
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  me uuid := auth.uid();
  secret text := encode(extensions.gen_random_bytes(32), 'hex');
  expiry timestamptz := now() + interval '30 days';
begin
  if me is null then raise exception 'not_authenticated'; end if;
  insert into public.friend_invitations (user_id, token_hash, expires_at, revoked_at, created_at)
    values (me, encode(extensions.digest(secret, 'sha256'), 'hex'), expiry, null, now())
    on conflict (user_id) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at,
      revoked_at = null, created_at = now();
  return jsonb_build_object('token', secret, 'expires_at', expiry);
end;
$$;

create or replace function public.revoke_my_friend_invitation()
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$ begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.friend_invitations set revoked_at = now() where user_id = auth.uid();
end; $$;

create or replace function public.preview_friend_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, extensions
as $$
declare target uuid; result jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'invalid_invitation'; end if;
  select i.user_id into target from public.friend_invitations i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and i.revoked_at is null and i.expires_at > now();
  if target is null then raise exception 'invitation_expired_or_revoked'; end if;
  if target = auth.uid() then raise exception 'self_invitation'; end if;
  select jsonb_build_object(
    'display_name', p.display_name,
    'avatar_id', p.avatar_id,
    'relationship', case
      when exists (select 1 from public.friendships f where f.user_low = least(target, auth.uid()) and f.user_high = greatest(target, auth.uid())) then 'friends'
      when exists (select 1 from public.friend_requests r where r.status = 'pending' and ((r.requester_id = auth.uid() and r.addressee_id = target) or (r.requester_id = target and r.addressee_id = auth.uid()))) then 'request_pending'
      else 'available' end
  ) into result from public.profiles p where p.user_id = target;
  if result is null then raise exception 'profile_not_found'; end if;
  return result;
end; $$;

create or replace function public.send_friend_request_with_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, extensions
as $$
declare target uuid; request_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'invalid_invitation'; end if;
  select i.user_id into target from public.friend_invitations i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and i.revoked_at is null and i.expires_at > now();
  if target is null then raise exception 'invitation_expired_or_revoked'; end if;
  if target = auth.uid() then raise exception 'self_invitation'; end if;
  if exists (select 1 from public.friendships f where f.user_low = least(target, auth.uid()) and f.user_high = greatest(target, auth.uid())) then raise exception 'already_friends'; end if;
  if exists (select 1 from public.friend_requests r where r.status = 'pending' and r.requester_id = target and r.addressee_id = auth.uid()) then raise exception 'incoming_request_exists'; end if;
  begin
    insert into public.friend_requests (requester_id, addressee_id) values (auth.uid(), target) returning id into request_id;
  exception when unique_violation then raise exception 'request_already_pending';
  end;
  return request_id;
end; $$;

create or replace function public.respond_to_friend_request(p_request_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare req public.friend_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into req from public.friend_requests where id = p_request_id for update;
  if not found or req.addressee_id <> auth.uid() or req.status <> 'pending' then raise exception 'request_not_available'; end if;
  if p_accept then
    insert into public.friendships (user_low, user_high)
      values (least(req.requester_id, req.addressee_id), greatest(req.requester_id, req.addressee_id)) on conflict do nothing;
    update public.friend_requests set status = 'accepted', updated_at = now() where id = req.id;
  else
    update public.friend_requests set status = 'declined', updated_at = now() where id = req.id;
  end if;
end; $$;

create or replace function public.remove_friend(p_friend_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$ begin
  if auth.uid() is null or p_friend_id = auth.uid() then raise exception 'invalid_friend'; end if;
  delete from public.friendships where user_low = least(auth.uid(), p_friend_id) and user_high = greatest(auth.uid(), p_friend_id);
end; $$;

create or replace function public.list_my_friend_requests()
returns table(request_id uuid, requester_id uuid, addressee_id uuid, status text, created_at timestamptz, display_name text, avatar_id text)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select r.id, r.requester_id, r.addressee_id, r.status, r.created_at, p.display_name, p.avatar_id
  from public.friend_requests r join public.profiles p on p.user_id = case when r.requester_id = auth.uid() then r.addressee_id else r.requester_id end
  where auth.uid() in (r.requester_id, r.addressee_id)
    and r.status = 'pending'
  order by r.created_at desc;
$$;

create or replace function public.list_my_friends()
returns table(friend_id uuid, display_name text, avatar_id text, status text, status_updated_at timestamptz, is_online boolean, last_seen_at timestamptz)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select p.user_id, p.display_name, p.avatar_id,
    case when pref.share_status then s.status else null end,
    case when pref.share_status then s.updated_at else null end,
    case when pref.share_status and not pref.invisible_mode then coalesce(o.is_online and o.last_seen_at > now() - interval '2 minutes', false) else false end,
    case when pref.share_status and not pref.invisible_mode then o.last_seen_at else null end
  from public.friendships f
  join public.profiles p on p.user_id = case when f.user_low = auth.uid() then f.user_high else f.user_low end
  left join public.presence_preferences pref on pref.user_id = p.user_id
  left join public.friend_status s on s.user_id = p.user_id
  left join public.friend_online_presence o on o.user_id = p.user_id
  where auth.uid() in (f.user_low, f.user_high)
  order by p.display_name;
$$;

create or replace function public.get_my_social_settings()
returns jsonb language sql stable security definer set search_path = pg_catalog, public
as $$
  select jsonb_build_object('status', coalesce(s.status, 'free'), 'status_updated_at', s.updated_at,
    'share_status', coalesce(pref.share_status, true), 'invisible_mode', coalesce(pref.invisible_mode, false))
  from public.presence_preferences pref left join public.friend_status s on s.user_id = pref.user_id
  where pref.user_id = auth.uid();
$$;

create or replace function public.update_my_social_settings(p_status text, p_share_status boolean, p_invisible_mode boolean)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_status not in ('free', 'in_class', 'studying', 'hanging_out', 'busy') then raise exception 'invalid_status'; end if;
  insert into public.presence_preferences (user_id, share_status, invisible_mode, updated_at)
    values (auth.uid(), p_share_status, p_invisible_mode, now())
    on conflict (user_id) do update set share_status = excluded.share_status, invisible_mode = excluded.invisible_mode, updated_at = now();
  insert into public.friend_status (user_id, status, updated_at) values (auth.uid(), p_status, now())
    on conflict (user_id) do update set status = excluded.status, updated_at = now();
  if p_invisible_mode then delete from public.friend_online_presence where user_id = auth.uid(); end if;
  return public.get_my_social_settings();
end; $$;

create or replace function public.set_my_online_state(p_is_online boolean)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare prefs public.presence_preferences%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into prefs from public.presence_preferences where user_id = auth.uid();
  if not found or prefs.invisible_mode or not prefs.share_status or not p_is_online then
    if p_is_online and (not found or prefs.invisible_mode or not prefs.share_status) then
      delete from public.friend_online_presence where user_id = auth.uid();
    else
      insert into public.friend_online_presence (user_id, is_online, last_seen_at) values (auth.uid(), false, now())
        on conflict (user_id) do update set is_online = false, last_seen_at = now();
    end if;
    return;
  end if;
  insert into public.friend_online_presence (user_id, is_online, last_seen_at) values (auth.uid(), true, now())
    on conflict (user_id) do update set is_online = true, last_seen_at = now();
end; $$;

-- RPC-only relationship transitions; clients cannot forge requests or friendships.
revoke all on function public.create_my_friend_invitation() from public, anon;
revoke all on function public.revoke_my_friend_invitation() from public, anon;
revoke all on function public.preview_friend_invitation(text) from public, anon;
revoke all on function public.send_friend_request_with_invitation(text) from public, anon;
revoke all on function public.respond_to_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.list_my_friend_requests() from public, anon;
revoke all on function public.list_my_friends() from public, anon;
revoke all on function public.get_my_social_settings() from public, anon;
revoke all on function public.update_my_social_settings(text, boolean, boolean) from public, anon;
revoke all on function public.set_my_online_state(boolean) from public, anon;
grant execute on function public.create_my_friend_invitation() to authenticated;
grant execute on function public.revoke_my_friend_invitation() to authenticated;
grant execute on function public.preview_friend_invitation(text) to authenticated;
grant execute on function public.send_friend_request_with_invitation(text) to authenticated;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.list_my_friend_requests() to authenticated;
grant execute on function public.list_my_friends() to authenticated;
grant execute on function public.get_my_social_settings() to authenticated;
grant execute on function public.update_my_social_settings(text, boolean, boolean) to authenticated;
grant execute on function public.set_my_online_state(boolean) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friend_status') then
    alter publication supabase_realtime add table public.friend_status;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friend_online_presence') then
    alter publication supabase_realtime add table public.friend_online_presence;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friend_requests') then
    alter publication supabase_realtime add table public.friend_requests;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships') then
    alter publication supabase_realtime add table public.friendships;
  end if;
end; $$;
