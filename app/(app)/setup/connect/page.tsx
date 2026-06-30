import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RoutineConnect } from "@/components/wizard/RoutineConnect";
import { ApiKeyConnect } from "@/components/wizard/ApiKeyConnect";
import { getKeyInfo } from "@/lib/secrets";

const mono = {
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: "uppercase" as const,
};

function Shell({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1000px 560px at 84% -6%, var(--accent-soft-2), transparent 60%), radial-gradient(720px 520px at -8% 10%, var(--accent-soft-2), transparent 55%), var(--bg)",
        backgroundAttachment: "fixed",
        padding: "32px 22px 80px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          margin: "0 auto",
          borderRadius: 20,
          background: "var(--surface)",
          backdropFilter: "blur(22px) saturate(1.3)",
          WebkitBackdropFilter: "blur(22px) saturate(1.3)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow), inset 0 1px 0 var(--glass-hi)",
          overflow: "hidden",
        }}
      >
        <div style={{ height: 4, background: "var(--bg-2)" }}>
          <div style={{ height: "100%", background: "var(--accent)" }} />
        </div>
        <div style={{ padding: "26px 30px 8px" }}>
          <div style={{ ...mono, fontSize: 11, letterSpacing: "0.14em", color: "var(--accent-ink)", marginBottom: 9 }}>
            Final step · Connect
          </div>
          <h2 style={{ fontSize: 27, lineHeight: 1.15, fontWeight: 600, letterSpacing: "-0.015em", margin: "0 0 6px" }}>{title}</h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--text-2)", margin: 0 }}>{sub}</p>
        </div>
        <div style={{ padding: "22px 30px 26px" }}>{children}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 30px", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <Link href="/setup" style={{ ...mono, fontSize: 11, letterSpacing: "0.06em", color: "var(--text-2)", textDecoration: "none" }}>
            ← Back to setup
          </Link>
          <Link
            href="/dashboard"
            style={{ padding: "11px 20px", borderRadius: 11, background: "var(--accent)", color: "#fff", fontSize: 14.5, fontWeight: 600, textDecoration: "none", boxShadow: "0 3px 12px var(--accent-soft)" }}
          >
            Go to dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function ConnectPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const userId = session.user.id;

  const cfg = await prisma.userConfig.findUnique({ where: { userId } });
  if (!cfg) redirect("/setup");

  if (cfg.mode === "CLAUDE_ROUTINE") {
    const last = await prisma.briefing.findFirst({
      where: { userId, source: "CLAUDE_ROUTINE" },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    return (
      <Shell title="Connect your routine" sub="Three values to paste into a scheduled Claude routine — then editions start arriving.">
        <RoutineConnect lastReceived={last?.date ?? null} />
      </Shell>
    );
  }

  // API_KEY mode
  const keyInfo = await getKeyInfo(userId);
  return (
    <Shell title="Add your API key" sub="You enter one secret — stored encrypted, and we only ever show the last 4 characters.">
      <ApiKeyConnect initialLast4={keyInfo.last4} />
    </Shell>
  );
}
