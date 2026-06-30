import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

const mono: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: "uppercase",
};

// GitHub's Octocat mark — inherits the button text color via currentColor.
function GitHubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

// Google's multicolor "G" — fixed brand colors, independent of theme.
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z" fill="#34A853" />
      <path d="M3.97 10.72A5.41 5.41 0 013.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 000 9c0 1.45.35 2.82.96 4.05l3.01-2.33z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

export default async function SignInPage() {
  const session = await auth();
  // Match the (app) layout's guard exactly (`session?.user`). Checking only
  // `session` can loop with the layout when auth() returns a truthy session
  // that has no user (observed on Vercel): signin→dashboard→signin forever.
  if (session?.user) redirect("/dashboard");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(900px 520px at 82% -10%, var(--accent-soft-2), transparent 60%), radial-gradient(680px 480px at -8% 12%, var(--accent-soft-2), transparent 55%), var(--bg)",
        backgroundAttachment: "fixed",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "16px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--surface-solid)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-soft)" }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Morning Briefing</div>
        </div>
        <ThemeToggle />
      </header>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 22px 80px" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 20,
            background: "var(--surface)",
            backdropFilter: "blur(22px) saturate(1.3)",
            WebkitBackdropFilter: "blur(22px) saturate(1.3)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow), inset 0 1px 0 var(--glass-hi)",
            padding: "36px 32px",
            textAlign: "center",
          }}
        >
          <div style={{ ...mono, fontSize: 11, letterSpacing: "0.2em", color: "var(--accent-ink)", marginBottom: 14 }}>
            Personal Edition
          </div>
          <h1 style={{ fontSize: 34, lineHeight: 1.05, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
            Sign in
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-2)", margin: "0 auto 26px", maxWidth: "34ch", lineHeight: 1.55 }}>
            Pick up your daily edition. Choose how you’d like to continue.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 11, textAlign: "left" }}>
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 18px", border: "none", borderRadius: 11, background: "var(--text)", color: "var(--bg)", fontFamily: "'Spectral', serif", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                <GitHubMark />
                Continue with GitHub
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
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 18px", borderRadius: 11, border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text)", fontFamily: "'Spectral', serif", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                <GoogleMark />
                Continue with Google
              </button>
            </form>
          </div>

          <div style={{ ...mono, fontSize: 10, letterSpacing: "0.05em", color: "var(--text-3)", marginTop: 18, lineHeight: 1.6, textTransform: "none" }}>
            No credit card · 90-second setup · cancel anytime
          </div>
        </div>
      </div>
    </div>
  );
}
