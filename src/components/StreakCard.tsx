import { daysToNextTier } from "@/lib/tiers";
import type { Streak } from "@/lib/types";
import TierBadge from "./TierBadge";

export default function StreakCard({ streak }: { streak: Streak }) {
  const days = streak.current_streak;
  const next = daysToNextTier(days);

  return (
    <div className="rounded-2xl bg-navy-900 p-6 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-navy-100/70">
            Current streak
          </p>
          <p className="mt-1 text-5xl font-black">
            {days > 0 && <span className="mr-1">🔥</span>}
            {days}
            <span className="ml-2 text-xl font-bold text-navy-100/70">
              {days === 1 ? "day" : "days"}
            </span>
          </p>
        </div>
        <TierBadge streakDays={days} />
      </div>

      {next && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-navy-800">
            <div
              className="h-full rounded-full bg-gold-500"
              style={{
                width: `${Math.min(100, Math.max(2, ((next.next.minDays - next.days) / next.next.minDays) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-navy-100/70">
            {next.days} more {next.days === 1 ? "day" : "days"} to{" "}
            {next.next.emoji} {next.next.name}
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-navy-100/50">
        Longest streak: {streak.longest_streak}{" "}
        {streak.longest_streak === 1 ? "day" : "days"}
      </p>
    </div>
  );
}
