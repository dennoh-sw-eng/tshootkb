import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageCategories } from "@/lib/rbac";
import { categorySchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (!canManageCategories(user.role)) {
    return NextResponse.json({ error: "You do not have permission to manage categories." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the category name." }, { status: 400 });
  }

  await prisma.category.update({ where: { id: params.id }, data: parsed.data });
  await logAudit({ userId: user.id, action: "CATEGORY_RENAMED", targetType: "Category", targetId: params.id });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (!canManageCategories(user.role)) {
    return NextResponse.json({ error: "You do not have permission to manage categories." }, { status: 403 });
  }

  await prisma.article.updateMany({ where: { categoryId: params.id }, data: { categoryId: null } });
  await prisma.category.delete({ where: { id: params.id } });
  await logAudit({ userId: user.id, action: "CATEGORY_DELETED", targetType: "Category", targetId: params.id });

  return NextResponse.json({ ok: true });
}
