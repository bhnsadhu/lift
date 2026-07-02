import { createAdminClient } from "@/lib/supabase/admin";
import type { ScheduleDay, Streak } from "@/lib/types";

// Minutes a user must stay at a registered gym for the visit to count.
export const QUALIFY_MINUTES = 20;

// "YYYY-MM-DD" for the current moment in the user's timezone.
export function localDateStr(timezone: string, at: Date = new Date()): string {
  try {
    return at.toLocaleDateString("en-CA", { timeZone: timezone });
  } catch {
    return at.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  }
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

/**
 * Lazily settles streaks for a set of users (no cron needed):
 * walks the days since each user's last qualified visit and resets the
 * streak to 0 if any scheduled gym day passed without a qualifying session.
 * Rest days never break a streak; today can't break it until it's over.
 *
 * Returns the up-to-date streak row per user id.
 */
export async function recalculateStreaks(
  userIds: string[]
): Promise<Map<string, Streak>> {
  const result = new Map<string, Streak>();
  if (userIds.length === 0) return result;

  const admin = createAdminClient();
  const [{ data: streaks }, { data: schedules }, { data: profiles }] =
    await Promise.all([
      admin.from("streaks").select("*").in("user_id", userIds),
      admin.from("workout_schedules").select("*").in("user_id", userIds),
      admin.from("profiles").select("id, timezone").in("id", userIds),
    ]);

  const scheduleByUser = new Map<string, Set<number>>();
  for (const s of (schedules ?? []) as ScheduleDay[]) {
    if (!s.is_gym_day) continue;
    if (!scheduleByUser.has(s.user_id)) scheduleByUser.set(s.user_id, new Set());
    scheduleByUser.get(s.user_id)!.add(s.day_of_week);
  }
  const tzByUser = new Map<string, string>(
    ((profiles ?? []) as { id: string; timezone: string }[]).map((p) => [
      p.id,
      p.timezone,
    ])
  );

  for (const streak of (streaks ?? []) as Streak[]) {
    let settled = streak;

    if (streak.current_streak > 0 && streak.last_qualified_date) {
      const today = localDateStr(tzByUser.get(streak.user_id) ?? "America/Chicago");
      const gymDays = scheduleByUser.get(streak.user_id) ?? new Set<number>();

      let missed = false;
      // Check every full day between the last qualified visit and today.
      for (
        let d = addDays(streak.last_qualified_date, 1);
        d < today;
        d = addDays(d, 1)
      ) {
        if (gymDays.has(dayOfWeek(d))) {
          missed = true;
          break;
        }
      }

      if (missed) {
        const { data } = await createAdminClient()
          .from("streaks")
          .update({
            current_streak: 0,
            streak_start_date: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", streak.user_id)
          .select()
          .single();
        settled = (data as Streak) ?? {
          ...streak,
          current_streak: 0,
          streak_start_date: null,
        };
      }
    }

    result.set(streak.user_id, settled);
  }

  return result;
}

export async function recalculateStreak(userId: string): Promise<Streak | null> {
  const map = await recalculateStreaks([userId]);
  return map.get(userId) ?? null;
}

/**
 * Called after a qualifying check-out: settle the streak first (in case
 * days were missed since the last visit), then count today once.
 */
export async function recordQualifiedDay(
  userId: string,
  localDate: string
): Promise<Streak | null> {
  const settled = await recalculateStreak(userId);
  if (!settled) return null;
  if (settled.last_qualified_date === localDate) return settled; // already counted today

  const newCurrent = settled.current_streak + 1;
  const admin = createAdminClient();
  const { data } = await admin
    .from("streaks")
    .update({
      current_streak: newCurrent,
      longest_streak: Math.max(newCurrent, settled.longest_streak),
      last_qualified_date: localDate,
      streak_start_date:
        settled.current_streak === 0 ? localDate : settled.streak_start_date,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .single();

  return (data as Streak) ?? null;
}
