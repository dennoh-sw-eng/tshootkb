import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditArticle } from "@/lib/rbac";
import EditorClient from "./EditorClient";

export default async function EditPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = { id: (session.user as any).id, role: (session.user as any).role };

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) notFound();
  if (!canEditArticle(user, article)) redirect(`/knowledge/${params.id}`);

  return <EditorClient articleId={params.id} />;
}
