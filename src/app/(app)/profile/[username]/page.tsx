import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recalculateStreak } from "@/lib/streak";
import Avatar from "@/components/Avatar";
import TierBadge from "@/components/TierBadge";
import type { Friendship, Profile, ScheduleDay } from "@/lib/types";
import { DAY_NAMES } from "@/lib/types";
import {
  removeFriendship,
  respondToRequest,
  sendFriendRequest,
} from "../../friends/actions";

type MiniProfile = Pick<Profile, "id" | "username" | "full_name" | "avatar_url">;
type FriendshipRow = Friendship & {
  requester: MiniProfile;
  addressee: MiniProfile;
};

const EMBED =
  "*, requester:profiles!friendships_requester_id_fkey(id, username, full_name, avatar_url), addressee:profiles!friendships_addressee_id_fkey(id, username, full_name, avatar_url)";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (!profileData) notFound();
  const profile = profileData as Profile;
  const isOwn = profile.id === user.id;

  const admin = createAdminClient();
  const [streak, scheduleRes, friendsRes, relRes, lastSessionRes] =
    await Promise.all([
      recalculateStreak(profile.id),
      supabase.from("workout_schedules").select("*").eq("user_id", profile.id),
      supabase
        .from("friendships")
        .select(EMBED)
        .eq("status", "accepted")
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`),
      isOwn
        ? Promise.resolve({ data: null })
        : supabase
            .from("friendships")
            .select("*")
            .or(
              `and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`
            )
            .maybeSingle(),
      // Sessions are RLS-restricted to their owner, so look up the "home gym"
      // (latest qualifying visit) server-side.
      admin
        .from("gym_sessions")
        .select("gyms(name)")
        .eq("user_id", profile.id)
        .eq("qualifies", true)
        .order("check_out_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const schedule = (scheduleRes.data ?? []) as ScheduleDay[];
  const gymDayCount = schedule.filter((s) => s.is_gym_day).length;
  const friendRows = (friendsRes.data ?? []) as unknown as FriendshipRow[];
  const friendList = friendRows.map((f) =>
    f.requester_id === profile.id ? f.addressee : f.requester
  );
  const relationship = relRes.data as Friendship | null;
  const homeGym =
    (lastSessionRes.data as { gyms: { name: string } | null } | null)?.gyms
      ?.name ?? null;

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl bg-navy-900 p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <Avatar
            url={profile.avatar_url}
            name={profile.full_name || profile.username}
            size={80}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black">
                {profile.full_name || profile.username}
              </h1>
              <TierBadge streakDays={streak?.current_streak ?? 0} size="sm" />
            </div>
            <p className="text-sm text-navy-100/70">@{profile.username}</p>
            {profile.bio && (
              <p className="mt-2 text-sm leading-relaxed text-navy-100">
                {profile.bio}
              </p>
            )}
            <p className="mt-2 text-xs text-navy-100/50">
              Member since {memberSince}
              {homeGym && <> · 🏠 {homeGym}</>}
            </p>
          </div>
        </div>

        {/* Streak stats */}
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-navy-800 pt-4 text-center">
          <div>
            <p className="text-2xl font-black">
              {(streak?.current_streak ?? 0) > 0 && "🔥 "}
              {streak?.current_streak ?? 0}
            </p>
            <p className="text-xs font-semibold text-navy-100/60">
              Current streak
            </p>
          </div>
          <div>
            <p className="text-2xl font-black">{streak?.longest_streak ?? 0}</p>
            <p className="text-xs font-semibold text-navy-100/60">
              Longest streak
            </p>
          </div>
          <div>
            <p className="text-2xl font-black">{friendList.length}</p>
            <p className="text-xs font-semibold text-navy-100/60">Friends</p>
          </div>
        </div>

        {/* Action button */}
        <div className="mt-5">
          {isOwn && (
            <Link
              href="/settings"
              className="inline-block rounded-lg bg-navy-800 px-4 py-2 text-sm font-bold text-white hover:bg-navy-700"
            >
              Edit profile
            </Link>
          )}
          {!isOwn && !relationship && (
            <form action={sendFriendRequest}>
              <input type="hidden" name="addresseeId" value={profile.id} />
              <button className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950 hover:bg-gold-400">
                Add friend
              </button>
            </form>
          )}
          {!isOwn &&
            relationship?.status === "pending" &&
            relationship.requester_id === user.id && (
              <form action={removeFriendship} className="flex items-center gap-3">
                <span className="text-sm font-semibold text-navy-100/70">
                  Friend request sent
                </span>
                <input
                  type="hidden"
                  name="friendshipId"
                  value={relationship.id}
                />
                <button className="rounded-lg border border-navy-100/30 px-3 py-1.5 text-sm font-bold text-navy-100 hover:bg-navy-800">
                  Cancel
                </button>
              </form>
            )}
          {!isOwn &&
            relationship?.status === "pending" &&
            relationship.addressee_id === user.id && (
              <div className="flex items-center gap-2">
                <span className="mr-1 text-sm font-semibold text-navy-100/70">
                  Sent you a friend request:
                </span>
                <form action={respondToRequest}>
                  <input
                    type="hidden"
                    name="friendshipId"
                    value={relationship.id}
                  />
                  <input type="hidden" name="decision" value="accept" />
                  <button className="rounded-lg bg-gold-500 px-3 py-1.5 text-sm font-bold text-navy-950 hover:bg-gold-400">
                    Accept
                  </button>
                </form>
                <form action={respondToRequest}>
                  <input
                    type="hidden"
                    name="friendshipId"
                    value={relationship.id}
                  />
                  <input type="hidden" name="decision" value="decline" />
                  <button className="rounded-lg border border-navy-100/30 px-3 py-1.5 text-sm font-bold text-navy-100 hover:bg-navy-800">
                    Decline
                  </button>
                </form>
              </div>
            )}
          {!isOwn && relationship?.status === "accepted" && (
            <form action={removeFriendship} className="flex items-center gap-3">
              <span className="text-sm font-bold text-gold-400">✓ Friends</span>
              <input
                type="hidden"
                name="friendshipId"
                value={relationship.id}
              />
              <button className="rounded-lg border border-navy-100/30 px-3 py-1.5 text-sm font-bold text-navy-100 hover:bg-navy-800">
                Unfriend
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Weekly routine */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-black text-navy-950">
          Weekly routine{" "}
          <span className="text-sm font-semibold text-navy-800/50">
            ({gymDayCount} gym {gymDayCount === 1 ? "day" : "days"}/week)
          </span>
        </h2>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center sm:gap-2">
          {DAY_NAMES.map((name, i) => {
            const day = schedule.find((s) => s.day_of_week === i);
            const isGym = day?.is_gym_day ?? false;
            return (
              <div
                key={name}
                title={isGym ? day?.routine || "Gym day" : "Rest day"}
                className={`rounded-xl py-3 ${
                  isGym
                    ? "bg-navy-800 text-gold-400"
                    : "bg-navy-50 text-navy-800/40"
                }`}
              >
                <p className="text-xs font-bold">{name.slice(0, 3)}</p>
                <p className="mt-1 text-lg">{isGym ? "🏋️" : "😴"}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Friends */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-black text-navy-950">
          Friends ({friendList.length})
        </h2>
        {friendList.length === 0 ? (
          <p className="mt-3 text-sm text-navy-800/60">No friends yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {friendList.map((p) => (
              <Link
                key={p.id}
                href={`/profile/${p.username}`}
                className="flex items-center gap-2 rounded-xl border border-navy-50 p-2 hover:bg-navy-50"
              >
                <Avatar
                  url={p.avatar_url}
                  name={p.full_name || p.username}
                  size={36}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy-950">
                    {p.full_name || p.username}
                  </p>
                  <p className="truncate text-xs text-navy-800/60">
                    @{p.username}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
