import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canEditArticle } from "@/lib/rbac";
import { stepsReplaceSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { createVersionSnapshot } from "@/lib/versioning";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });

  const article = await prisma.article.findUnique({ where: { id: params.id }, include: { steps: true } });
  if (!article) return NextResponse.json({ error: "That knowledge article could not be found." }, { status: 404 });

  if (!canEditArticle(user, article)) {
    return NextResponse.json({ error: "You do not have permission to modify this article." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = stepsReplaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "One or more steps are invalid. Please review and try again." }, { status: 400 });
  }

  const { steps, changeSummary } = parsed.data;
  const existingIds = new Set<string>(article.steps.map((s: { id: string }) => s.id));
  const incomingIds = new Set<string>(steps.filter((s) => s.id).map((s) => s.id as string));
  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

  await prisma.$transaction([
    ...toDelete.map((id) => prisma.step.delete({ where: { id } })),
    ...steps.map((s) => {
      const data = {
        order: s.order,
        type: s.type,
        title: s.title || null,
        content: s.content || null,
        command: s.command || null,
        shell: s.shell || null,
        expectedResult: s.expectedResult || null,
        warning: s.warning || null,
        notes: s.notes || null,
        linkUrl: s.linkUrl || null,
        linkLabel: s.linkLabel || null,
        decisionYesStepOrder: s.decisionYesStepOrder ?? null,
        decisionNoStepOrder: s.decisionNoStepOrder ?? null,
      };
      if (s.id && existingIds.has(s.id)) {
        return prisma.step.update({ where: { id: s.id }, data });
      }
      return prisma.step.create({ data: { ...data, articleId: article.id } });
    }),
  ]);

  if (article.status === "PUBLISHED") {
    await createVersionSnapshot(article.id, user.id, changeSummary || "Updated steps");
  }

  await logAudit({
    userId: user.id,
    action: "ARTICLE_STEPS_UPDATED",
    targetType: "Article",
    targetId: article.id,
    details: changeSummary || `${steps.length} step(s)`,
  });

  return NextResponse.json({ ok: true });
}
