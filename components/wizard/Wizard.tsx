"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { ConfigInput } from "@/lib/config-schema";

// Rebuilt to match design_handoff_morning_briefing/designs/Setup Wizard.dc.html:
// glass card, top progress bar, numbered stepper, kicker/title/sub header, the
// per-step editors, and a Back / dots / Continue footer. Connect stays a
// separate server-backed page, so the wizard's final step is Review.

const STEPS = ["Topics", "Sources", "Sections", "Voices", "Schedule", "Mode", "Review"] as const;

const TITLES: Array<[string, string]> = [
  ["What do you want to follow?", "Add the themes that matter. Use ▲▼ to rank them — priority shapes your briefing."],
  ["Where should it read from?", "Pick trusted sources, or add your own by name or URL."],
  ["Which sections appear?", "Toggle the parts of your daily edition on or off."],
  ["Whose signal do you track?", "Follow specific people; we surface when they say something new."],
  ["When does it arrive?", "Choose a time, timezone and the days you want delivery."],
  ["How should it run?", "Pick how your briefing is generated."],
  ["Looks good?", "Review your edition, then start your mornings."],
];

const SECTION_ROWS: Array<[keyof ConfigInput["sections"], string, string]> = [
  ["top_stories", "Top Stories", "The 4–5 biggest developments across your topics, ranked by urgency with the full context and linked sources."],
  ["sector_scan", "Sector Scan", "An at-a-glance grid of every topic you follow, each flagged for whether there’s fresh news today and a one-line summary."],
  ["week_ahead", "Week Ahead", "What’s coming up — earnings, product launches, economic data, hearings and other scheduled events on your radar."],
  ["pattern_watch", "Pattern Watch", "Speculative, connect-the-dots analysis that links separate stories into the bigger themes worth watching. Held loosely."],
  ["deep_dive", "Deep Dive", "One long-form, sourced essay each day that goes deep on a single story or theme that deserves more than a headline."],
  ["signal_scan", "Signal Scan", "What the specific people you follow have said recently, summarised with a note on why it matters to you."],
];

// Day chips render Mon→Sun; values are 0=Sun..6=Sat to match the schema.
const DAYS: Array<[string, number]> = [
  ["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6], ["Sun", 0],
];

const mono = (extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: "uppercase",
  ...extra,
});

const label: CSSProperties = mono({
  display: "block",
  fontSize: 10,
  letterSpacing: "0.1em",
  color: "var(--text-3)",
  marginBottom: 8,
});

const field: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-solid)",
  color: "var(--text)",
  fontFamily: "'Spectral', serif",
  fontSize: 15,
  outline: "none",
};

function initials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "—";
}

function voiceLinks(v: ConfigInput["voices"][number]): string[] {
  const out: string[] = [];
  if (v.x_handle) out.push(`@${v.x_handle}`);
  if (v.rss) out.push("RSS");
  if (!v.x_handle && !v.rss && v.search_query) out.push("search");
  return out;
}

