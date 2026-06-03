import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { resetPlayer } from "@/lib/game";

export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await resetPlayer(userId));
}
