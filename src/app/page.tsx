import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TIERS } from "@/lib/tiers";

const TIER_RANGES = ["1–99 days", "100–364 days", "1–2 years", "2+ years"];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-navy-950 text-white">
      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-xl font-black tracking-tight">
          Gym<span className="text-gold-500">Streak</span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-navy-100 hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950 hover:bg-gold-400"
          >
            Sign up free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-16 text-center">
        <p className="mb-4 inline-block rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1 text-sm font-semibold text-gold-400">
          Built for college students 🎓
        </p>
        <h1 className="mx-auto max-w-3xl text-5xl font-black leading-tight sm:text-6xl">
          Show up. Check in.{" "}
          <span className="text-gold-500">Keep the streak alive.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-navy-100">
          GymStreak verifies you&apos;re actually at the gym, tracks your streak
          against your own routine, and lets your friends watch you climb the
          tiers — or watch you break your streak.
        </p>
        <Link
          href="/signup"
          className="mt-10 inline-block rounded-xl bg-gold-500 px-8 py-4 text-lg font-black text-navy-950 shadow-lg shadow-gold-500/20 hover:bg-gold-400"
        >
          Start your streak →
        </Link>
      </section>

      {/* How it works */}
      <section className="border-t border-navy-800 bg-navy-900">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 sm:grid-cols-3">
          {[
            {
              emoji: "📍",
              title: "Verified check-ins",
              body: "Check in at a registered gym and stay at least 20 minutes. Location-verified — no fake reps.",
            },
            {
              emoji: "🔥",
              title: "Streaks that respect rest days",
              body: "Set your weekly routine. Hit your gym days to grow the streak; rest days never break it. Miss a gym day and it resets.",
            },
            {
              emoji: "🤝",
              title: "Friends keep you honest",
              body: "Send friend requests, see everyone's live streaks and tiers, and let public accountability do the rest.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-navy-800/60 p-6">
              <div className="text-3xl">{f.emoji}</div>
              <h3 className="mt-3 text-lg font-bold text-gold-400">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-100">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tiers */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-3xl font-black">
          Climb the <span className="text-gold-500">tiers</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-4">
          {TIERS.map((t, i) => (
            <div
              key={t.name}
              className="rounded-2xl border border-navy-800 bg-navy-900 p-6 text-center"
            >
              <div className="text-4xl">{t.emoji}</div>
              <h3 className="mt-2 font-bold text-white">{t.name}</h3>
              <p className="mt-1 text-sm text-gold-400">{TIER_RANGES[i]}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-navy-800 py-8 text-center text-sm text-navy-100/60">
        GymStreak — blue &amp; gold, sweat &amp; glory.
      </footer>
    </main>
  );
}
