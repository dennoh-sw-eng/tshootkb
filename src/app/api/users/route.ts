import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageUsers } from "@/lib/rbac";
import { userCreateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (!canManageUsers(user.role)) {
    return NextResponse.json({ error: "You do not have permission to manage users." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, disabled: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

// In place of outbound email delivery (not configured by default), this
// creates the account directly with a temporary password the admin shares
// with the new user out of band; wire up an email provider for real invites.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (!canManageUsers(user.role)) {
    return NextResponse.json({ error: "You do not have permission to manage users." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form — name, valid email, and an 8+ character password are required." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const created = await prisma.user.create({
    data: { name: parsed.data.name, email, passwordHash, role: parsed.data.role },
  });

  await logAudit({ userId: user.id, action: "USER_CREATED", targetType: "User", targetId: created.id, details: `${created.email} (${created.role})` });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
