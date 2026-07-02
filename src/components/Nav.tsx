import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types";
import Avatar from "./Avatar";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let pendingCount = 0;
  if (user) {
    const [{ data: p }, { count }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", user.id)
        .eq("status", "pending"),
    ]);
    profile = p as Profile | null;
    pendingCount = count ?? 0;
  }

  return (
    <header className="sticky top-0 z-10 bg-navy-900 text-white shadow-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-black tracking-tight">
          Gym<span className="text-gold-500">Streak</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/dashboard" className="hover:text-gold-400">
            Home
          </Link>
          <Link href="/friends" className="relative hover:text-gold-400">
            Friends
            {pendingCount > 0 && (
              <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-black text-navy-950">
                {pendingCount}
              </span>
            )}
          </Link>
          {profile && (
            <Link
              href={`/profile/${profile.username}`}
              className="hover:opacity-80"
              title="My profile"
            >
              <Avatar
                url={profile.avatar_url}
                name={profile.full_name || profile.username}
                size={32}
              />
            </Link>
          )}
          <Link href="/settings" className="hover:text-gold-400" title="Settings">
            ⚙️
          </Link>
          <form action={signOut}>
            <button className="text-navy-100/70 hover:text-white">
              Log out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
