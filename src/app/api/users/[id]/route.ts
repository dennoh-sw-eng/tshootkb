import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageUsers } from "@/lib/rbac";
import { userUpdateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (!canManageUsers(user.role)) {
    return NextResponse.json({ error: "You do not have permission to manage users." }, { status: 403 });
  }
  if (params.id === user.id) {
    return NextResponse.json({ error: "You cannot change your own role or disable your own account." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the values submitted." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: params.id }, data: parsed.data });

  await logAudit({
    userId: user.id,
    action: parsed.data.disabled !== undefined ? (parsed.data.disabled ? "USER_DISABLED" : "USER_ENABLED") : "USER_ROLE_CHANGED",
    targetType: "User",
    targetId: params.id,
    details: JSON.stringify(parsed.data),
  });

  return NextResponse.json({ ok: true });
}
