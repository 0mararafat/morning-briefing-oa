import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

const mono: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: "uppercase",
};

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

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
