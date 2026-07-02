"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendFriendRequest(formData: FormData) {
  const addresseeId = String(formData.get("addresseeId") ?? "");
  if (!addresseeId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || addresseeId === user.id) return;

  // RLS guarantees requester_id must be the caller and status 'pending';
  // the unique pair index blocks duplicates in either direction.
  await supabase
    .from("friendships")
    .insert({ requester_id: user.id, addressee_id: addresseeId });

  revalidatePath("/", "layout");
}

export async function respondToRequest(formData: FormData) {
  const id = Number(formData.get("friendshipId"));
  const accept = String(formData.get("decision")) === "accept";
  if (!Number.isFinite(id)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (accept) {
    await supabase
      .from("friendships")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", id)
      .eq("addressee_id", user.id)
      .eq("status", "pending");
  } else {
    // Declining deletes the row so the requester can try again later.
    await supabase
      .from("friendships")
      .delete()
      .eq("id", id)
      .eq("addressee_id", user.id)
      .eq("status", "pending");
  }

  revalidatePath("/", "layout");
}

// Cancel an outgoing request or unfriend someone (RLS: must be involved).
export async function removeFriendship(formData: FormData) {
  const id = Number(formData.get("friendshipId"));
  if (!Number.isFinite(id)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("friendships").delete().eq("id", id);

  revalidatePath("/", "layout");
}
