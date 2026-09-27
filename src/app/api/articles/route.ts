import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canCreateArticle, canViewArticle } from "@/lib/rbac";
import { articleCreateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

// GET /api/articles?q=printer&category=...&status=...&tag=...&author=...&mine=1&favorites=1
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const categoryId = searchParams.get("category") || undefined;
  const status = searchParams.get("status") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const type = searchParams.get("type") || undefined;
  const mine = searchParams.get("mine") === "1";
  const favoritesOnly = searchParams.get("favorites") === "1";

  const where: any = { AND: [] as any[] };

  if (mine) {
    where.AND.push({ authorId: user.id });
  } else {
    // Default: published content, plus the user's own drafts/in-review.
    where.AND.push({
      OR: [{ status: "PUBLISHED" }, { authorId: user.id }],
    });
  }

  if (status) where.AND.push({ status });
  if (categoryId) where.AND.push({ categoryId });
  if (type) where.AND.push({ type });
  if (tag) where.AND.push({ tags: { some: { tag: { name: tag } } } });

  if (q) {
    where.AND.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { category: { name: { contains: q } } },
        { author: { name: { contains: q } } },
        { steps: { some: { OR: [{ content: { contains: q } }, { command: { contains: q } }, { title: { contains: q } }] } } },
        { tags: { some: { tag: { name: { contains: q } } } } },
      ],
    });
  }

  if (favoritesOnly) {
    where.AND.push({ favorites: { some: { userId: user.id } } });
  }

  const articles = await prisma.article.findMany({
    where,
    include: {
      category: true,
      author: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
      _count: { select: { favorites: true, comments: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  // Enforce visibility classification server-side; restricted articles
  // never appear in results for users who can't see them.
  const visible = articles.filter((a) => canViewArticle(user, a));

  const results = visible.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    type: a.type,
    status: a.status,
    visibility: a.visibility,
    category: a.category?.name ?? null,
    tags: a.tags.map((t) => t.tag.name),
    author: a.author.name,
    authorId: a.author.id,
    updatedAt: a.updatedAt,
    favoriteCount: a._count.favorites,
    commentCount: a._count.comments,
    isDemo: a.isDemo,
  }));

  return NextResponse.json({ results });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (!canCreateArticle(user.role)) {
    return NextResponse.json({ error: "You do not have permission to create knowledge articles." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = articleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form — some fields are invalid." }, { status: 400 });
  }

  const { tags, ...data } = parsed.data;

  const article = await prisma.article.create({
    data: {
      ...data,
      authorId: user.id,
      status: "DRAFT",
      tags: tags?.length
        ? {
            create: await Promise.all(
              tags.map(async (name) => {
                const tag = await prisma.tag.upsert({
                  where: { name },
                  update: {},
                  create: { name },
                });
                return { tagId: tag.id };
              })
            ),
          }
        : undefined,
    },
  });

  await logAudit({ userId: user.id, action: "ARTICLE_CREATED", targetType: "Article", targetId: article.id, details: article.title });

  return NextResponse.json({ id: article.id }, { status: 201 });
}
