import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { deleteQuest } from "@/lib/game";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await deleteQuest(userId, params.id));
}
