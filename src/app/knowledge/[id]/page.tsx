import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewArticle, canEditArticle, canPublish, canArchive, canDeletePermanently, canComment } from "@/lib/rbac";
import { StatusBadge, TypeBadge, VisibilityBadge } from "@/components/Badges";
import StepView from "@/components/StepView";
import ArticleActions from "@/components/ArticleActions";
import Comments from "@/components/Comments";

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = { id: (session.user as any).id, role: (session.user as any).role };

  const article = await prisma.article.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      author: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
      steps: { orderBy: { order: "asc" }, include: { attachments: true } },
      comments: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      favorites: true,
    },
  });

  if (!article || !canViewArticle(user, article)) notFound();

  const isOwnerOrAdmin = article.authorId === user.id || user.role === "GLOBAL_ADMIN";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <TypeBadge type={article.type} />
          <StatusBadge status={article.status} />
          <VisibilityBadge visibility={article.visibility} />
          {article.isDemo && <span className="badge">DEMO</span>}
        </div>
        <h1 className="text-2xl font-bold">{article.title}</h1>
        <p className="text-[var(--muted)] mt-1">{article.description}</p>
        <div className="text-xs text-[var(--muted)] mt-2">
          {article.category?.name || "Uncategorized"} · by {article.author.name} · v{article.currentVersion} · updated {article.updatedAt.toLocaleDateString()}
          {article.estimatedTime && <> · ~{article.estimatedTime}</>}
        </div>
        {article.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-2">
            {article.tags.map((t) => <span key={t.tag.id} className="badge">#{t.tag.name}</span>)}
          </div>
        )}
      </div>

      <ArticleActions
        articleId={article.id}
        status={article.status}
        isFavorited={article.favorites.some((f) => f.userId === user.id)}
        canEdit={canEditArticle(user, article)}
        canPublish={canPublish(user.role)}
        canArchive={canArchive(user, article)}
        canDeletePermanently={canDeletePermanently(user.role)}
        isAuthor={article.authorId === user.id}
      />

      {(article.priority || article.difficulty || article.audience || article.requiredAccessLevel) && (
        <div className="card p-4 grid grid-cols-2 gap-3 text-sm">
          {article.priority && <div><span className="text-[var(--muted)]">Priority: </span>{article.priority}</div>}
          {article.difficulty && <div><span className="text-[var(--muted)]">Difficulty: </span>{article.difficulty}</div>}
          {article.audience && <div><span className="text-[var(--muted)]">Audience: </span>{article.audience}</div>}
          {article.requiredAccessLevel && <div><span className="text-[var(--muted)]">Required access: </span>{article.requiredAccessLevel}</div>}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Steps</h2>
        {article.steps.length === 0 && <div className="text-sm text-[var(--muted)]">No steps added yet.</div>}
        {article.steps.map((s, i) => <StepView key={s.id} step={s} index={i} />)}
      </div>

      {isOwnerOrAdmin && article.internalNotes && (
        <div className="card p-4 text-sm">
          <div className="text-xs text-[var(--muted)] mb-1">Internal notes (visible to author/admin only)</div>
          <p className="whitespace-pre-wrap">{article.internalNotes}</p>
        </div>
      )}

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Comments</h2>
        <Comments
          articleId={article.id}
          initial={article.comments.map((c) => ({ id: c.id, content: c.content, user: c.user, createdAt: c.createdAt.toISOString(), resolved: c.resolved }))}
          canComment={canComment(user.role) && user.role !== "VIEWER"}
        />
      </div>

      <Link href={`/knowledge/${article.id}/versions`} className="text-sm text-[var(--muted)] hover:text-white">
        View version history →
      </Link>
    </div>
  );
}
