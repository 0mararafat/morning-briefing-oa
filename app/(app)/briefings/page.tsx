import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listBriefings, type ArchiveEntry } from "@/lib/briefings";

const mono = {
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: "uppercase" as const,
};

function statusColor(e: ArchiveEntry): string {
  if (e.urgent > 0) return "var(--green)";
  if (e.activeSectors > 0) return "var(--amber)";
  return "var(--grey-dot)";
}

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const entries = await listBriefings(session.user.id);

  // Group by "Month YYYY".
  const groups = new Map<string, ArchiveEntry[]>();
  for (const e of entries) {
    const d = new Date(e.date + "T00:00:00");
    const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 28px" }}>
      <header style={{ padding: "42px 0 26px", borderBottom: "3px double var(--rule)" }}>
        <div style={{ ...mono, fontSize: 11, letterSpacing: "0.2em", color: "var(--accent-ink)", marginBottom: 14 }}>
          Your back issues
        </div>
        <h1 style={{ fontSize: 46, lineHeight: 1.02, fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 18px" }}>
          The Archive
        </h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 28 }}>
          <Stat value={String(entries.length)} label="editions" />
          <Stat value={String(entries.reduce((n, e) => n + e.urgent, 0))} label="urgent stories" />
          <Stat value={entries.length ? entries[entries.length - 1].date : "—"} label="first edition" />
        </div>
      </header>

      {entries.length === 0 ? (
        <p style={{ color: "var(--text-2)", padding: "30px 0" }}>
          Past briefings will appear here once your first edition is generated.
        </p>
      ) : (
        [...groups.entries()].map(([month, items]) => (
          <div key={month} style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "0 0 4px" }}>
              <span style={{ ...mono, fontSize: 11, letterSpacing: "0.18em", color: "var(--text-3)" }}>{month}</span>
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ ...mono, fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em" }}>
                {items.length} editions
              </span>
            </div>
            {items.map((e) => {
              const d = new Date(e.date + "T00:00:00");
              const dow = d.toLocaleDateString("en-US", { weekday: "short" });
              const day = d.toLocaleDateString("en-US", { day: "2-digit" });
              return (
                <Link
                  key={e.date}
                  href={`/briefings/${e.date}`}
                  style={{ textDecoration: "none", color: "inherit", display: "flex", gap: 22, padding: "20px 12px", borderBottom: "1px solid var(--border)" }}
                >
                  <div style={{ flex: "none", width: 62, textAlign: "center", paddingTop: 3 }}>
                    <div style={{ ...mono, fontSize: 10, letterSpacing: "0.08em", color: "var(--text-3)" }}>{dow}</div>
                    <div style={{ fontSize: 27, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.01em", marginTop: 1 }}>{day}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--border)", paddingLeft: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: statusColor(e) }} />
                      <span style={{ ...mono, fontSize: 9.5, letterSpacing: "0.1em", color: "var(--text-3)" }}>
                        {e.activeSectors}/{e.totalSectors} sectors active
                      </span>
                    </div>
                    <div style={{ fontSize: 18, lineHeight: 1.25, fontWeight: 600, letterSpacing: "-0.01em" }}>
                      {e.deepDiveTopic ?? `Edition · ${e.date}`}
                    </div>
                  </div>
                  <div style={{ flex: "none", width: 120, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", paddingTop: 4 }}>
                    <div style={{ ...mono, fontSize: 11, color: "var(--text-2)", textTransform: "none" }}>
                      <span style={{ color: "var(--text)", fontWeight: 600 }}>{e.urgent}</span> urgent
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ))
      )}

      <footer style={{ textAlign: "center", padding: "24px 0 60px", marginTop: 24, borderTop: "3px double var(--rule)" }}>
        <div style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: "var(--text-3)" }}>
          Every edition you’ve ever received, kept for you
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ ...mono, fontSize: 10, letterSpacing: "0.08em", color: "var(--text-3)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
