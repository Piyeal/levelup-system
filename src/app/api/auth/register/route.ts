import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password || String(password).length < 6) {
      return NextResponse.json(
        { error: "Email and a password of at least 6 characters are required." },
        { status: 400 }
      );
    }
    const normalized = String(email).toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(String(password), 10);
    await prisma.user.create({ data: { email: normalized, passwordHash } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}