export function Wizard({
  initial,
  presetSources,
  timezones,
}: {
  initial: ConfigInput;
  presetSources: string[];
  timezones: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [cfg, setCfg] = useState<ConfigInput>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceDraft, setSourceDraft] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [voiceLink, setVoiceLink] = useState("");

  const set = <K extends keyof ConfigInput>(key: K, value: ConfigInput[K]) =>
    setCfg((c) => ({ ...c, [key]: value }));

  // ── Topics ────────────────────────────────────────────────────────────────
  const moveTopic = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cfg.topics.length) return;
    const topics = [...cfg.topics];
    [topics[i], topics[j]] = [topics[j], topics[i]];
    set("topics", topics);
  };
  const updateTopic = (i: number, f: "name" | "description", value: string) => {
    const topics = [...cfg.topics];
    topics[i] = { ...topics[i], [f]: value };
    set("topics", topics);
  };

  // ── Sources ───────────────────────────────────────────────────────────────
  const presetSet = new Set(presetSources);
  const customChips = cfg.sources.preferred.filter((s) => !presetSet.has(s));
  const togglePreferred = (s: string) => {
    const has = cfg.sources.preferred.includes(s);
    set("sources", {
      ...cfg.sources,
      preferred: has ? cfg.sources.preferred.filter((x) => x !== s) : [...cfg.sources.preferred, s],
    });
  };
  const addSource = () => {
    const v = sourceDraft.trim();
    if (!v || cfg.sources.preferred.includes(v)) return setSourceDraft("");
    set("sources", { ...cfg.sources, preferred: [...cfg.sources.preferred, v] });
    setSourceDraft("");
  };

  // ── Voices ────────────────────────────────────────────────────────────────
  const addVoice = () => {
    const n = voiceName.trim();
    if (!n) return;
    const link = voiceLink.trim();
    const isHandle = link.startsWith("@") || (/^[A-Za-z0-9_]+$/.test(link) && link.length > 0);
    const isUrl = /[./:]/.test(link);
    set("voices", [
      ...cfg.voices,
      {
        name: n,
        rss: link && isUrl && !link.startsWith("@") ? link : null,
        x_handle: link && (isHandle && !isUrl) ? link.replace(/^@/, "") : null,
      },
    ]);
    setVoiceName("");
    setVoiceLink("");
  };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      router.push("/setup/connect");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  const last = step === STEPS.length - 1;
  const progress = `${((step + 1) / STEPS.length) * 100}%`;

  const selectedSources = cfg.sources.preferred;
  const onSections = SECTION_ROWS.filter(([k]) => cfg.sections[k]).map(([, l]) => l);
  const tzShort = cfg.timezone.split("/").pop()?.replace(/_/g, " ") ?? cfg.timezone;
  const dayNames = DAYS.filter(([, n]) => cfg.days.includes(n)).map(([l]) => l).join(" ");

  return (
    <div
      style={{
        borderRadius: 20,
        background: "var(--surface)",
        backdropFilter: "blur(22px) saturate(1.3)",
        WebkitBackdropFilter: "blur(22px) saturate(1.3)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow), inset 0 1px 0 var(--glass-hi)",
        overflow: "hidden",
      }}
    >
      {/* progress bar */}
      <div style={{ height: 4, background: "var(--bg-2)" }}>
        <div style={{ height: "100%", background: "var(--accent)", borderRadius: "0 3px 3px 0", width: progress, transition: "width .35s ease" }} />
      </div>

      {/* stepper */}
      <div style={{ display: "flex", gap: 4, padding: "16px 22px 4px", overflowX: "auto" }}>
        {STEPS.map((s, i) => {
          const cur = i === step;
          const doneStep = i < step;
          return (
            <button
              key={s}
              onClick={() => setStep(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 11px",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: cur ? "var(--accent-soft)" : "transparent",
              }}
            >
              <span
                style={mono({
                  width: 21,
                  height: 21,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10.5,
                  fontWeight: 600,
                  flex: "none",
                  background: cur || doneStep ? "var(--accent)" : "var(--bg-2)",
                  color: cur || doneStep ? "#fff" : "var(--text-3)",
                  border: cur || doneStep ? "none" : "1px solid var(--border)",
                })}
              >
                {i + 1}
              </span>
              <span style={mono({ fontSize: 11, letterSpacing: "0.04em", color: cur ? "var(--accent-ink)" : "var(--text-3)", fontWeight: cur ? 600 : 400 })}>
                {s}
              </span>
            </button>
          );
        })}
      </div>

      {/* header */}
      <div style={{ padding: "18px 30px 8px" }}>
        <div style={mono({ fontSize: 11, letterSpacing: "0.14em", color: "var(--accent-ink)", marginBottom: 9 })}>
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </div>
        <h2 style={{ fontSize: 27, lineHeight: 1.15, fontWeight: 600, letterSpacing: "-0.015em", margin: "0 0 6px" }}>
          {TITLES[step][0]}
        </h2>
        <p style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--text-2)", margin: 0 }}>{TITLES[step][1]}</p>
      </div>

      <div style={{ padding: "22px 30px 26px", minHeight: 280 }}>
        {/* ── Topics ── */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cfg.topics.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 13, background: "var(--surface-solid)", border: "1px solid var(--border)" }}>
                <span style={mono({ flex: "none", width: 24, height: 24, borderRadius: 7, background: "var(--accent-soft)", color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 })}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <input
                    value={t.name}
                    onChange={(e) => updateTopic(i, "name", e.target.value)}
                    placeholder="Topic name"
                    style={{ border: "none", background: "transparent", color: "var(--text)", fontFamily: "'Spectral', serif", fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em", outline: "none", width: "100%", padding: "3px 5px", borderRadius: 6 }}
                  />
                  <input
                    value={t.description}
                    onChange={(e) => updateTopic(i, "description", e.target.value)}
                    placeholder="Short description"
                    style={{ border: "none", background: "transparent", color: "var(--text-3)", fontFamily: "'Spectral', serif", fontSize: 13, outline: "none", width: "100%", padding: "3px 5px", borderRadius: 6 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 3, flex: "none", alignItems: "center" }}>
                  <button onClick={() => moveTopic(i, -1)} title="Move up" style={iconBtn}>▲</button>
                  <button onClick={() => moveTopic(i, 1)} title="Move down" style={iconBtn}>▼</button>
                  <button onClick={() => set("topics", cfg.topics.filter((_, x) => x !== i))} title="Remove" style={{ ...iconBtn, fontSize: 15, color: "var(--text-3)" }}>×</button>
                </div>
              </div>
            ))}
            <button
              onClick={() => set("topics", [...cfg.topics, { name: "", description: "" }])}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 13, border: "1px dashed var(--border-strong)", background: "transparent", color: "var(--accent-ink)", fontFamily: "'Spectral', serif", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}
            >
              + Add a topic
            </button>
            <div style={mono({ fontSize: 11, color: "var(--text-3)", marginTop: 2, display: "flex", alignItems: "center", gap: 7, textTransform: "none" })}>
              <span style={{ color: "var(--accent-ink)" }}>↕</span> Type to edit — use ▲▼ to set priority.
            </div>
          </div>
        )}

        {/* ── Sources ── */}
        {step === 1 && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 18 }}>
              {presetSources.map((s) => {
                const on = cfg.sources.preferred.includes(s);
                return (
                  <button key={s} onClick={() => togglePreferred(s)} style={chip(on)}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: on ? "var(--accent)" : "var(--text-3)" }} />
                    {s}
                  </button>
                );
              })}
              {customChips.map((s) => (
                <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 10px 8px 14px", borderRadius: 999, border: "1px solid var(--accent)", background: "var(--accent-soft)", color: "var(--accent-ink)", fontSize: 14 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                  {s}
                  <button onClick={() => togglePreferred(s)} style={{ border: "none", background: "transparent", color: "var(--accent-ink)", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 2px" }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 9, maxWidth: 420 }}>
              <input
                value={sourceDraft}
                onChange={(e) => setSourceDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addSource(); }}
                placeholder="Add your own — name or URL"
                style={{ ...field, flex: 1, padding: "11px 14px", borderRadius: 10, fontSize: 14.5 }}
              />
              <button onClick={addSource} style={inkBtn}>Add</button>
            </div>
            {cfg.sources.supplementary.length > 0 && (
              <p style={mono({ marginTop: 16, fontSize: 10.5, letterSpacing: "0.06em", color: "var(--text-3)", textTransform: "none" })}>
                Supplementary (used only when needed): {cfg.sources.supplementary.join(", ")}
              </p>
            )}
          </div>
        )}

        {/* ── Sections ── */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SECTION_ROWS.map(([key, name, desc]) => {
              const on = cfg.sections[key];
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 4px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em" }}>{name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.4 }}>{desc}</div>
                  </div>
                  <button
                    onClick={() => set("sections", { ...cfg.sections, [key]: !on })}
                    aria-pressed={on}
                    style={{ width: 46, height: 27, borderRadius: 999, flex: "none", border: "none", padding: 0, background: on ? "var(--accent)" : "var(--border-strong)", position: "relative", cursor: "pointer", transition: "background .2s ease" }}
                  >
                    <span style={{ position: "absolute", top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: "50%", background: "#fff", transition: "left .2s ease", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Voices ── */}
        {step === 3 && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <label style={mono({ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 10, letterSpacing: "0.08em", color: "var(--text-3)" })}>
                Frequency
                <select
                  value={cfg.signalScanFrequency}
                  onChange={(e) => set("signalScanFrequency", e.target.value as "weekly" | "daily")}
                  style={{ ...field, width: "auto", padding: "7px 10px", borderRadius: 8, fontSize: 13 }}
                >
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </label>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              {cfg.voices.map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 15px", borderRadius: 13, background: "var(--surface-solid)", border: "1px solid var(--border)" }}>
                  <div style={mono({ width: 38, height: 38, borderRadius: "50%", background: "var(--bg-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "var(--text-2)", flex: "none" })}>
                    {initials(v.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{v.name}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {voiceLinks(v).map((lk) => (
                        <span key={lk} style={mono({ fontSize: 10, color: "var(--text-3)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 7px", textTransform: "none" })}>
                          {lk}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => set("voices", cfg.voices.filter((_, x) => x !== i))} style={{ ...iconBtn, fontSize: 15, color: "var(--text-3)" }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ padding: 15, borderRadius: 13, border: "1px dashed var(--border-strong)", background: "var(--surface)" }}>
              <div style={mono({ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-3)", marginBottom: 10 })}>Track a new voice</div>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                <input value={voiceName} onChange={(e) => setVoiceName(e.target.value)} placeholder="Name" style={{ ...field, flex: 1, minWidth: 130, padding: "10px 13px", borderRadius: 9, fontSize: 14 }} />
                <input value={voiceLink} onChange={(e) => setVoiceLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addVoice(); }} placeholder="Link (@handle, blog, RSS)" style={{ ...field, flex: 1.4, minWidth: 150, padding: "10px 13px", borderRadius: 9, fontSize: 14 }} />
                <button onClick={addVoice} style={{ ...inkBtn, padding: "10px 16px", borderRadius: 9, fontSize: 14 }}>Add</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Schedule ── */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={label}>Delivery time</label>
                <input type="time" value={cfg.time} onChange={(e) => set("time", e.target.value)} style={field} />
              </div>
              <div style={{ flex: 1.4, minWidth: 200 }}>
                <label style={label}>Timezone</label>
                <select value={cfg.timezone} onChange={(e) => set("timezone", e.target.value)} style={{ ...field, cursor: "pointer" }}>
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label style={label}>Days</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DAYS.map(([d, n]) => {
                  const on = cfg.days.includes(n);
                  return (
                    <button
                      key={d}
                      onClick={() => set("days", on ? cfg.days.filter((x) => x !== n) : [...cfg.days, n])}
                      style={mono({ minWidth: 52, padding: "10px 4px", borderRadius: 10, cursor: "pointer", fontSize: 12, letterSpacing: "0.04em", border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`, background: on ? "var(--accent-soft)" : "var(--surface-solid)", color: on ? "var(--accent-ink)" : "var(--text-2)", fontWeight: on ? 600 : 400, transition: "all .12s ease" })}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Mode ── */}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {(["API_KEY", "CLAUDE_ROUTINE"] as const).map((m) => {
                const on = cfg.mode === m;
                const isKey = m === "API_KEY";
                return (
                  <button key={m} onClick={() => set("mode", m)} style={modeCard(on)}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={mono({ width: 38, height: 38, borderRadius: 11, background: "var(--accent-soft)", color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isKey ? 15 : 17, fontWeight: 600 })}>
                        {isKey ? "{ }" : "✦"}
                      </div>
                      <span style={check(on)}>✓</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                      <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
                        {isKey ? "Use my own API key" : "Use my Claude subscription"}
                      </span>
                      {!isKey && (
                        <span style={mono({ fontSize: 9, letterSpacing: "0.08em", padding: "2px 7px", borderRadius: 5, background: "var(--green-soft)", color: "var(--green)" })}>Routine</span>
                      )}
                    </div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-2)", margin: 0 }}>
                      {isKey
                        ? "Bring your Anthropic key. Full control over models and limits — you pay the provider directly. Best for power users."
                        : "No key, no setup. Your briefing is generated on a routine using your existing Claude subscription. Easiest way to start."}
                    </p>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 13, alignItems: "flex-start", padding: "15px 17px", borderRadius: 14, background: "var(--accent-soft-2)", border: "1px solid var(--accent-soft)" }}>
              <span style={mono({ width: 30, height: 30, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flex: "none" })}>
                {cfg.mode === "API_KEY" ? "{ }" : "✦"}
              </span>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 3 }}>
                  {cfg.mode === "API_KEY" ? "Own API key — full control" : "Claude subscription — zero secrets to store"}
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text-2)" }}>
                  {cfg.mode === "API_KEY"
                    ? "You’ll add one secret on the next screen. You pick the model and pay your provider directly."
                    : "You’ll copy three values into a scheduled Claude routine. Nothing sensitive to keep."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Review ── */}
        {step === 6 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {([
              ["Topics", cfg.topics.map((t) => t.name).filter(Boolean).join(" › ") || "None", 0],
              ["Sources", selectedSources.join(", ") || "None", 1],
              ["Sections", `${onSections.join(", ") || "None"} (${onSections.length}/6)`, 2],
              ["Voices", `${cfg.voices.map((v) => v.name).join(", ") || "None"} · ${cfg.signalScanFrequency}`, 3],
              ["Schedule", `${cfg.time} · ${tzShort} · ${dayNames || "no days"}`, 4],
              ["Mode", cfg.mode === "API_KEY" ? "Own API key" : "Claude subscription (routine)", 5],
            ] as Array<[string, string, number]>).map(([l, v, target]) => (
              <div key={l} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", borderRadius: 13, background: "var(--surface-solid)", border: "1px solid var(--border)" }}>
                <div style={mono({ flex: "none", width: 104, fontSize: 10, letterSpacing: "0.08em", color: "var(--text-3)", paddingTop: 2 })}>{l}</div>
                <div style={{ flex: 1, fontSize: 14.5, lineHeight: 1.5, color: "var(--text)" }}>{v}</div>
                <button onClick={() => setStep(target)} style={mono({ flex: "none", border: "none", background: "transparent", color: "var(--accent-ink)", fontSize: 11, cursor: "pointer", letterSpacing: "0.06em" })}>Edit</button>
              </div>
            ))}
            {error && <p style={{ fontSize: 13.5, color: "var(--amber)" }}>{error}</p>}
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 30px", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          style={{ padding: "12px 18px", borderRadius: 11, border: "1px solid var(--border-strong)", background: "var(--surface-solid)", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: step === 0 ? "not-allowed" : "pointer", opacity: step === 0 ? 0.4 : 1 }}
        >
          ← Back
        </button>
        <div style={{ display: "flex", gap: 5 }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 999, background: i <= step ? "var(--accent)" : "var(--border-strong)", transition: "all .25s ease" }} />
          ))}
        </div>
        <button
          onClick={() => (last ? save() : setStep((s) => Math.min(STEPS.length - 1, s + 1)))}
          disabled={saving}
          style={{ padding: "12px 22px", border: "none", borderRadius: 11, background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: saving ? "wait" : "pointer", boxShadow: "0 3px 12px var(--accent-soft)", opacity: saving ? 0.7 : 1 }}
        >
          {last ? (saving ? "Saving…" : "Start my mornings →") : "Continue →"}
        </button>
      </div>
    </div>
  );
}

const iconBtn: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 7,
  border: "1px solid var(--border)",
  background: "var(--surface-solid)",
  color: "var(--text-2)",
  cursor: "pointer",
  fontSize: 11,
};

const inkBtn: CSSProperties = {
  padding: "11px 18px",
  border: "none",
  borderRadius: 10,
  background: "var(--text)",
  color: "var(--bg)",
  fontFamily: "'Spectral', serif",
  fontSize: 14.5,
  fontWeight: 600,
  cursor: "pointer",
};

function chip(on: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 14px",
    borderRadius: 999,
    cursor: "pointer",
    fontFamily: "'Spectral', serif",
    fontSize: 14,
    border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
    background: on ? "var(--accent-soft)" : "transparent",
    color: on ? "var(--accent-ink)" : "var(--text-2)",
    transition: "all .12s ease",
  };
}

function modeCard(on: boolean): CSSProperties {
  return {
    textAlign: "left",
    cursor: "pointer",
    padding: 20,
    borderRadius: 15,
    background: on ? "var(--accent-soft)" : "var(--surface-solid)",
    border: `1.5px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
    boxShadow: on ? "0 4px 18px var(--accent-soft)" : "var(--shadow-sm)",
    transition: "all .15s ease",
  };
}

function check(on: boolean): CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    background: on ? "var(--accent)" : "transparent",
    color: "#fff",
    border: on ? "none" : "1.5px solid var(--border-strong)",
  };
}
