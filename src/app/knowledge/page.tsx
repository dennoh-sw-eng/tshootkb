"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { StatusBadge, TypeBadge, VisibilityBadge } from "@/components/Badges";

type Result = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  visibility: string;
  category: string | null;
  tags: string[];
  author: string;
  updatedAt: string;
  isDemo: boolean;
};

export default function KnowledgePage() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<Result[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/articles?${searchParams.toString()}`)
      .then((r) => r.json())
      .then((d) => setResults(d.results || []))
      .finally(() => setLoading(false));
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Knowledge</h1>
        <Link href="/knowledge/new" className="btn btn-primary">+ New Knowledge</Link>
      </div>

      <SearchBar categories={categories} />

      {loading && <div className="text-sm text-[var(--muted)]">Searching…</div>}
      {!loading && results.length === 0 && (
        <div className="text-sm text-[var(--muted)]">No knowledge articles matched. Try a different search or filter.</div>
      )}

      <div className="space-y-2">
        {results.map((r) => (
          <Link key={r.id} href={`/knowledge/${r.id}`} className="card p-4 flex flex-col gap-1.5 hover:border-[var(--accent)] transition-colors">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{r.title} {r.isDemo && <span className="text-xs text-[var(--muted)]">(DEMO)</span>}</span>
              <div className="flex gap-1 shrink-0">
                <TypeBadge type={r.type} />
                <StatusBadge status={r.status} />
                <VisibilityBadge visibility={r.visibility} />
              </div>
            </div>
            <p className="text-sm text-[var(--muted)] line-clamp-2">{r.description}</p>
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>{r.category || "Uncategorized"} · {r.tags.slice(0, 4).join(", ")}</span>
              <span>{r.author} · {new Date(r.updatedAt).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
