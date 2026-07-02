import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import type { Profile, ScheduleDay } from "@/lib/types";

export const metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
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
  if ((profile as Profile).onboarded) redirect("/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-black text-navy-950">
        Welcome, {(profile as Profile).full_name || (profile as Profile).username} 👋
      </h1>
      <p className="mb-6 mt-1 text-navy-800/70">
        Set up your profile and your weekly routine — your streak starts with
        your first check-in.
      </p>
      <ProfileForm
        profile={profile as Profile}
        schedule={(schedule ?? []) as ScheduleDay[]}
        mode="onboarding"
      />
    </div>
  );
}
