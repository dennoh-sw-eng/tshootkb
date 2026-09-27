import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setupSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ needsSetup: count === 0 });
}

export async function POST(req: NextRequest) {
  const existing = await prisma.user.count();
  if (existing > 0) {
    return NextResponse.json(
      { error: "Setup has already been completed. Please sign in instead." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form — some fields are invalid." }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.trim().toLowerCase(),
      passwordHash,
      role: "GLOBAL_ADMIN",
    },
  });

  await logAudit({ userId: user.id, action: "OWNER_SETUP_COMPLETE", targetType: "User", targetId: user.id });

  return NextResponse.json({ ok: true });
}
