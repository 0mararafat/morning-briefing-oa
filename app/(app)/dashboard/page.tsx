import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLatestBriefing } from "@/lib/briefings";
import { BriefingView } from "@/components/viewer/BriefingView";
import { ShareControl } from "@/components/viewer/ShareControl";
import type { Briefing } from "@/lib/generator/types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  // First-time users (no saved config) go straight to the setup wizard.
  const config = await prisma.userConfig.findUnique({
    where: { userId: session.user.id },
    select: { mode: true, lastRunStatus: true, lastRunError: true, lastRunAt: true },
  });
  if (!config) redirect("/setup");

  const briefing = await getLatestBriefing(session.user.id);

  const failure =
    config.mode === "API_KEY" && config.lastRunStatus === "error" ? (
      <FailureBanner error={config.lastRunError} at={config.lastRunAt} />
    ) : null;

  if (!briefing) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 28px", textAlign: "center" }}>
        {failure}
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>No edition yet</h1>
        <p style={{ color: "var(--text-2)", marginTop: 10 }}>
          Finish <Link href="/setup" style={{ color: "var(--accent-ink)" }}>setup</Link> and run your first
          briefing — it’ll appear here each morning.
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "16px 28px 0" }}>
        {failure}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ShareControl date={briefing.date} initialToken={briefing.shareToken} />
        </div>
      </div>
      <BriefingView data={briefing.data as unknown as Briefing} dateIso={briefing.date} />
    </>
  );
}

function FailureBanner({ error, at }: { error: string | null; at: Date | null }) {
  const when = at
    ? new Date(at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : null;
  return (
    <div
      style={{
        margin: "0 0 18px",
        padding: "13px 16px",
        borderRadius: 12,
        border: "1px solid var(--amber)",
        background: "var(--amber-soft)",
        color: "var(--text)",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <strong style={{ fontWeight: 600 }}>Last generation failed{when ? ` · ${when}` : ""}.</strong>{" "}
      {error ? <span style={{ color: "var(--text-2)" }}>{error}</span> : null} Check your{" "}
      <Link href="/setup/connect" style={{ color: "var(--accent-ink)" }}>API key</Link> and try again.
    </div>
  );
}
