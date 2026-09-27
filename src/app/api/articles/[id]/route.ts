import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canDeletePermanently, canArchive, canEditArticle, canViewArticle } from "@/lib/rbac";
import { articleUpdateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { createVersionSnapshot } from "@/lib/versioning";

async function loadArticle(id: string) {
  return prisma.article.findUnique({
    where: { id },
    include: {
      category: true,
      author: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
      steps: { orderBy: { order: "asc" }, include: { attachments: true } },
      attachments: true,
      comments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      favorites: true,
    },
  });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });

  const article = await loadArticle(params.id);
  // Return 404 (not 403) for restricted content so we don't confirm it exists.
  if (!article || !canViewArticle(user, article)) {
    return NextResponse.json({ error: "That knowledge article could not be found." }, { status: 404 });
  }

  const isOwnerOrAdmin = article.authorId === user.id || user.role === "GLOBAL_ADMIN";

  return NextResponse.json({
    ...article,
    internalNotes: isOwnerOrAdmin ? article.internalNotes : null,
    tags: article.tags.map((t) => t.tag.name),
    isFavorited: article.favorites.some((f) => f.userId === user.id),
    canEdit: canEditArticle(user, article),
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) return NextResponse.json({ error: "That knowledge article could not be found." }, { status: 404 });

  if (!canEditArticle(user, article)) {
    return NextResponse.json({ error: "You do not have permission to modify this article." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = articleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form — some fields are invalid." }, { status: 400 });
  }

  const { tags, changeSummary, status, ...data } = parsed.data;

  // Status transitions are restricted separately from field edits.
  let nextStatus = article.status;
  if (status && status !== article.status) {
    if (status === "IN_REVIEW") {
      nextStatus = "IN_REVIEW";
    } else if (status === "DRAFT" && (article.status === "IN_REVIEW" || user.id === article.authorId)) {
      nextStatus = "DRAFT";
    } else if (status === "ARCHIVED" && canArchive(user, article)) {
      nextStatus = "ARCHIVED";
    } else if (status === "PUBLISHED") {
      return NextResponse.json(
        { error: "Use the publish action to publish this article." },
        { status: 400 }
      );
    }
  }

  const wasPublished = article.status === "PUBLISHED";

  await prisma.article.update({
    where: { id: article.id },
    data: {
      ...data,
      status: nextStatus,
      ...(tags
        ? {
            tags: {
              deleteMany: {},
              create: await Promise.all(
                tags.map(async (name) => {
                  const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
                  return { tagId: tag.id };
                })
              ),
            },
          }
        : {}),
    },
  });

  // If the article was already published, editing it creates a new version
  // so the previously published content is preserved in history.
  if (wasPublished) {
    await createVersionSnapshot(article.id, user.id, changeSummary || "Edited published article");
  }

  await logAudit({
    userId: user.id,
    action: "ARTICLE_EDITED",
    targetType: "Article",
    targetId: article.id,
    details: changeSummary || undefined,
  });

  return NextResponse.json({ ok: true });
}

// DELETE archives by default. Pass ?permanent=1 with body { confirm: "DELETE" }
// for permanent deletion — Global Admin only, second confirmation required.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) return NextResponse.json({ error: "That knowledge article could not be found." }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const permanent = searchParams.get("permanent") === "1";

  if (permanent) {
    if (!canDeletePermanently(user.role)) {
      return NextResponse.json(
        { error: "Only a Global Admin can permanently delete a knowledge article." },
        { status: 403 }
      );
    }
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== "DELETE") {
      return NextResponse.json(
        { error: 'Type DELETE to permanently remove this article.' },
        { status: 400 }
      );
    }
    await prisma.article.delete({ where: { id: article.id } });
    await logAudit({ userId: user.id, action: "ARTICLE_PERMANENTLY_DELETED", targetType: "Article", targetId: article.id, details: article.title });
    return NextResponse.json({ ok: true });
  }

  if (!canArchive(user, article)) {
    return NextResponse.json({ error: "You do not have permission to archive this article." }, { status: 403 });
  }

  await prisma.article.update({ where: { id: article.id }, data: { status: "ARCHIVED" } });
  await logAudit({ userId: user.id, action: "ARTICLE_ARCHIVED", targetType: "Article", targetId: article.id, details: article.title });

  return NextResponse.json({ ok: true });
}
