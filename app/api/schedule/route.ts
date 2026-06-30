import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Pause or resume a user's scheduled briefings. The hourly daily-scheduler only
// fans out for UserConfig rows with enabled=true, so flipping this flag is what
// "stops the cron" for an API-key user — there is no per-user Inngest schedule.
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const enabled = (body as { enabled?: unknown })?.enabled;
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "`enabled` must be a boolean" }, { status: 422 });
  }

  await prisma.userConfig.update({
    where: { userId: session.user.id },
    data: { enabled },
  });

  return NextResponse.json({ ok: true, enabled });
}
