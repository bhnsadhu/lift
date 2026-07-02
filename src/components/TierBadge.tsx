import { getTier } from "@/lib/tiers";

export default function TierBadge({
  streakDays,
  size = "md",
}: {
  streakDays: number;
  size?: "sm" | "md";
}) {
  const tier = getTier(streakDays);
  const sizing =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${sizing} ${tier.badgeClass}`}
    >
      <span>{tier.emoji}</span>
      {tier.name}
    </span>
  );
}
