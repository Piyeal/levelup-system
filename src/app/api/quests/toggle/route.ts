import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { toggleQuest } from "@/lib/game";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing quest id" }, { status: 400 });
  return NextResponse.json(await toggleQuest(userId, id));
}
