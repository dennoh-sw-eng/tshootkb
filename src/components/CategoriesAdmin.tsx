"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type Category = { id: string; name: string; description: string | null; articleCount: number };

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    fetch("/api/categories").then((r) => r.json()).then((d) => {
      setCategories(d.categories || []);
      setLoading(false);
    });
  }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setName(""); setDescription("");
    load();
  }

  async function rename(id: string) {
    const newName = editing[id];
    if (!newName || !newName.trim()) return;
    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) load();
    else setError((await res.json()).error);
  }

  async function remove() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    if (res.ok) load();
    else setError((await res.json()).error);
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">Categories</h1>
      {error && <div className="text-sm text-red-300 bg-red-950/40 border border-red-800 rounded-lg p-2">{error}</div>}

      <form onSubmit={create} className="card p-4 space-y-2">
        <input className="input" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button className="btn btn-primary">Add Category</button>
      </form>

      {loading ? (
        <div className="text-sm text-[var(--muted)]">Loading…</div>
      ) : (
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="card p-3 flex items-center justify-between gap-2">
              <input
                className="input"
                value={editing[c.id] ?? c.name}
                onChange={(e) => setEditing((s) => ({ ...s, [c.id]: e.target.value }))}
              />
              <span className="text-xs text-[var(--muted)] shrink-0">{c.articleCount} articles</span>
              <button className="btn text-xs" onClick={() => rename(c.id)}>Save</button>
              <button className="btn btn-danger text-xs" onClick={() => setDeleteTarget(c)}>Delete</button>
            </div>
          ))}
          {categories.length === 0 && <div className="text-sm text-[var(--muted)]">No categories yet.</div>}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        message={`Articles in this category (${deleteTarget?.articleCount ?? 0}) will become Uncategorized rather than being deleted.`}
        confirmLabel="Delete Category"
        danger
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
