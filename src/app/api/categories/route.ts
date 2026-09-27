import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageCategories } from "@/lib/rbac";
import { categorySchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { articles: true } } },
  });
  return NextResponse.json({
    categories: categories.map((c) => ({ id: c.id, name: c.name, description: c.description, articleCount: c._count.articles })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (!canManageCategories(user.role)) {
    return NextResponse.json({ error: "You do not have permission to manage categories." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A category needs a name of at least 2 characters." }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { name: parsed.data.name } });
  if (existing) return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });

  const category = await prisma.category.create({ data: parsed.data });
  await logAudit({ userId: user.id, action: "CATEGORY_CREATED", targetType: "Category", targetId: category.id, details: category.name });

  return NextResponse.json({ id: category.id }, { status: 201 });
}
