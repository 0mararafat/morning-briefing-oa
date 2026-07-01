import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { getWizardValues, saveUserConfig } from "@/lib/config";

// /api/config — read (GET) and save (PUT) the signed-in user's wizard config.
// Every operation is scoped to the authenticated user; PUT validates with Zod.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const values = await getWizardValues(session.user.id);
  return NextResponse.json(values);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const saved = await saveUserConfig(session.user.id, body);
    return NextResponse.json({ ok: true, mode: saved.mode });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid config", issues: err.issues },
        { status: 422 }
      );
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
