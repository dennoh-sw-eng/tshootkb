import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canPublish } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createVersionSnapshot } from "@/lib/versioning";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });

  if (!canPublish(user.role)) {
    return NextResponse.json({ error: "You do not have permission to publish knowledge articles." }, { status: 403 });
  }

  const article = await prisma.article.findUnique({ where: { id: params.id }, include: { steps: true } });
  if (!article) return NextResponse.json({ error: "That knowledge article could not be found." }, { status: 404 });

  if (article.steps.length === 0) {
    return NextResponse.json({ error: "Add at least one step before publishing." }, { status: 400 });
  }

  const firstPublish = article.status !== "PUBLISHED" && article.currentVersion === 1;

  await prisma.article.update({
    where: { id: article.id },
    data: { status: "PUBLISHED", publishedAt: article.publishedAt ?? new Date() },
  });

  await createVersionSnapshot(article.id, user.id, firstPublish ? "Initial publish" : "Republished");

  await logAudit({ userId: user.id, action: "ARTICLE_PUBLISHED", targetType: "Article", targetId: article.id, details: article.title });

  return NextResponse.json({ ok: true });
}
