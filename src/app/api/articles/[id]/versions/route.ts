import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canRestoreVersion, canViewArticle } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createVersionSnapshot } from "@/lib/versioning";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article || !canViewArticle(user, article)) {
    return NextResponse.json({ error: "That knowledge article could not be found." }, { status: 404 });
  }

  const versions = await prisma.articleVersion.findMany({
    where: { articleId: params.id },
    include: { createdBy: { select: { name: true } } },
    orderBy: { versionNumber: "desc" },
  });

  return NextResponse.json({
    versions: versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      changeSummary: v.changeSummary,
      createdBy: v.createdBy.name,
      createdAt: v.createdAt,
    })),
  });
}

// POST { versionNumber } -> restores that version's snapshot as the current
// content, and records the restore as a new version (history is additive-only).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (!canRestoreVersion(user.role)) {
    return NextResponse.json({ error: "You do not have permission to restore a previous version." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const versionNumber = body?.versionNumber;
  if (typeof versionNumber !== "number") {
    return NextResponse.json({ error: "A version number is required." }, { status: 400 });
  }

  const version = await prisma.articleVersion.findUnique({
    where: { articleId_versionNumber: { articleId: params.id, versionNumber } },
  });
  if (!version) return NextResponse.json({ error: "That version could not be found." }, { status: 404 });

  const snapshot = JSON.parse(version.snapshot);

  await prisma.$transaction(async (tx) => {
    await tx.step.deleteMany({ where: { articleId: params.id } });
    await tx.article.update({
      where: { id: params.id },
      data: {
        title: snapshot.title,
        description: snapshot.description,
        type: snapshot.type,
        visibility: snapshot.visibility,
        priority: snapshot.priority,
        difficulty: snapshot.difficulty,
        audience: snapshot.audience,
        estimatedTime: snapshot.estimatedTime,
        steps: {
          create: snapshot.steps.map((s: any) => ({
            order: s.order,
            type: s.type,
            title: s.title,
            content: s.content,
            command: s.command,
            shell: s.shell,
            expectedResult: s.expectedResult,
            warning: s.warning,
            notes: s.notes,
            linkUrl: s.linkUrl,
            linkLabel: s.linkLabel,
          })),
        },
      },
    });
  });

  await createVersionSnapshot(params.id, user.id, `Restored version ${versionNumber}`);

  await logAudit({
    userId: user.id,
    action: "ARTICLE_VERSION_RESTORED",
    targetType: "Article",
    targetId: params.id,
    details: `Restored v${versionNumber}`,
  });

  return NextResponse.json({ ok: true });
}
