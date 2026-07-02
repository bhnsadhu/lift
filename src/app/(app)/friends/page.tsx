import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import type { Friendship, Profile } from "@/lib/types";
import {
  removeFriendship,
  respondToRequest,
  sendFriendRequest,
} from "./actions";

export const metadata = { title: "Friends" };

type MiniProfile = Pick<Profile, "id" | "username" | "full_name" | "avatar_url">;
type FriendshipRow = Friendship & {
  requester: MiniProfile;
  addressee: MiniProfile;
};

const EMBED =
  "*, requester:profiles!friendships_requester_id_fkey(id, username, full_name, avatar_url), addressee:profiles!friendships_addressee_id_fkey(id, username, full_name, avatar_url)";

function PersonRow({
  person,
  children,
}: {
  person: MiniProfile;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar
        url={person.avatar_url}
        name={person.full_name || person.username}
        size={40}
      />
      <div className="min-w-0 flex-1">
        <Link
          href={`/profile/${person.username}`}
          className="block truncate font-bold text-navy-950 hover:underline"
        >
          {person.full_name || person.username}
        </Link>
        <p className="truncate text-sm text-navy-800/60">@{person.username}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  );
}

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: mineData }, { data: searchData }] = await Promise.all([
    supabase
      .from("friendships")
      .select(EMBED)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    query
      ? supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .neq("id", user.id)
          .limit(20)
      : Promise.resolve({ data: null }),
  ]);

  const mine = (mineData ?? []) as unknown as FriendshipRow[];
  const incoming = mine.filter(
    (f) => f.status === "pending" && f.addressee_id === user.id
  );
  const outgoing = mine.filter(
    (f) => f.status === "pending" && f.requester_id === user.id
  );
  const friends = mine.filter((f) => f.status === "accepted");
  const byOtherId = new Map(
    mine.map((f) => [
      f.requester_id === user.id ? f.addressee_id : f.requester_id,
      f,
    ])
  );

  const results = (searchData ?? []) as MiniProfile[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-navy-950">Friends</h1>

      {/* Search */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-black text-navy-950">Find people</h2>
        <form action="/friends" className="mt-3 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by name or username…"
            className="w-full rounded-lg border border-navy-100 px-3 py-2 outline-none focus:border-navy-600"
          />
          <button className="rounded-lg bg-navy-800 px-4 py-2 font-bold text-white hover:bg-navy-700">
            Search
          </button>
        </form>

        {query && (
          <ul className="mt-2 divide-y divide-navy-50">
            {results.length === 0 && (
              <p className="py-3 text-sm text-navy-800/60">
                No one found for &ldquo;{query}&rdquo;.
              </p>
            )}
            {results.map((p) => {
              const rel = byOtherId.get(p.id);
              return (
                <PersonRow key={p.id} person={p}>
                  {!rel && (
                    <form action={sendFriendRequest}>
                      <input type="hidden" name="addresseeId" value={p.id} />
                      <button className="rounded-lg bg-gold-500 px-3 py-1.5 text-sm font-bold text-navy-950 hover:bg-gold-400">
                        Add friend
                      </button>
                    </form>
                  )}
                  {rel?.status === "accepted" && (
                    <span className="text-sm font-bold text-navy-600">
                      ✓ Friends
                    </span>
                  )}
                  {rel?.status === "pending" &&
                    rel.requester_id === user.id && (
                      <span className="text-sm font-semibold text-navy-800/60">
                        Requested
                      </span>
                    )}
                  {rel?.status === "pending" &&
                    rel.addressee_id === user.id && (
                      <form action={respondToRequest}>
                        <input
                          type="hidden"
                          name="friendshipId"
                          value={rel.id}
                        />
                        <input type="hidden" name="decision" value="accept" />
                        <button className="rounded-lg bg-navy-800 px-3 py-1.5 text-sm font-bold text-white hover:bg-navy-700">
                          Accept
                        </button>
                      </form>
                    )}
                </PersonRow>
              );
            })}
          </ul>
        )}
      </section>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <section className="rounded-2xl border-2 border-gold-400 bg-white p-6 shadow-sm">
          <h2 className="font-black text-navy-950">
            Friend requests{" "}
            <span className="rounded-full bg-gold-500 px-2 py-0.5 text-sm text-navy-950">
              {incoming.length}
            </span>
          </h2>
          <ul className="mt-2 divide-y divide-navy-50">
            {incoming.map((f) => (
              <PersonRow key={f.id} person={f.requester}>
                <form action={respondToRequest}>
                  <input type="hidden" name="friendshipId" value={f.id} />
                  <input type="hidden" name="decision" value="accept" />
                  <button className="rounded-lg bg-gold-500 px-3 py-1.5 text-sm font-bold text-navy-950 hover:bg-gold-400">
                    Accept
                  </button>
                </form>
                <form action={respondToRequest}>
                  <input type="hidden" name="friendshipId" value={f.id} />
                  <input type="hidden" name="decision" value="decline" />
                  <button className="rounded-lg border border-navy-100 px-3 py-1.5 text-sm font-bold text-navy-800/70 hover:bg-navy-50">
                    Decline
                  </button>
                </form>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

      {/* Sent requests */}
      {outgoing.length > 0 && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-black text-navy-950">Sent requests</h2>
          <ul className="mt-2 divide-y divide-navy-50">
            {outgoing.map((f) => (
              <PersonRow key={f.id} person={f.addressee}>
                <form action={removeFriendship}>
                  <input type="hidden" name="friendshipId" value={f.id} />
                  <button className="rounded-lg border border-navy-100 px-3 py-1.5 text-sm font-bold text-navy-800/70 hover:bg-navy-50">
                    Cancel
                  </button>
                </form>
              </PersonRow>
            ))}
          </ul>
        </section>
      )}

      {/* Friend list */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-black text-navy-950">
          Your friends ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <p className="mt-3 text-sm text-navy-800/60">
            No friends yet — search above to find your gym buddies.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-navy-50">
            {friends.map((f) => {
              const other =
                f.requester_id === user.id ? f.addressee : f.requester;
              return (
                <PersonRow key={f.id} person={other}>
                  <form action={removeFriendship}>
                    <input type="hidden" name="friendshipId" value={f.id} />
                    <button className="rounded-lg border border-navy-100 px-3 py-1.5 text-sm font-bold text-navy-800/70 hover:bg-navy-50">
                      Unfriend
                    </button>
                  </form>
                </PersonRow>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
