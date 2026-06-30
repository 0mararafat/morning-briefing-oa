"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ScheduleControl } from "@/components/ScheduleControl";
import { RunProgress } from "@/components/RunProgress";

// Matches the API-key path of the Connect step in
// design_handoff_morning_briefing/designs/Setup Wizard.dc.html.

const mono = (extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: "uppercase",
  ...extra,
});

export function ApiKeyConnect({
  initialLast4,
  initialEnabled,
}: {
  initialLast4: string | null;
  initialEnabled: boolean;
}) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [last4, setLast4] = useState(initialLast4);
  const [show, setShow] = useState(false);
  const [test, setTest] = useState<"idle" | "testing" | "ok" | "err">("idle");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);

  const canSave = key.trim().length > 0;

  function runTest() {
    setTest("testing");
    setTimeout(() => {
      const k = key.trim();
      setTest(k.startsWith("sk-") && k.length >= 12 ? "ok" : "err");
    }, 800);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Save failed");
      setLast4(body.last4);
      setKey("");
      setTest("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function runNow() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/run", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not start generation");
      }
      setRunning(true); // hand off to the full-screen loading overlay
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (running) return <RunProgress />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
      {last4 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 16px", borderRadius: 13, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm), inset 0 1px 0 var(--glass-hi)" }}>
          <span style={{ width: 32, height: 32, borderRadius: 9, background: "var(--green-soft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flex: "none" }}>✓</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={mono({ fontSize: 13, letterSpacing: "0.12em", color: "var(--text)", textTransform: "none" })}>•••••••• {last4}</div>
            <div style={mono({ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.06em", marginTop: 2 })}>Saved &amp; encrypted</div>
          </div>
          <button onClick={() => setLast4(null)} style={mono({ border: "1px solid var(--border-strong)", background: "var(--surface-solid)", color: "var(--text-2)", borderRadius: 9, padding: "7px 12px", fontSize: 10, letterSpacing: "0.06em", cursor: "pointer" })}>Replace</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={mono({ display: "block", fontSize: 10, letterSpacing: "0.1em", color: "var(--text-3)", marginBottom: 8 })}>Anthropic API key</label>
          <div style={{ display: "flex", gap: 9, alignItems: "stretch", flexWrap: "wrap" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", flex: 1, minWidth: 240 }}>
              <input
                type={show ? "text" : "password"}
                value={key}
                onChange={(e) => { setKey(e.target.value); setTest("idle"); }}
                placeholder="sk-ant-…"
                style={{ width: "100%", padding: "12px 60px 12px 14px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface-solid)", color: "var(--text)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, outline: "none" }}
              />
              <button onClick={() => setShow((s) => !s)} title="Show / hide" style={mono({ position: "absolute", right: 8, padding: "6px 9px", border: "none", background: "transparent", color: "var(--text-3)", fontSize: 10.5, letterSpacing: "0.06em", cursor: "pointer" })}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
            <button onClick={runTest} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontFamily: "'Spectral', serif", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Test key</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9, minHeight: 18 }}>
            {test === "testing" && <span style={mono({ fontSize: 11, color: "var(--text-3)", textTransform: "none" })}>Testing…</span>}
            {test === "ok" && (
              <span style={mono({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, letterSpacing: "0.06em", padding: "3px 9px", borderRadius: 6, background: "var(--green-soft)", color: "var(--green)" })}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />Key looks valid
              </span>
            )}
            {test === "err" && (
              <span style={mono({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, letterSpacing: "0.06em", padding: "3px 9px", borderRadius: 6, background: "var(--amber-soft)", color: "var(--amber)" })}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)" }} />Couldn’t validate — check it
              </span>
            )}
          </div>
          <div style={mono({ fontSize: 10.5, color: "var(--text-3)", marginTop: 9, lineHeight: 1.5, textTransform: "none" })}>
            Stored encrypted. We only ever display the last 4 characters.
          </div>
          <button
            onClick={save}
            disabled={!canSave || busy}
            style={{ marginTop: 14, alignSelf: "flex-start", padding: "11px 18px", border: "none", borderRadius: 10, background: "var(--text)", color: "var(--bg)", fontFamily: "'Spectral', serif", fontSize: 14.5, fontWeight: 600, cursor: canSave && !busy ? "pointer" : "not-allowed", opacity: canSave && !busy ? 1 : 0.4 }}
          >
            {busy ? "Saving…" : "Save key"}
          </button>
        </div>
      )}

      <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text-2)" }}>Your briefing runs automatically on the schedule you set.</div>

      {last4 && <ScheduleControl initialEnabled={initialEnabled} />}

      {last4 && (
        <button
          onClick={runNow}
          disabled={busy}
          style={{ alignSelf: "flex-start", padding: "11px 18px", border: "none", borderRadius: 11, background: "var(--accent)", color: "#fff", fontFamily: "'Spectral', serif", fontSize: 14.5, fontWeight: 600, cursor: busy ? "wait" : "pointer", boxShadow: "0 3px 12px var(--accent-soft)" }}
        >
          Run now →
        </button>
      )}

      {status && <p style={{ fontSize: 13.5, color: "var(--green)" }}>{status}</p>}
      {error && <p style={{ fontSize: 13.5, color: "var(--amber)" }}>{error}</p>}
    </div>
  );
}
