import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import type { Profile, ScheduleDay } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: schedule }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("workout_schedules").select("*").eq("user_id", user.id),
  ]);
  if (!profile) redirect("/login");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-navy-950">Settings</h1>
      <ProfileForm
        profile={profile as Profile}
        schedule={(schedule ?? []) as ScheduleDay[]}
        mode="settings"
      />
    </div>
  );
}
