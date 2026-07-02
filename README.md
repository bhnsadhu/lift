# GymStreak 🏋️🔥

A social platform for gym-goers and college students: verify your gym visits
with your location, build a streak against your own weekly routine, climb the
tiers, and keep your friends accountable.

**Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 · Supabase
(Postgres, Auth, Storage) · Vercel

## Features

- **Profiles** — name, photo, bio, home gym, streak, tier, friends
- **Friend requests** — Facebook-style ask / accept / decline (mutual friends)
- **Verified check-ins** — browser geolocation confirms you're within a
  registered gym's radius at check-in *and* check-out; 20+ minutes = streak +1
- **Streaks that respect rest days** — set your weekly routine; missing a
  scheduled gym day resets the streak, rest days never do, and going on a rest
  day still counts
- **Tiers** — 🐣 Weakling (1–99 days) → 💪 The Regular (100–364) →
  🔥 Seasoned Veteran (1–2 yrs) → 🐀 Gym Rat (2+ yrs)

## 1. Set up Supabase (the database + backend)

1. Create a free project at [supabase.com](https://supabase.com) (any name, any region).
2. In the dashboard, open **SQL Editor → New query**, paste the entire
   contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   and click **Run**. This creates every table, the signup trigger, all
   Row-Level-Security policies, the public `avatars` storage bucket, and seeds
   the UIUC gyms (ARC and CRCE).
3. Recommended for the MVP: **Authentication → Sign In / Up → Email → turn OFF
   "Confirm email"** so signups work instantly without an email step.
4. Grab your keys from **Project Settings → API**:
   - Project URL
   - `anon` public key
   - `service_role` secret key

You can now watch all data live in **Table Editor** — every profile, gym
session, streak, and friendship lands in these tables.

## 2. Run locally

```bash
cp .env.local.example .env.local   # then paste in your 3 Supabase values
npm install
npm run dev                        # http://localhost:3000
```

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. [vercel.com/new](https://vercel.com/new) → import the repo (Next.js is auto-detected).
3. Under **Environment Variables**, add the same three values from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy. Done — the site talks straight to your Supabase project.

> Geolocation requires HTTPS, which Vercel provides automatically
> (and `localhost` is exempt during development).

## Managing the platform

- **Add a gym:** Supabase → Table Editor → `gyms` → Insert row
  (name, lat, lng, radius in meters). It's live immediately.
- **Inspect any user's data:** `profiles`, `streaks`, `gym_sessions`,
  `friendships`, `workout_schedules` tables.
- **Fix/adjust a streak:** edit the user's row in `streaks`.

## How the streak engine works

- Users set a weekly routine (gym days vs. rest days) during onboarding.
- A visit **qualifies** when both the check-in and check-out locations are
  inside a registered gym's radius and at least 20 minutes apart
  (`QUALIFY_MINUTES` in `src/lib/streak.ts`). Sessions left open more than
  8 hours are treated as a forgotten check-out and don't count.
- Streaks settle lazily (no cron): whenever a streak is displayed or a
  check-out happens, the engine walks the days since the last qualifying
  visit — any *past* scheduled gym day without a qualifying session resets the
  streak to 0. Rest days are skipped. Today can't break the streak until it's
  over. Timestamps are always set server-side.
- All session/streak writes go through server-only API routes using the
  `service_role` key, so streaks can't be forged from the browser console.

## Testing the check-in flow without going to a gym

1. Chrome DevTools → ⋮ → More tools → **Sensors** → Location → Other…
   → enter `40.10126, -88.23605` (the UIUC ARC).
2. Check in on the dashboard, wait (or temporarily lower `QUALIFY_MINUTES`,
   or backdate `check_in_at` in the `gym_sessions` table), then check out.

## Path to the mobile app

The web MVP is built to be app-ready: check-in/check-out are plain JSON API
routes (`/api/checkin`, `/api/checkout`) a native app can call with tokens
from Supabase's mobile SDKs, and the `gym_sessions` model already stores
coordinates + timestamps, so continuous background location can later replace
manual check-ins without a schema change.
