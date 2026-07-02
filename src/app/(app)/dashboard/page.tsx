import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  dayOfWeek,
  localDateStr,
  recalculateStreak,
  recalculateStreaks,
} from "@/lib/streak";
import Avatar from "@/components/Avatar";
import CheckInButton from "@/components/CheckInButton";
import StreakCard from "@/components/StreakCard";
import TierBadge from "@/components/TierBadge";
import type {
  Friendship,
  GymSession,
  Profile,
  ScheduleDay,
  Streak,
} from "@/lib/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileData as Profile | null;
  if (!profile) redirect("/login");
  if (!profile.onboarded) redirect("/onboarding");

  const [streak, scheduleRes, openSessionRes, friendshipsRes] =
    await Promise.all([
      recalculateStreak(user.id),
      supabase.from("workout_schedules").select("*").eq("user_id", user.id),
      supabase
        .from("gym_sessions")
        .select("*, gyms(name)")
        .eq("user_id", user.id)
        .is("check_out_at", null)
        .maybeSingle(),
      supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    ]);

  const today = localDateStr(profile.timezone);
  const schedule = (scheduleRes.data ?? []) as ScheduleDay[];
  const todaySchedule = schedule.find(
    (s) => s.day_of_week === dayOfWeek(today)
  );
  const isGymDay = todaySchedule?.is_gym_day ?? false;
  const countedToday = streak?.last_qualified_date === today;

  const openRow = openSessionRes.data as
    | (GymSession & { gyms: { name: string } | null })
    | null;
  const openSession = openRow
    ? {
        gymName: openRow.gyms?.name ?? "the gym",
        checkInAt: openRow.check_in_at,
      }
    : null;

  const friendships = (friendshipsRes.data ?? []) as Friendship[];
  const friendIds = friendships.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  let feed: { profile: Profile; streak: Streak | null }[] = [];
  if (friendIds.length > 0) {
    const [{ data: friendProfiles }, friendStreaks] = await Promise.all([
      supabase.from("profiles").select("*").in("id", friendIds),
      recalculateStreaks(friendIds),
    ]);
    feed = ((friendProfiles ?? []) as Profile[])
      .map((p) => ({ profile: p, streak: friendStreaks.get(p.id) ?? null }))
      .sort(
        (a, b) =>
          (b.streak?.current_streak ?? 0) - (a.streak?.current_streak ?? 0)
      );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy-950">
          Hey, {profile.full_name.split(" ")[0] || profile.username} 👋
        </h1>
        <p className="text-sm text-navy-800/70">
          {countedToday
            ? "Today is in the books. Streak secured. ✅"
            : isGymDay
              ? `Today's a gym day${todaySchedule?.routine ? ` — ${todaySchedule.routine}` : ""}. Get after it.`
              : "Rest day — your streak is safe. Recover well. 😴"}
        </p>
      </div>

      {streak && <StreakCard streak={streak} />}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <CheckInButton openSession={openSession} />
        {!isGymDay && !openSession && (
          <p className="mt-3 text-xs text-navy-800/60">
            It&apos;s a rest day, but going anyway still adds to your streak.
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-navy-950">Friends&apos; streaks</h2>
          <Link
            href="/friends"
            className="text-sm font-bold text-navy-600 hover:underline"
          >
            Manage friends →
          </Link>
        </div>

        {feed.length === 0 ? (
          <p className="mt-4 text-sm text-navy-800/60">
            No friends yet.{" "}
            <Link href="/friends" className="font-bold text-navy-600 hover:underline">
              Find your gym buddies
            </Link>{" "}
            — streaks are more fun with witnesses.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-navy-50">
            {feed.map(({ profile: p, streak: s }, i) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span className="w-6 text-center text-sm font-black text-navy-800/40">
                  {i + 1}
                </span>
                <Avatar url={p.avatar_url} name={p.full_name || p.username} size={40} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${p.username}`}
                    className="block truncate font-bold text-navy-950 hover:underline"
                  >
                    {p.full_name || p.username}
                  </Link>
                  <TierBadge streakDays={s?.current_streak ?? 0} size="sm" />
                </div>
                <span className="text-lg font-black text-navy-900">
                  {(s?.current_streak ?? 0) > 0 && "🔥 "}
                  {s?.current_streak ?? 0}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
