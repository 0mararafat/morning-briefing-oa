"use client";

import { useState, type CSSProperties } from "react";

const mono = (extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: "uppercase",
  ...extra,
});

// Pause / resume the user's scheduled briefings. Talks to PATCH /api/schedule,
// which flips UserConfig.enabled — the only thing the hourly scheduler checks.
//
// variant "inline" — full-width row used on the Connect step under the API key.
// variant "card"   — compact pill used on the dashboard top bar.
export function ScheduleControl({
  initialEnabled,
  variant = "inline",
}: {
  initialEnabled: boolean;
  variant?: "inline" | "card";
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !enabled;
    setBusy(true);
    setError(null);
    setEnabled(next); // optimistic
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not update schedule");
      }
    } catch (e) {
      setEnabled(!next); // revert
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const Switch = (
    <button
      onClick={toggle}
      disabled={busy}
      role="switch"
      aria-checked={enabled}
      title={enabled ? "Pause scheduled briefings" : "Resume scheduled briefings"}
      style={{
        position: "relative",
        width: 44,
        height: 25,
        flex: "none",
        borderRadius: 999,
        border: "1px solid var(--border-strong)",
        background: enabled ? "var(--accent)" : "var(--surface-2)",
        cursor: busy ? "wait" : "pointer",
        transition: "background 160ms ease",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: enabled ? 21 : 2,
          width: 19,
          height: 19,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          transition: "left 160ms ease",
        }}
      />
    </button>
  );

  if (variant === "card") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={mono({ fontSize: 10, letterSpacing: "0.08em", color: "var(--text-2)", textTransform: "none" })}>
            Claude API Schedule{" "}
            <strong style={{ color: enabled ? "var(--text)" : "var(--amber)", fontWeight: 600 }}>
              {enabled ? "ON" : "PAUSED"}
            </strong>
          </span>
          {Switch}
        </div>
        {error && <span style={{ fontSize: 11.5, color: "var(--amber)" }}>{error}</span>}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "14px 16px",
        borderRadius: 13,
        background: "var(--surface)",
        border: `1px solid ${enabled ? "var(--border)" : "var(--amber)"}`,
        boxShadow: "var(--shadow-sm), inset 0 1px 0 var(--glass-hi)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={mono({ fontSize: 11, letterSpacing: "0.1em", color: "var(--text)", textTransform: "none" })}>
          {enabled ? "Scheduled briefings are on" : "Scheduled briefings paused"}
        </div>
        <div style={mono({ fontSize: 10.5, color: "var(--text-3)", letterSpacing: "0.04em", marginTop: 3, textTransform: "none" })}>
          {enabled
            ? "Runs automatically on the schedule you set."
            : "Automatic runs are stopped. “Run now” still works any time."}
        </div>
        {error && <div style={{ fontSize: 12, color: "var(--amber)", marginTop: 5 }}>{error}</div>}
      </div>
      {Switch}
    </div>
  );
}
