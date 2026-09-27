import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewArticle, ROLE_LABELS } from "@/lib/rbac";
import { StatusBadge, TypeBadge } from "@/components/Badges";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = { id: (session.user as any).id, role: (session.user as any).role };

  const [allArticles, myDrafts, favorites] = await Promise.all([
    prisma.article.findMany({
      include: { author: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    prisma.article.findMany({
      where: { authorId: user.id, status: { in: ["DRAFT", "IN_REVIEW"] } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.favorite.findMany({
      where: { userId: user.id },
      include: { article: { include: { author: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const visible = allArticles.filter((a) => canViewArticle(user, a));
  const stats = {
    total: visible.length,
    published: visible.filter((a) => a.status === "PUBLISHED").length,
    drafts: visible.filter((a) => a.status === "DRAFT" && a.authorId === user.id).length,
    quickFixes: visible.filter((a) => a.type === "QUICK_FIX").length,
    commands: visible.filter((a) => a.type === "COMMAND").length,
  };

  const recentlyUpdated = visible.slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {session.user?.name?.split(" ")[0]}.</h1>
          <p className="text-[var(--muted)] text-sm">{ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/knowledge" className="btn">Search Knowledge</Link>
          <Link href="/knowledge/new" className="btn btn-primary">+ New Knowledge</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Total Articles" value={stats.total} />
        <Stat label="Published" value={stats.published} />
        <Stat label="My Drafts" value={stats.drafts} />
        <Stat label="Quick Fixes" value={stats.quickFixes} />
        <Stat label="Commands" value={stats.commands} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Recently Updated">
          {recentlyUpdated.map((a) => (
            <ArticleRow key={a.id} id={a.id} title={a.title} status={a.status} type={a.type} author={a.author.name} />
          ))}
          {recentlyUpdated.length === 0 && <Empty />}
        </Section>

        <Section title="My Drafts">
          {myDrafts.map((a) => (
            <ArticleRow key={a.id} id={a.id} title={a.title} status={a.status} type={a.type} />
          ))}
          {myDrafts.length === 0 && <Empty text="No drafts in progress." />}
        </Section>

        <Section title="Favorites">
          {favorites.map((f) => (
            <ArticleRow key={f.article.id} id={f.article.id} title={f.article.title} status={f.article.status} type={f.article.type} author={f.article.author.name} />
          ))}
          {favorites.length === 0 && <Empty text="Star an article to pin it here." />}
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ text = "Nothing here yet." }: { text?: string }) {
  return <div className="text-sm text-[var(--muted)]">{text}</div>;
}

function ArticleRow({ id, title, status, type, author }: { id: string; title: string; status: string; type: string; author?: string }) {
  return (
    <Link href={`/knowledge/${id}`} className="flex items-center justify-between gap-2 py-1.5 border-b border-[var(--border)] last:border-0 hover:opacity-80">
      <span className="text-sm truncate">{title}</span>
      <span className="flex gap-1 shrink-0">
        <TypeBadge type={type} />
        <StatusBadge status={status} />
      </span>
    </Link>
  );
}
