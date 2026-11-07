-- X accounts and friends. Run once in the Supabase SQL editor.
-- `npm run schema` runs this file against an embedded Postgres and checks every rule below.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 24),
  -- Friends join by code, so nobody can be found by searching for them.
  friend_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_at timestamptz not null default now()
);

create table public.friends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table public.results (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day integer not null,
  game text not null check (game in ('trivia', 'estimation', 'cryptic', 'word', 'groups', 'sudoku', 'zip', 'globle')),
  score double precision not null,
  label text not null check (char_length(label) <= 40),
  created_at timestamptz not null default now(),
  primary key (user_id, day, game)
);
create index results_day on public.results (day);

alter table public.profiles enable row level security;
alter table public.friends enable row level security;
alter table public.results enable row level security;

create function public.is_friend(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.friends where user_id = auth.uid() and friend_id = other);
$$;

create policy "read yourself and friends" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_friend(id));
create policy "create your profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "rename yourself" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "read your friendships" on public.friends for select to authenticated using (user_id = auth.uid());

create policy "read yours and friends' results" on public.results for select to authenticated
  using (user_id = auth.uid() or public.is_friend(user_id));
-- Only today's edition counts, and there's no update policy, so a first result stands.
create policy "post today's result" on public.results for insert to authenticated
  with check (user_id = auth.uid() and day = floor(extract(epoch from now()) / 86400)::integer);

revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

-- Writes to `friends` go through these, because a friendship has to be created on both sides at once.
create function public.add_friend(code text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  them public.profiles;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into them from public.profiles where friend_code = upper(trim(code));
  if not found then raise exception 'unknown code'; end if;
  if them.id = me then raise exception 'own code'; end if;
  insert into public.friends (user_id, friend_id) values (me, them.id), (them.id, me) on conflict do nothing;
  return them.name;
end;
$$;

create function public.remove_friend(other uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.friends where (user_id = auth.uid() and friend_id = other) or (user_id = other and friend_id = auth.uid());
$$;

-- App stores require in-app account deletion. Profile, friendships and results all cascade.
create function public.delete_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.is_friend(uuid), public.add_friend(text), public.remove_friend(uuid), public.delete_account() from public, anon;
grant execute on function public.is_friend(uuid), public.add_friend(text), public.remove_friend(uuid), public.delete_account() to authenticated;
