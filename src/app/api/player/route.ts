import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { updatePlayer } from "@/lib/game";

export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  return NextResponse.json(await updatePlayer(userId, body));
}
