"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-2xl font-black text-white">
          Gym<span className="text-gold-500">Streak</span>
        </Link>
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-xl"
        >
          <h1 className="text-xl font-black text-navy-950">Welcome back</h1>
          <p className="mt-1 text-sm text-navy-800/70">
            Log in and keep the streak alive.
          </p>

          <label className="mt-5 block text-sm font-semibold text-navy-900">
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

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-lg bg-navy-800 py-2.5 font-bold text-white hover:bg-navy-700 disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>

          <p className="mt-4 text-center text-sm text-navy-800/70">
            New here?{" "}
            <Link href="/signup" className="font-bold text-navy-600 hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
