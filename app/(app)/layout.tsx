import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

// Layout for the authenticated app (the (app) route group): guards every child
// route behind sign-in and renders the shared top navigation bar.
const linkStyle = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  textDecoration: "none",
  color: "var(--text-3)",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 28px",
          borderBottom: "1px solid var(--border)",
          maxWidth: 1080,
          margin: "0 auto",
        }}
      >
        <Link href="/dashboard" style={{ ...linkStyle, color: "var(--text-2)" }}>
          Morning Briefing
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/setup" style={linkStyle}>Change setup</Link>
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <Link href="/briefings" style={linkStyle}>Archive</Link>
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <ThemeToggle />
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" style={{ ...linkStyle, border: "none", background: "transparent", cursor: "pointer" }}>
              Sign out
            </button>
          </form>
        </div>
      </div>
      <main>{children}</main>
    </div>
  );
}
