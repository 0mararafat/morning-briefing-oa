import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBriefingByDate } from "@/lib/briefings";
import { BriefingView } from "@/components/viewer/BriefingView";
import { ShareControl } from "@/components/viewer/ShareControl";
import type { Briefing } from "@/lib/generator/types";

export default async function BriefingByDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const { date } = await params;
  const briefing = await getBriefingByDate(session.user.id, date);
  if (!briefing) notFound();

  return (
    <>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "16px 28px 0", display: "flex", justifyContent: "flex-end" }}>
        <ShareControl date={briefing.date} initialToken={briefing.shareToken} />
      </div>
      <BriefingView data={briefing.data as unknown as Briefing} dateIso={briefing.date} />
    </>
  );
}
