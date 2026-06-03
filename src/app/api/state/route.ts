import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { buildState } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await buildState(userId));
}
