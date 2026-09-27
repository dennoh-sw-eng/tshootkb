import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canViewAuditLog } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (!canViewAuditLog(user.role)) {
    return NextResponse.json({ error: "You do not have permission to view the audit log." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get("take")) || 100, 500);

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      user: l.user?.name ?? "System",
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      details: l.details,
      createdAt: l.createdAt,
    })),
  });
}
