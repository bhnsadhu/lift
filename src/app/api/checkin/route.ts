import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { distanceMeters } from "@/lib/geo";
import type { Gym } from "@/lib/types";

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

  const { data: gyms } = await admin.from("gyms").select("*");
  let nearest: { gym: Gym; dist: number } | null = null;
  for (const gym of (gyms ?? []) as Gym[]) {
    const dist = distanceMeters(lat, lng, gym.lat, gym.lng);
    if (!nearest || dist < nearest.dist) nearest = { gym, dist };
  }

  if (!nearest || nearest.dist > nearest.gym.radius_m) {
    const hint = nearest
      ? ` Nearest gym: ${nearest.gym.name}, ${Math.round(nearest.dist)}m away.`
      : " No gyms are registered yet.";
    return NextResponse.json(
      { error: `You don't seem to be at a registered gym.${hint}` },
      { status: 422 }
    );
  }

  const { data: open } = await admin
    .from("gym_sessions")
    .select("id")
    .eq("user_id", user.id)
    .is("check_out_at", null)
    .maybeSingle();
  if (open) {
    return NextResponse.json(
      { error: "You already have an open session — check out first." },
      { status: 409 }
    );
  }

  const { data: session, error } = await admin
    .from("gym_sessions")
    .insert({
      user_id: user.id,
      gym_id: nearest.gym.id,
      check_in_lat: lat,
      check_in_lng: lng,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: "Could not check in." }, { status: 500 });
  }

  return NextResponse.json({
    session,
    gymName: nearest.gym.name,
    message: `Checked in at ${nearest.gym.name}. Stay at least 20 minutes, then check out!`,
  });
}
