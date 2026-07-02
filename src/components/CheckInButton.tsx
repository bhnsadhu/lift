"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location isn't supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied — allow location access to check in."
              : "Couldn't get your location. Try again."
          )
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}

export default function CheckInButton({
  openSession,
}: {
  openSession: { gymName: string; checkInAt: string } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [elapsedMin, setElapsedMin] = useState<number | null>(null);

  useEffect(() => {
    if (!openSession) {
      setElapsedMin(null);
      return;
    }
    const update = () =>
      setElapsedMin(
        Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(openSession.checkInAt).getTime()) / 60000
          )
        )
      );
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [openSession]);

  async function handleClick() {
    setBusy(true);
    setResult(null);
    try {
      const pos = await getPosition();
      const res = await fetch(openSession ? "/api/checkout" : "/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, text: data.error ?? "Something went wrong." });
      } else {
        setResult({ ok: true, text: data.message ?? "Done!" });
        router.refresh();
      }
    } catch (err) {
      setResult({
        ok: false,
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
    setBusy(false);
  }

  return (
    <div>
      {openSession && (
        <p className="mb-2 text-sm font-semibold text-navy-800">
          📍 Checked in at {openSession.gymName}
          {elapsedMin !== null && (
            <span className="text-navy-800/60"> — {elapsedMin} min so far</span>
          )}
        </p>
      )}
      <button
        onClick={handleClick}
        disabled={busy}
        className={`w-full rounded-xl py-4 text-lg font-black shadow-lg disabled:opacity-60 ${
          openSession
            ? "bg-navy-800 text-gold-400 hover:bg-navy-700"
            : "bg-gold-500 text-navy-950 shadow-gold-500/20 hover:bg-gold-400"
        }`}
      >
        {busy
          ? "Locating…"
          : openSession
            ? "✅ Check out"
            : "📍 Check in at the gym"}
      </button>
      {result && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${
            result.ok
              ? "bg-navy-50 text-navy-800"
              : "bg-red-50 text-red-600"
          }`}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
