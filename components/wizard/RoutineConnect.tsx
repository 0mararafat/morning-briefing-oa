"use client";

import { useState, type CSSProperties } from "react";

// Matches the subscription path of the Connect step in
// design_handoff_morning_briefing/designs/Setup Wizard.dc.html.

interface ConnectData {
  token: string;
  ingestUrl: string;
  prompt: string;
}

const mono = (extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: "uppercase",
  ...extra,
});

const labelStyle: CSSProperties = mono({ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-3)" });

function CopyRow({ value, copied, onCopy }: { value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface-solid)", overflow: "hidden" }}>
      <div style={mono({ flex: 1, minWidth: 0, padding: "11px 13px", fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", alignSelf: "center", textTransform: "none" })}>
        {value}
      </div>
      <button onClick={onCopy} style={mono({ flex: "none", border: "none", borderLeft: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--accent-ink)", padding: "0 15px", fontSize: 10.5, letterSpacing: "0.06em", cursor: "pointer" })}>
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}

export function RoutineConnect({ lastReceived }: { lastReceived: string | null }) {
  const [data, setData] = useState<ConnectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"" | "url" | "token" | "prompt">("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [regenerated, setRegenerated] = useState(false);

  async function generate(isRegen = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/routine/connect", { method: "POST" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setData(await res.json());
      if (isRegen) setRegenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function copy(which: "url" | "token" | "prompt", text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(which);
    setTimeout(() => setCopied(""), 1600);
  }

  if (!data) {
    return (
      <div style={{ maxWidth: 580 }}>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-2)", margin: "0 0 16px" }}>
          We give you three values. Paste them into a scheduled Claude routine and editions start arriving — no API key, no per-token billing.
        </p>
        <button
          onClick={() => generate()}
          disabled={loading}
          style={{ padding: "12px 20px", border: "none", borderRadius: 11, background: "var(--accent)", color: "#fff", fontFamily: "'Spectral', serif", fontSize: 15, fontWeight: 600, cursor: loading ? "wait" : "pointer", boxShadow: "0 3px 12px var(--accent-soft)" }}
        >
          {loading ? "Generating…" : "Generate routine prompt & token"}
        </button>
        {error && <p style={{ fontSize: 13.5, color: "var(--amber)", marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 580 }}>
      {/* Ingest URL */}
      <div>
        <label style={{ ...labelStyle, display: "block", marginBottom: 8 }}>Ingest URL</label>
        <CopyRow value={data.ingestUrl} copied={copied === "url"} onCopy={() => copy("url", data.ingestUrl)} />
      </div>

      {/* Secret token */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
          <label style={labelStyle}>Secret token</label>
          <span style={mono({ fontSize: 9, letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 5, background: "var(--amber-soft)", color: "var(--amber)" })}>Shown once — copy it now</span>
        </div>
        <CopyRow value={data.token} copied={copied === "token"} onCopy={() => copy("token", data.token)} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <button onClick={() => generate(true)} disabled={loading} style={mono({ border: "none", background: "transparent", color: "var(--accent-ink)", fontSize: 10.5, letterSpacing: "0.04em", cursor: "pointer", padding: 0 })}>↻ Regenerate</button>
          {regenerated && <span style={mono({ fontSize: 10, color: "var(--amber)", textTransform: "none" })}>Older token no longer works</span>}
        </div>
      </div>

      {/* Routine prompt */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9, marginBottom: 8 }}>
          <label style={labelStyle}>Routine prompt</label>
          <button onClick={() => setPromptOpen((o) => !o)} style={mono({ border: "none", background: "transparent", color: "var(--accent-ink)", fontSize: 10, letterSpacing: "0.04em", cursor: "pointer", padding: 0 })}>
            {promptOpen ? "Collapse ▲" : "Expand ▼"}
          </button>
        </div>
        <div style={{ position: "relative", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--ink-panel)", padding: "14px 15px" }}>
          <pre style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.6, color: "#cfe0f2", whiteSpace: "pre-wrap", margin: 0, paddingRight: 70, maxHeight: promptOpen ? 600 : 74, overflow: "hidden", transition: "max-height .25s ease" }}>
            {data.prompt}
          </pre>
          <button onClick={() => copy("prompt", data.prompt)} style={mono({ position: "absolute", top: 9, right: 9, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.07)", color: "#cfe0f2", padding: "5px 11px", borderRadius: 7, fontSize: 10, letterSpacing: "0.06em", cursor: "pointer" })}>
            {copied === "prompt" ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>

      {/* How to set up */}
      <div style={{ padding: "16px 18px", borderRadius: 13, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "inset 0 1px 0 var(--glass-hi)" }}>
        <div style={mono({ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-3)", marginBottom: 12 })}>How to set this up</div>
        <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            <>In Claude, create a new <strong style={{ color: "var(--text)", fontWeight: 600 }}>scheduled routine</strong>.</>,
            <>Paste the <strong style={{ color: "var(--text)", fontWeight: 600 }}>Routine prompt</strong> above as its instructions.</>,
            <>The prompt already carries your <strong style={{ color: "var(--text)", fontWeight: 600 }}>Ingest URL</strong> and <strong style={{ color: "var(--text)", fontWeight: 600 }}>Secret token</strong> so it can post each edition.</>,
            <>Schedule it just before your delivery time and save.</>,
          ].map((li, i) => (
            <li key={i} style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text-2)" }}>{li}</li>
          ))}
        </ol>
      </div>

      {/* Confirm */}
      <button onClick={() => setConfirmed((c) => !c)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderRadius: 12, border: "1px solid var(--border-strong)", background: "var(--surface-solid)", cursor: "pointer", textAlign: "left" }}>
        <span style={{ width: 22, height: 22, borderRadius: 7, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: confirmed ? "#fff" : "transparent", background: confirmed ? "var(--accent)" : "transparent", border: confirmed ? "none" : "1.5px solid var(--border-strong)", transition: "all .15s ease" }}>✓</span>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)" }}>I’ve set up my routine.</span>
      </button>

      {/* Last received */}
      <div style={mono({ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: "var(--text-3)", textTransform: "none" })}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: lastReceived ? "var(--green)" : "var(--grey-dot)" }} />
        Last received: {lastReceived ?? "—"}
      </div>

      {error && <p style={{ fontSize: 13.5, color: "var(--amber)" }}>{error}</p>}
    </div>
  );
}
