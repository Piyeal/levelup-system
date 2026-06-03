import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { addCustomQuest } from "@/lib/game";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  return NextResponse.json(
    await addCustomQuest(userId, {
      title: body.title,
      category: body.category,
      difficulty: body.difficulty,
    })
  );
}
