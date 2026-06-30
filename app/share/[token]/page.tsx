import { notFound } from "next/navigation";
import { getSharedBriefing } from "@/lib/share";
import { BriefingView } from "@/components/viewer/BriefingView";
import type { Briefing } from "@/lib/generator/types";

// Public, unauthenticated view of a shared briefing. Lives outside the (app)
// route group so the auth guard doesn't apply. Renders the same BriefingView
// component as the dashboard (from the stored briefing JSON) — just without the
// app chrome and owner-only controls (share/schedule buttons).
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const briefing = await getSharedBriefing(token);
  if (!briefing) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <BriefingView data={briefing.data as unknown as Briefing} dateIso={briefing.date} />
    </div>
  );
}
