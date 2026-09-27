import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canViewArticle } from "@/lib/rbac";
import { commentSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (user.role === "VIEWER") {
    return NextResponse.json({ error: "Viewers have read-only access and cannot comment." }, { status: 403 });
  }

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article || !canViewArticle(user, article)) {
    return NextResponse.json({ error: "That knowledge article could not be found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: { articleId: params.id, userId: user.id, content: parsed.data.content },
    include: { user: { select: { name: true } } },
  });

  await logAudit({ userId: user.id, action: "COMMENT_ADDED", targetType: "Article", targetId: params.id });

  return NextResponse.json({
    id: comment.id,
    content: comment.content,
    user: comment.user.name,
    createdAt: comment.createdAt,
    resolved: comment.resolved,
  });
}
