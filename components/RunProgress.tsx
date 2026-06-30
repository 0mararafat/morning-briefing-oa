"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TOTAL = 300; // seconds we expect a generation to take (~5 min)
const POLL_MS = 10_000;

// Witty status lines, surfaced roughly in order as the run progresses.
const LINES = [
  "Warming up the presses…",
  "Scanning the wires for what moved overnight…",
  "Reading between the headlines…",
  "Consulting the voices you chose…",
  "Connecting the dots across your sectors…",
  "Sorting signal from noise…",
  "Drafting your edition…",
  "Polishing the final copy…",
];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// Full-screen loading overlay shown after "Run now". Counts up toward 5 minutes
// while polling /api/run/status so it can jump to the dashboard the moment the
// briefing is ready — and falls back to navigating at the 5-minute mark.
export function RunProgress() {
  const router = useRouter();
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState<"ok" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tick the timer once a second; navigate when we cross the 5-minute fallback.
  useEffect(() => {
    const id = setInterval(() => {
      const secs = (Date.now() - startedAt.current) / 1000;
      setElapsed(secs);
      if (secs >= TOTAL) {
        clearInterval(id);
        router.push("/dashboard");
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [router]);

  // Poll for early completion: a run that started after we opened this screen.
  useEffect(() => {
    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/run/status", { cache: "no-store" });
        if (!res.ok) return;
        const s = await res.json();
        const ranAt = s.lastRunAt ? new Date(s.lastRunAt).getTime() : 0;
        if (ranAt > startedAt.current && !cancelled) {
          if (s.lastRunStatus === "error") {
            setDone("error");
            setErrorMsg(s.lastRunError ?? null);
            clearInterval(id);
            setTimeout(() => {
              router.push("/dashboard");
              router.refresh();
            }, 2200);
          } else {
            setDone("ok");
            clearInterval(id);
            setTimeout(() => {
              router.push("/dashboard");
              router.refresh();
            }, 900);
          }
        }
      } catch {
        // transient — keep polling
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

  const pct = Math.min(elapsed / TOTAL, 1) * 100;
  const lineIdx = done
    ? 0
    : Math.min(LINES.length - 1, Math.floor((elapsed / TOTAL) * LINES.length));
  const headline = done === "ok"
    ? "Your edition is ready —"
    : done === "error"
    ? "That run hit a snag —"
    : LINES[lineIdx];
  const subline = done === "ok"
    ? "taking you to it now."
    : done === "error"
    ? "we'll take you to the details."
    : "This usually takes about 5 minutes. You can leave this open — we'll take you to your briefing automatically.";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
          "radial-gradient(1000px 560px at 84% -6%, var(--accent-soft-2), transparent 60%), radial-gradient(720px 520px at -8% 10%, var(--accent-soft-2), transparent 55%), var(--bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 20,
          background: "var(--surface-solid)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow)",
        }}
      >
        <div
          style={{
            padding: "40px 36px 34px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase",
              fontSize: 11,
              letterSpacing: "0.14em",
              color: "var(--accent-ink)",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: done === "error" ? "var(--amber)" : "var(--accent)",
                animation: "mb-pulse 2s ease-in-out infinite",
              }}
            />
            {done === "error" ? "Run failed" : done === "ok" ? "Ready" : "Generating your briefing"}
          </div>

          <h2
            style={{
              fontFamily: "'Spectral', serif",
              fontSize: 24,
              lineHeight: 1.25,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              margin: "0 0 10px",
              maxWidth: 360,
            }}
          >
            {headline}
          </h2>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--text-2)",
              margin: "0 0 26px",
              maxWidth: 380,
            }}
          >
            {subline}
          </p>
          {errorMsg && (
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--amber)", margin: "-16px 0 26px", maxWidth: 380 }}>
              {errorMsg}
            </p>
          )}

          {/* Progress bar */}
          <div style={{ width: "100%", height: 8, borderRadius: 999, background: "var(--bg-2)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${done === "ok" ? 100 : pct}%`,
                background: done === "error" ? "var(--amber)" : "var(--accent)",
                borderRadius: 999,
                transition: "width 900ms linear",
                boxShadow: "0 0 12px var(--accent-soft)",
              }}
            />
          </div>
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              marginTop: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--text-3)",
            }}
          >
            <span>{fmt(elapsed)}</span>
            <span>~5:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
