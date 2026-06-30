import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/inngest/client";
import { checkRateLimit } from "@/lib/rate-limit";

// Trigger an immediate (force) generation for the signed-in user.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Each "Run now" fires a paid generation job — cap to a few per 10 minutes so a
  // double-click or impatient retry can't queue a pile of expensive runs.
  const rl = await checkRateLimit(`run:${session.user.id}`, 5, 600);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "You're running these a bit fast — try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  await inngest.send({
    name: "app/briefing.requested",
    data: { userId: session.user.id, force: true },
  });
  return NextResponse.json({ ok: true });
}
