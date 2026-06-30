import { notFound } from "next/navigation";
import { getSharedBriefing } from "@/lib/share";

// Public, unauthenticated view of a shared briefing. Lives outside the (app)
// route group so the auth guard doesn't apply. Renders the stored standalone
// HTML document in an isolated full-viewport iframe.
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const briefing = await getSharedBriefing(token);
  if (!briefing) notFound();

  return (
    <iframe
      title="Shared briefing"
      srcDoc={briefing.html}
      sandbox="allow-same-origin"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: "none" }}
    />
  );
}
