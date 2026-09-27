import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canViewArticle } from "@/lib/rbac";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article || !canViewArticle(user, article)) {
    return NextResponse.json({ error: "That knowledge article could not be found." }, { status: 404 });
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_articleId: { userId: user.id, articleId: params.id } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await prisma.favorite.create({ data: { userId: user.id, articleId: params.id } });
  return NextResponse.json({ favorited: true });
}
