import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { distanceMeters } from "@/lib/geo";
import {
  QUALIFY_MINUTES,
  localDateStr,
  recordQualifiedDay,
  recalculateStreak,
} from "@/lib/streak";
import type { Gym } from "@/lib/types";

// Sessions longer than this were almost certainly a forgotten check-out.
const MAX_SESSION_MINUTES = 8 * 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Missing location." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: session } = await admin
    .from("gym_sessions")
    .select("*")
    .eq("user_id", user.id)
    .is("check_out_at", null)
    .maybeSingle();
  if (!session) {
    return NextResponse.json(
      { error: "You're not checked in anywhere." },
      { status: 409 }
    );
  }

  const { data: gym } = await admin
    .from("gyms")
    .select("*")
    .eq("id", session.gym_id)
    .single();
  if (!gym) {
    return NextResponse.json({ error: "Gym not found." }, { status: 500 });
  }

  const dist = distanceMeters(lat, lng, (gym as Gym).lat, (gym as Gym).lng);
  const withinRadius = dist <= (gym as Gym).radius_m;

  const now = new Date();
  const minutes = Math.floor(
    (now.getTime() - new Date(session.check_in_at).getTime()) / 60000
  );
  const qualifies =
    withinRadius && minutes >= QUALIFY_MINUTES && minutes <= MAX_SESSION_MINUTES;

  const { data: profile } = await admin
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  const localDate = localDateStr(profile?.timezone ?? "America/Chicago", now);

  await admin
    .from("gym_sessions")
    .update({
      check_out_at: now.toISOString(),
      check_out_lat: lat,
      check_out_lng: lng,
      local_date: localDate,
      qualifies,
    })
    .eq("id", session.id);

  const streak = qualifies
    ? await recordQualifiedDay(user.id, localDate)
    : await recalculateStreak(user.id);

  let message: string;
  if (qualifies) {
    message = `${minutes} minutes at ${(gym as Gym).name} — that counts! 🔥 Streak: ${streak?.current_streak ?? "?"} days.`;
  } else if (!withinRadius) {
    message = `Checked out, but you were ${Math.round(dist)}m from ${(gym as Gym).name} — this visit didn't count.`;
  } else if (minutes < QUALIFY_MINUTES) {
    message = `Only ${minutes} min — you need at least ${QUALIFY_MINUTES} minutes for it to count. Session closed.`;
  } else {
    message = `Session was open for over ${MAX_SESSION_MINUTES / 60} hours (forgot to check out?) — it didn't count.`;
  }

  return NextResponse.json({ qualifies, minutes, streak, message });
}
