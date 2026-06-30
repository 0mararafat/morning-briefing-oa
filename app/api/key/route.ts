import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveApiKey, getKeyInfo, deleteApiKey } from "@/lib/secrets";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getKeyInfo(session.user.id));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { apiKey } = (await req.json().catch(() => ({}))) as { apiKey?: string };
  if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json({ error: "Enter a valid Anthropic key (starts with sk-ant-)" }, { status: 422 });
  }
  const last4 = await saveApiKey(session.user.id, apiKey.trim());
  return NextResponse.json({ ok: true, last4 });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deleteApiKey(session.user.id);
  return NextResponse.json({ ok: true });
}
