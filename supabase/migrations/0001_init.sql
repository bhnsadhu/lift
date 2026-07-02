-- ============================================================
-- GymStreak — initial schema
-- Run this whole file in: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

-- ---------- Types ----------
create type public.friendship_status as enum ('pending', 'accepted', 'declined');

-- ---------- Tables ----------

-- One row per user, auto-created on signup (see trigger below)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  full_name text not null default '',
  bio text not null default '',
  avatar_url text,
  timezone text not null default 'America/Chicago',
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- Registered gyms; add more rows any time via the Table Editor
create table public.gyms (
  id bigint generated always as identity primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  radius_m integer not null default 150,
  verified boolean not null default true,
  created_at timestamptz not null default now()
);

-- 7 rows per user: which weekdays are gym days (0 = Sunday .. 6 = Saturday)
create table public.workout_schedules (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_gym_day boolean not null default false,
  routine text not null default '',
  primary key (user_id, day_of_week)
);

-- One row per gym visit. Timestamps are set by the server, never the client.
create table public.gym_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  gym_id bigint not null references public.gyms (id),
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  check_in_lat double precision not null,
  check_in_lng double precision not null,
  check_out_lat double precision,
  check_out_lng double precision,
  local_date date,                       -- user-local calendar day the visit counts toward
  qualifies boolean not null default false, -- >= 20 min inside a registered gym
  created_at timestamptz not null default now()
);
create index gym_sessions_user_open on public.gym_sessions (user_id) where check_out_at is null;
create index gym_sessions_user_date on public.gym_sessions (user_id, local_date) where qualifies;

create table public.streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_qualified_date date,
  streak_start_date date,
  updated_at timestamptz not null default now()
);

create table public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
-- One friendship row per pair, regardless of direction
create unique index friendships_unique_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- ---------- Signup trigger: create profile + streak + default schedule ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := lower(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''),
                          'user_' || substr(replace(new.id::text, '-', ''), 1, 10)));
  begin
    insert into public.profiles (id, username, full_name)
    values (new.id, uname, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  exception when unique_violation then
    insert into public.profiles (id, username, full_name)
    values (new.id, uname || '_' || substr(replace(new.id::text, '-', ''), 1, 4),
            coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  end;

  insert into public.streaks (user_id) values (new.id);

  -- Default routine: Mon-Fri gym days, weekends rest
  insert into public.workout_schedules (user_id, day_of_week, is_gym_day)
  select new.id, d, d between 1 and 5 from generate_series(0, 6) as d;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.gyms enable row level security;
alter table public.workout_schedules enable row level security;
alter table public.gym_sessions enable row level security;
alter table public.streaks enable row level security;
alter table public.friendships enable row level security;

-- Profiles: everyone signed in can view; only the owner can edit
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Gyms: read-only for users (add gyms via dashboard / service role)
create policy "gyms_select" on public.gyms
  for select to authenticated using (true);

-- Schedules: owner full control; others may read (needed to show routines on profiles)
create policy "schedules_select" on public.workout_schedules
  for select to authenticated using (true);
create policy "schedules_insert_own" on public.workout_schedules
  for insert to authenticated with check (auth.uid() = user_id);
create policy "schedules_update_own" on public.workout_schedules
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "schedules_delete_own" on public.workout_schedules
  for delete to authenticated using (auth.uid() = user_id);

-- Sessions: users can view their own; ALL writes go through the server
-- (service role bypasses RLS), so streaks can't be forged from the browser.
create policy "sessions_select_own" on public.gym_sessions
  for select to authenticated using (auth.uid() = user_id);

-- Streaks: visible to all signed-in users (friends feed); writes server-only
create policy "streaks_select" on public.streaks
  for select to authenticated using (true);

-- Friendships: accepted rows are public (friend lists/counts);
-- pending/declined rows visible only to the two people involved
create policy "friendships_select_accepted" on public.friendships
  for select to authenticated using (status = 'accepted');
create policy "friendships_select_involved" on public.friendships
  for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendships_insert_as_requester" on public.friendships
  for insert to authenticated
  with check (auth.uid() = requester_id and status = 'pending');
create policy "friendships_respond_as_addressee" on public.friendships
  for update to authenticated
  using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);
create policy "friendships_delete_involved" on public.friendships
  for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ---------- Storage: public avatars bucket ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Seed gyms (UIUC campus) ----------
insert into public.gyms (name, lat, lng, radius_m) values
  ('ARC — Activities and Recreation Center (UIUC)', 40.10126, -88.23605, 200),
  ('CRCE — Campus Recreation Center East (UIUC)', 40.10779, -88.22213, 150);
