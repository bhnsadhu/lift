export type Tier = {
  name: string;
  emoji: string;
  minDays: number;
  // Tailwind classes for the badge
  badgeClass: string;
};

export const TIERS: Tier[] = [
  {
    name: "Weakling",
    emoji: "🐣",
    minDays: 0,
    badgeClass: "bg-navy-100 text-navy-800",
  },
  {
    name: "The Regular",
    emoji: "💪",
    minDays: 100,
    badgeClass: "bg-navy-600 text-white",
  },
  {
    name: "Seasoned Veteran",
    emoji: "🔥",
    minDays: 365,
    badgeClass: "bg-gold-100 text-gold-600 border border-gold-400",
  },
  {
    name: "Gym Rat",
    emoji: "🐀",
    minDays: 730,
    badgeClass: "bg-gold-500 text-navy-950",
  },
];

export function getTier(streakDays: number): Tier {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (streakDays >= t.minDays) tier = t;
  }
  return tier;
}

// Days until the next tier, or null if already at the top.
export function daysToNextTier(streakDays: number): {
  next: Tier;
  days: number;
} | null {
  for (const t of TIERS) {
    if (streakDays < t.minDays) return { next: t, days: t.minDays - streakDays };
  }
  return null;
}
