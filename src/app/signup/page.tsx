"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setError(
        "Username must be 3-20 characters: lowercase letters, numbers, or underscores."
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, full_name: fullName } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
    } else {
      // Email confirmation is enabled on the Supabase project
      setNotice("Check your email to confirm your account, then log in.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-2xl font-black text-white">
          Gym<span className="text-gold-500">Streak</span>
        </Link>
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-xl"
        >
          <h1 className="text-xl font-black text-navy-950">
            Start your streak
          </h1>
          <p className="mt-1 text-sm text-navy-800/70">
            Day 1 starts the moment you check in.
          </p>

          <label className="mt-5 block text-sm font-semibold text-navy-900">
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
            Username
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="e.g. gym_rat_27"
              className="mt-1 w-full rounded-lg border border-navy-100 px-3 py-2 outline-none focus:border-navy-600"
            />
          </label>

          <label className="mt-4 block text-sm font-semibold text-navy-900">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-navy-100 px-3 py-2 outline-none focus:border-navy-600"
            />
          </label>

          <label className="mt-4 block text-sm font-semibold text-navy-900">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-navy-100 px-3 py-2 outline-none focus:border-navy-600"
            />
          </label>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-3 rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-800">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-gold-500 py-2.5 font-bold text-navy-950 hover:bg-gold-400 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>

          <p className="mt-4 text-center text-sm text-navy-800/70">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-navy-600 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
