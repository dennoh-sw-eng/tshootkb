import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAuditLog } from "@/lib/rbac";

export default async function AuditLogPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (!canViewAuditLog(role)) redirect("/");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { user: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <div className="card divide-y divide-[var(--border)]">
        {logs.map((l) => (
          <div key={l.id} className="p-3 text-sm flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold">{l.user?.name ?? "System"}</span>{" "}
              <span className="text-[var(--muted)]">{l.action.replace(/_/g, " ").toLowerCase()}</span>{" "}
              {l.details && <span className="text-[var(--muted)]">— {l.details}</span>}
            </div>
            <span className="text-xs text-[var(--muted)]">{l.createdAt.toLocaleString()}</span>
          </div>
        ))}
        {logs.length === 0 && <div className="p-3 text-sm text-[var(--muted)]">No activity recorded yet.</div>}
      </div>
    </div>
  );
}
