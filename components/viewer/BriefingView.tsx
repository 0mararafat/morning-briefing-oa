"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Briefing, Signal, Story } from "@/lib/generator/types";

// The canonical briefing renderer: turns a Briefing JSON object into the full
// editorial layout — masthead, the six sections, and footer. Shared by the
// dashboard, the per-date archive view, and public share pages, so it is the
// single source of truth for how an edition looks.
const mono = (extra: CSSProperties = {}): CSSProperties => ({
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: "uppercase",
  ...extra,
});

function dot(color: string, pulse = false): CSSProperties {
  return {
    width: 9,
    height: 9,
    borderRadius: "50%",
    flex: "none",
    background: color,
    ...(pulse ? { animation: "mb-pulse 2.4s infinite" } : {}),
  };
}

function priorityColor(p: Story["priority"]): string {
  return p === "urgent" ? "var(--accent)" : p === "high" ? "var(--amber)" : "var(--grey-dot)";
}

function signalColor(s: Signal["signal"]): string {
  return s === "strong" ? "var(--green)" : s === "light" ? "var(--amber)" : "var(--grey-dot)";
}

function paras(text: string): string[] {
  return (text ?? "").split("\n\n").map((p) => p.trim()).filter(Boolean);
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const WEEK_TAG: Record<string, string> = {
  critical: "var(--accent)",
  earnings: "var(--accent-ink)",
  policy: "var(--text-2)",
  defense: "var(--amber)",
  space: "var(--accent-ink)",
  data: "var(--green)",
  tech: "var(--green)",
  other: "var(--text-2)",
};

function SectionHead({ num, label, right }: { num: string; label: string; right?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
      <span style={mono({ fontSize: 11, letterSpacing: "0.2em", color: "var(--accent-ink)" })}>
        {num} — {label}
      </span>
      <span style={{ flex: 1, height: 2, background: "var(--rule)" }} />
      {right && (
        <span style={mono({ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em" })}>{right}</span>
      )}
    </div>
  );
}

export function BriefingView({ data, dateIso }: { data: Briefing; dateIso: string }) {
  const stories = data.top_stories ?? [];
  const sectors = data.sectors ?? [];
  const week = data.week_ahead ?? [];
  const patterns = data.pattern_watch ?? [];
  const deep = data.deep_dive ?? null;
  const signals = data.signal_scan ?? [];

  const sectionsPresent: Array<{ id: string; label: string }> = [];
  if (stories.length) sectionsPresent.push({ id: "sec-top", label: "Top Stories" });
  if (sectors.length) sectionsPresent.push({ id: "sec-sector", label: "Sector Scan" });
  if (week.length) sectionsPresent.push({ id: "sec-week", label: "Week Ahead" });
  if (patterns.length) sectionsPresent.push({ id: "sec-pattern", label: "Pattern Watch" });
  if (deep) sectionsPresent.push({ id: "sec-deep", label: "Deep Dive" });
  if (signals.length) sectionsPresent.push({ id: "sec-signal", label: "Signal Scan" });

  const [active, setActive] = useState(sectionsPresent[0]?.id ?? "");

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-12% 0px -78% 0px", threshold: 0 }
    );
    const els = document.querySelectorAll('section[id^="sec-"]');
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const human = new Date(dateIso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const [dow, ...rest] = human.split(", ");
  const restStr = rest.join(", ");

  const urgent = stories.filter((s) => s.priority === "urgent").length;
  const activeSectors = sectors.filter((s) => s.has_news).length;

  const num = (i: number) => String(i + 1).padStart(2, "0");
  const lead = stories[0];
  const secondaries = stories.slice(1, 4);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 28px" }}>
      {/* Masthead */}
      <header style={{ textAlign: "center", padding: "30px 0 18px", borderBottom: "3px double var(--rule)" }}>
        <div
          style={mono({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            fontSize: 10.5,
            letterSpacing: "0.1em",
            color: "var(--text-2)",
            paddingBottom: 18,
          })}
        >
          <span style={{ flex: 1, textAlign: "left" }}>{dow}</span>
          <span style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={dot("var(--green)", true)} />
            {urgent} urgent · {activeSectors}/{sectors.length} active
          </span>
          <span style={{ flex: 1, textAlign: "right" }}>{restStr}</span>
        </div>
        <div style={mono({ fontSize: 12, letterSpacing: "0.34em", color: "var(--accent-ink)", marginBottom: 6 })}>
          The
        </div>
        <h1 style={{ fontSize: 64, lineHeight: 0.94, fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>
          Morning Briefing
        </h1>
      </header>

      {/* Sticky section nav (scroll-spy) */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 22,
          padding: "12px 0",
          background: "var(--bg)",
          borderBottom: "1px solid var(--rule)",
          marginBottom: 30,
        }}
      >
        {sectionsPresent.map((s) => {
          const on = active === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setActive(s.id)}
              style={mono({
                fontSize: 11,
                letterSpacing: "0.12em",
                textDecoration: "none",
                paddingBottom: 3,
                color: on ? "var(--accent-ink)" : "var(--text)",
                fontWeight: on ? 600 : 400,
                borderBottom: on ? "2px solid var(--accent)" : "2px solid transparent",
              })}
            >
              {s.label}
            </a>
          );
        })}
      </nav>

      {/* 01 Top Stories */}
      {lead && (
        <section id="sec-top" style={{ scrollMarginTop: 54, marginBottom: 60 }}>
          <SectionHead num="01" label="Top Stories" />
          <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 30 }}>
            <article style={{ borderRight: "1px solid var(--border)", paddingRight: 30 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={mono({ fontSize: 10, letterSpacing: "0.1em", padding: "3px 8px", borderRadius: 5, background: "var(--accent-soft)", color: "var(--accent-ink)" })}>
                  {lead.sector}
                </span>
                <span style={mono({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--green)", letterSpacing: "0.08em" })}>
                  <span style={dot("var(--green)", true)} />
                  Lead
                </span>
              </div>
              <h2 style={{ fontSize: 36, lineHeight: 1.08, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
                {lead.headline}
              </h2>
              {paras(lead.detail).map((p, i) => (
                <p key={i} style={{ fontSize: i === 0 ? 16.5 : 16, lineHeight: 1.65, color: i === 0 ? "var(--text)" : "var(--text-2)", margin: "0 0 14px" }}>
                  {i === 0 ? (
                    <>
                      <span style={{ float: "left", fontSize: 58, lineHeight: 0.78, fontWeight: 700, padding: "5px 11px 0 0", color: "var(--accent-ink)" }}>
                        {p.charAt(0)}
                      </span>
                      {p.slice(1)}
                    </>
                  ) : (
                    p
                  )}
                </p>
              ))}
              {lead.sources?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, borderTop: "1px solid var(--border)", paddingTop: 13 }}>
                  {lead.sources.map((src, i) => (
                    <a key={i} href={src.url} target="_blank" rel="noopener" style={mono({ fontSize: 11, letterSpacing: "0.04em", color: "var(--text-2)", textDecoration: "none", textTransform: "none" })}>
                      {src.name} ↗
                    </a>
                  ))}
                </div>
              )}
            </article>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {secondaries.map((st, i) => (
                <article
                  key={i}
                  style={{
                    paddingBottom: 15,
                    marginBottom: 15,
                    borderBottom: i < secondaries.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                    <span style={mono({ fontSize: 12, fontWeight: 600, color: "var(--text-3)" })}>{num(i + 1)}</span>
                    <span style={dot(priorityColor(st.priority))} />
                    <span style={mono({ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--text-3)" })}>{st.sector}</span>
                  </div>
                  <h3 style={{ fontSize: 19, lineHeight: 1.24, fontWeight: 600, letterSpacing: "-0.01em", margin: "0 0 7px" }}>
                    {st.headline}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-2)", margin: "0 0 9px" }}>{st.one_liner}</p>
                  {st.sources?.[0] && (
                    <a href={st.sources[0].url} target="_blank" rel="noopener" style={mono({ fontSize: 10.5, letterSpacing: "0.04em", color: "var(--text-3)", textDecoration: "none", textTransform: "none" })}>
                      {st.sources[0].name} ↗
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 02 Sector Scan */}
      {sectors.length > 0 && (
        <section id="sec-sector" style={{ scrollMarginTop: 54, marginBottom: 60 }}>
          <SectionHead num="02" label="Sector Scan" right="At a glance" />
          <div style={{ borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 36px" }}>
            {sectors.map((sec, i) => (
              <div key={i} style={{ padding: "14px 2px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={dot(sec.has_news ? "var(--green)" : "var(--grey-dot)", sec.has_news)} />
                  <h3 style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>{sec.name}</h3>
                </div>
                {sec.summary && (
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-2)", margin: 0 }}>{sec.summary}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 03 Week Ahead */}
      {week.length > 0 && (
        <section id="sec-week" style={{ scrollMarginTop: 54, marginBottom: 60 }}>
          <SectionHead num="03" label="The Week Ahead" />
          <div style={{ borderTop: "1px solid var(--border)" }}>
            {week.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 20, padding: "13px 2px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                <div style={{ flex: "none", width: 70 }}>
                  <span style={mono({ fontSize: 12, letterSpacing: "0.06em", color: "var(--text-2)" })}>{d.day}</span>
                </div>
                <span
                  style={mono({
                    fontSize: 9,
                    letterSpacing: "0.08em",
                    padding: "3px 8px",
                    borderRadius: 4,
                    flex: "none",
                    color: "#fff",
                    background: WEEK_TAG[d.tag] ?? "var(--text-2)",
                  })}
                >
                  {d.tag}
                </span>
                <span style={{ fontSize: 15, color: "var(--text)", flex: 1 }}>{d.event}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 04 Pattern Watch */}
      {patterns.length > 0 && (
        <section id="sec-pattern" style={{ scrollMarginTop: 54, marginBottom: 60 }}>
          <SectionHead num="04" label="Pattern Watch" right="Speculative" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {patterns.map((p, i) => (
              <article
                key={i}
                style={{
                  borderRadius: 16,
                  padding: "22px 24px",
                  background: "var(--surface)",
                  backdropFilter: "blur(20px) saturate(1.3)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.3)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow), inset 0 1px 0 var(--glass-hi)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Speculative tint — soft blue glow in the top corner. */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: "radial-gradient(380px 180px at 92% -30%, var(--accent-soft), transparent 70%)",
                  }}
                />
                <div style={{ position: "relative" }}>
                  <div style={mono({ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--accent-ink)", marginBottom: 10, borderBottom: "1px solid var(--border)", paddingBottom: 10 })}>
                    {p.subtitle || "Analysis — hold loosely"}
                  </div>
                  <h3 style={{ fontSize: 20, lineHeight: 1.26, fontWeight: 600, letterSpacing: "-0.01em", margin: "0 0 9px", color: "var(--text)" }}>
                    {p.title}
                  </h3>
                  {paras(p.content).map((para, j) => (
                    <p key={j} style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-2)", margin: "0 0 8px" }}>
                      {para}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 05 Deep Dive */}
      {deep && (
        <section id="sec-deep" style={{ scrollMarginTop: 54, marginBottom: 60 }}>
          <SectionHead num="05" label="Deep Dive" right={`${deep.sources?.length ?? 0} sources`} />
          <article style={{ maxWidth: 680, margin: "0 auto" }}>
            <h2 style={{ fontSize: 33, lineHeight: 1.12, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 12px", textAlign: "center" }}>
              {deep.headline}
            </h2>
            <div style={mono({ textAlign: "center", fontSize: 10.5, letterSpacing: "0.1em", color: "var(--text-3)", marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid var(--rule)" })}>
              {deep.why_today || deep.standfirst}
            </div>
            {paras(deep.body).map((p, i) => (
              <p key={i} style={{ fontSize: 17, lineHeight: 1.75, color: i === 0 ? "var(--text)" : "var(--text-2)", margin: "0 0 18px" }}>
                {i === 0 ? (
                  <>
                    <span style={{ float: "left", fontSize: 62, lineHeight: 0.76, fontWeight: 700, padding: "6px 12px 0 0", color: "var(--accent-ink)" }}>
                      {p.charAt(0)}
                    </span>
                    {p.slice(1)}
                  </>
                ) : (
                  p
                )}
              </p>
            ))}
            {deep.standfirst && (
              <blockquote style={{ margin: "8px 0 24px", padding: "18px 0", borderTop: "2px solid var(--rule)", borderBottom: "2px solid var(--rule)", textAlign: "center" }}>
                <p style={{ fontSize: 21, lineHeight: 1.4, fontWeight: 500, fontStyle: "italic", color: "var(--text)", margin: 0 }}>
                  “{deep.standfirst}”
                </p>
              </blockquote>
            )}
            {deep.sources?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
                {deep.sources.map((src, i) => (
                  <a key={i} href={src.url} target="_blank" rel="noopener" style={mono({ fontSize: 11, letterSpacing: "0.04em", color: "var(--text-2)", textDecoration: "none", textTransform: "none" })}>
                    {src.name} ↗
                  </a>
                ))}
              </div>
            )}
          </article>
        </section>
      )}

      {/* 06 Signal Scan */}
      {signals.length > 0 && (
        <section id="sec-signal" style={{ scrollMarginTop: 54, marginBottom: 60 }}>
          <SectionHead num="06" label="Signal Scan" right={`${signals.length} voices`} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 36px", borderTop: "1px solid var(--border)" }}>
            {signals.map((v, i) => (
              <article key={i} style={{ display: "flex", gap: 13, padding: "16px 2px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ position: "relative", flex: "none" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bg-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", ...mono({ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }) }}>
                    {initials(v.name)}
                  </div>
                  <span style={{ position: "absolute", right: -1, bottom: -1, width: 12, height: 12, borderRadius: "50%", background: signalColor(v.signal), border: "2px solid var(--bg)", ...(v.signal === "strong" ? { animation: "mb-pulse 2.4s infinite" } : {}) }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{v.name}</span>
                    {v.handle && <span style={mono({ fontSize: 9.5, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "none" })}>{v.handle}</span>}
                  </div>
                  {v.summary && <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text-2)", margin: "5px 0 7px" }}>{v.summary}</p>}
                  {v.latest_title && v.url && (
                    <a href={v.url} target="_blank" rel="noopener" style={mono({ fontSize: 10, letterSpacing: "0.04em", color: "var(--text-3)", textDecoration: "none", textTransform: "none" })}>
                      {v.latest_title} ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer style={{ textAlign: "center", padding: "40px 0 60px", marginTop: 10, borderTop: "3px double var(--rule)" }}>
        <div style={mono({ fontSize: 10, letterSpacing: "0.16em", color: "var(--text-3)" })}>End of edition</div>
      </footer>
    </div>
  );
}
