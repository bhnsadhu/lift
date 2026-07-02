"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ScheduleDay } from "@/lib/types";
import { DAY_NAMES } from "@/lib/types";
import Avatar from "./Avatar";

type DayState = { is_gym_day: boolean; routine: string };

export default function ProfileForm({
  profile,
  schedule,
  mode,
}: {
  profile: Profile;
  schedule: ScheduleDay[];
  mode: "onboarding" | "settings";
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name);
  const [bio, setBio] = useState(profile.bio);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile.avatar_url
  );
  const [days, setDays] = useState<DayState[]>(() =>
    Array.from({ length: 7 }, (_, i) => {
      const row = schedule.find((s) => s.day_of_week === i);
      return {
        is_gym_day: row?.is_gym_day ?? (i >= 1 && i <= 5),
        routine: row?.routine ?? "",
      };
    })
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setDay(i: number, patch: Partial<DayState>) {
    setDays((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
    if (file) setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();

    try {
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        avatarUrl = supabase.storage.from("avatars").getPublicUrl(path)
          .data.publicUrl;
      }

      // Capture the browser's timezone so streak days roll over at the
      // user's local midnight.
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          bio,
          avatar_url: avatarUrl,
          timezone,
          onboarded: true,
        })
        .eq("id", profile.id);
      if (profileError) throw profileError;

      const { error: scheduleError } = await supabase
        .from("workout_schedules")
        .upsert(
          days.map((d, i) => ({
            user_id: profile.id,
            day_of_week: i,
            is_gym_day: d.is_gym_day,
            routine: d.routine,
          }))
        );
      if (scheduleError) throw scheduleError;

      router.push(
        mode === "onboarding" ? "/dashboard" : `/profile/${profile.username}`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile basics */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-black text-navy-950">Your profile</h2>

        <div className="mt-4 flex items-center gap-4">
          <Avatar url={avatarPreview} name={fullName || profile.username} size={64} />
          <label className="cursor-pointer rounded-lg border border-navy-100 px-3 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50">
            {avatarPreview ? "Change photo" : "Upload photo"}
            <input
              type="file"
              accept="image/*"
              onChange={onPickAvatar}
              className="hidden"
            />
          </label>
        </div>

        <label className="mt-4 block text-sm font-semibold text-navy-900">
          Full name
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-navy-100 px-3 py-2 outline-none focus:border-navy-600"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-navy-900">
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={280}
            placeholder="What are you training for?"
            className="mt-1 w-full rounded-lg border border-navy-100 px-3 py-2 outline-none focus:border-navy-600"
          />
        </label>
      </section>

      {/* Weekly routine */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-black text-navy-950">Weekly routine</h2>
        <p className="mt-1 text-sm text-navy-800/70">
          Gym days grow your streak — miss one and it resets. Rest days are
          safe.
        </p>
        <div className="mt-4 space-y-2">
          {DAY_NAMES.map((name, i) => (
            <div
              key={name}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                days[i].is_gym_day
                  ? "border-navy-600 bg-navy-50"
                  : "border-navy-100"
              }`}
            >
              <button
                type="button"
                onClick={() => setDay(i, { is_gym_day: !days[i].is_gym_day })}
                className={`w-24 shrink-0 rounded-lg py-1.5 text-xs font-bold ${
                  days[i].is_gym_day
                    ? "bg-navy-800 text-gold-400"
                    : "bg-navy-100 text-navy-800/60"
                }`}
              >
                {days[i].is_gym_day ? "🏋️ Gym day" : "😴 Rest day"}
              </button>
              <span className="w-24 shrink-0 text-sm font-semibold text-navy-900">
                {name}
              </span>
              <input
                type="text"
                value={days[i].routine}
                disabled={!days[i].is_gym_day}
                onChange={(e) => setDay(i, { routine: e.target.value })}
                placeholder={days[i].is_gym_day ? "e.g. Push day" : "—"}
                className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm outline-none focus:border-navy-100 disabled:opacity-40"
              />
            </div>
          ))}
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-gold-500 py-3 font-black text-navy-950 hover:bg-gold-400 disabled:opacity-60"
      >
        {saving
          ? "Saving…"
          : mode === "onboarding"
            ? "Let's go →"
            : "Save changes"}
      </button>
    </form>
  );
}
