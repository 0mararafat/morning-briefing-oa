import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GitHubMark, GoogleMark } from "@/components/ProviderMarks";

const mono: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: "uppercase",
};

const sectionDots: Array<[string, string, boolean]> = [
  ["Top Stories", "var(--green)", true],
  ["Sector Scan", "var(--green)", false],
  ["Week Ahead", "var(--amber)", false],
  ["Pattern Watch", "var(--accent)", false],
  ["Deep Dive", "var(--grey-dot)", false],
  ["Signal Scan", "var(--green)", false],
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px 520px at 82% -10%, var(--accent-soft-2), transparent 60%), radial-gradient(680px 480px at -8% 12%, var(--accent-soft-2), transparent 55%), var(--bg)",
        backgroundAttachment: "fixed",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "13px 26px",
          background: "var(--surface-2)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "var(--surface-solid)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "var(--accent)",
                boxShadow: "0 0 0 3px var(--accent-soft)",
              }}
            />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Morning Briefing</div>
        </div>
        <ThemeToggle />
      </header>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 28px 70px" }}>
        {/* Masthead */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            borderBottom: "2px solid var(--rule)",
            paddingBottom: 12,
            marginBottom: 6,
          }}
        >
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: "0.1em", color: "var(--text-2)" }}>
            Vol. 1 · Personal Edition
          </span>
          <span style={{ ...mono, fontSize: 10.5, letterSpacing: "0.1em", color: "var(--text-2)" }}>
            {today}
          </span>
        </div>
        <div
          style={{
            textAlign: "center",
            borderBottom: "3px double var(--rule)",
            paddingBottom: 30,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: 13,
              letterSpacing: "0.3em",
              color: "var(--accent-ink)",
              margin: "22px 0 10px",
            }}
          >
            The
          </div>
          <h1 style={{ fontSize: 72, lineHeight: 0.94, fontWeight: 700, letterSpacing: "-0.025em", margin: 0 }}>
            Morning Briefing
          </h1>
          <p
            style={{
              fontSize: 17,
              fontStyle: "italic",
              color: "var(--text-2)",
              margin: "18px auto 0",
              maxWidth: "48ch",
            }}
          >
            The stories you care about delivered daily. The end of endless scrolling.
          </p>
        </div>

        {/* Front-page columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.05fr", gap: 0 }}>
          <div style={{ paddingRight: 30, borderRight: "1px solid var(--border)" }}>
            <div style={{ ...mono, fontSize: 9.5, letterSpacing: "0.14em", color: "var(--accent-ink)", marginBottom: 9 }}>
              What you get
            </div>
            <h3 style={{ fontSize: 22, lineHeight: 1.22, fontWeight: 600, margin: "0 0 10px", letterSpacing: "-0.012em" }}>
              A front page built only from what matters to you.
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-2)", margin: 0 }}>
              Your topics, ranked. Your sources, summarized. The voices you follow, tracked — composed into one
              calm edition before 7 a.m.
            </p>
          </div>

          <div style={{ padding: "0 30px", borderRight: "1px solid var(--border)" }}>
            <div style={{ ...mono, fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-3)", marginBottom: 13 }}>
              Inside each edition
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sectionDots.map(([label, color, pulse]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: color,
                      animation: pulse ? "mb-pulse 2.4s infinite" : undefined,
                    }}
                  />
                  <span style={{ fontSize: 14 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ paddingLeft: 30 }}>
            <div style={{ ...mono, fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-3)", marginBottom: 13 }}>
              Start reading
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <form
                action={async () => {
                  "use server";
                  await signIn("github", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "14px 18px",
                    border: "none",
                    borderRadius: 11,
                    background: "var(--text)",
                    color: "var(--bg)",
                    fontFamily: "'Spectral', serif",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <GitHubMark />
                  Sign in with GitHub
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "14px 18px",
                    borderRadius: 11,
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontFamily: "'Spectral', serif",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <GoogleMark />
                  Sign in with Google
                </button>
              </form>
            </div>
            <div style={{ ...mono, fontSize: 10, letterSpacing: "0.05em", color: "var(--text-3)", marginTop: 14, lineHeight: 1.6, textTransform: "none" }}>
              No credit card · 90-second setup · cancel anytime
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", borderTop: "3px double var(--rule)", marginTop: 40, paddingTop: 18 }}>
          <span style={{ ...mono, fontSize: 10, letterSpacing: "0.16em", color: "var(--text-3)" }}>
            One edition every morning · nothing in between
          </span>
        </div>
      </main>
    </div>
  );
}
