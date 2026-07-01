import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enableShare, disableShare } from "@/lib/share";

// /api/share — enable (POST) or revoke (DELETE) a public share link for one of the
// signed-in user's briefings, identified by date.
function shareUrl(token: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/share/${token}`;
}

async function readDate(req: Request): Promise<string | null> {
  const { date } = (await req.json().catch(() => ({}))) as { date?: unknown };
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

// Enable a public share link for one of the signed-in user's briefings.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = await readDate(req);
  if (!date) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const token = await enableShare(session.user.id, date);
  if (!token) return NextResponse.json({ error: "No briefing for that date" }, { status: 404 });

  return NextResponse.json({ ok: true, token, url: shareUrl(token) });
}

// Revoke the share link.
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = await readDate(req);
  if (!date) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  await disableShare(session.user.id, date);
  return NextResponse.json({ ok: true });
}
