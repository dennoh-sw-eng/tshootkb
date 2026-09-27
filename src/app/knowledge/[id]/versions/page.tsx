import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewArticle, canRestoreVersion } from "@/lib/rbac";
import VersionList from "@/components/VersionList";

export default async function VersionsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = { id: (session.user as any).id, role: (session.user as any).role };

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article || !canViewArticle(user, article)) notFound();

  const versions = await prisma.articleVersion.findMany({
    where: { articleId: params.id },
    include: { createdBy: { select: { name: true } } },
    orderBy: { versionNumber: "desc" },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Version history — {article.title}</h1>
      <VersionList
        articleId={article.id}
        canRestore={canRestoreVersion(user.role)}
        versions={versions.map((v) => ({
          versionNumber: v.versionNumber,
          changeSummary: v.changeSummary,
          createdBy: v.createdBy.name,
          createdAt: v.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
