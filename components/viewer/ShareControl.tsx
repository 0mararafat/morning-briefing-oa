"use client";

import { useState, type CSSProperties } from "react";

const mono = (extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10.5,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  ...extra,
});

const btn: CSSProperties = mono({
  border: "1px solid var(--border-strong)",
  background: "var(--surface-solid)",
  color: "var(--accent-ink)",
  padding: "6px 12px",
  borderRadius: 8,
  cursor: "pointer",
});

// Owner-only toggle to publish / unpublish a briefing at /share/<token>.
export function ShareControl({
  date,
  initialToken,
}: {
  date: string;
  initialToken: string | null;
}) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const { token: t } = (await res.json()) as { token: string };
      setToken(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setToken(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!token) return;
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {token ? (
        <>
          <span style={mono({ display: "flex", alignItems: "center", gap: 7, color: "var(--text-3)", textTransform: "none" })}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />
            Public link
            <code style={{ color: "var(--text-2)" }}>/share/{token.slice(0, 8)}…</code>
          </span>
          <button onClick={copy} disabled={busy} style={btn}>
            {copied ? "Copied ✓" : "Copy link"}
          </button>
          <button onClick={disable} disabled={busy} style={mono({ ...btn, color: "var(--text-3)" })}>
            {busy ? "…" : "Disable"}
          </button>
        </>
      ) : (
        <button onClick={enable} disabled={busy} style={btn}>
          {busy ? "…" : "Share this edition"}
        </button>
      )}
      {error && <span style={mono({ color: "var(--amber)", textTransform: "none" })}>{error}</span>}
    </div>
  );
}
