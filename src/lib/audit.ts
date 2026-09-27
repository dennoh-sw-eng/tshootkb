import { prisma } from "./prisma";

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details,
      },
    });
  } catch (err) {
    // Audit logging must never break the primary action; log and continue.
    console.error("audit log failed", err);
  }
}
