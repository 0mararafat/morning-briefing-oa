import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getWizardValues } from "@/lib/config";
import { PRESET_SOURCES } from "@/lib/config-schema";
import { Wizard } from "@/components/wizard/Wizard";

// Setup wizard page (/setup): loads the user's saved config (if any) and hands it
// to the multi-step Wizard (topics, sources, sections, voices, schedule, mode).
const TIMEZONES = [
  "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", "America/Denver",
  "America/Chicago", "America/New_York", "America/Sao_Paulo", "Europe/London",
  "Europe/Paris", "Europe/Helsinki", "Africa/Johannesburg", "Asia/Dubai",
  "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "UTC",
];

export default async function SetupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const initial = await getWizardValues(session.user.id);

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
      <div style={{ width: "100%", maxWidth: 760, margin: "0 auto" }}>
        <Wizard initial={initial} presetSources={PRESET_SOURCES} timezones={TIMEZONES} />
      </div>
    </div>
  );
}
