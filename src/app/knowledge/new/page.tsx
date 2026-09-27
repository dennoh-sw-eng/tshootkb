"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { value: "SOP", label: "SOP" },
  { value: "TROUBLESHOOTING", label: "Troubleshooting Guide" },
  { value: "QUICK_FIX", label: "Quick Fix" },
  { value: "COMMAND", label: "Command" },
  { value: "CHECKLIST", label: "Checklist" },
  { value: "KNOWN_ISSUE", label: "Known Issue" },
];

export default function NewKnowledgePage() {
  const router = useRouter();
  const [type, setType] = useState("SOP");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [visibility, setVisibility] = useState("PUBLIC_TO_TEAM");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || []));
  }, []);

  async function save() {
    if (!title.trim() || !description.trim()) {
      setError("Give it at least a title and short description — you can fill in everything else later.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, type, categoryId: categoryId || null, visibility }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save. Please try again.");
      return;
    }
    router.push(`/knowledge/${data.id}/edit`);
  }

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">+ New Knowledge</h1>

      <div>
        <label className="text-xs text-[var(--muted)]">Type</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`btn ${type === t.value ? "btn-primary" : ""}`}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-red-300 bg-red-950/40 border border-red-800 rounded-lg p-2">{error}</div>}

      <div>
        <label className="text-xs text-[var(--muted)]">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. How to Rename a Network Printer Locally" />
      </div>

      <div>
        <label className="text-xs text-[var(--muted)]">Short description / problem statement</label>
        <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[var(--muted)]">Category</label>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Uncategorized</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Visibility</label>
          <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="PUBLIC_TO_TEAM">👥 Team</option>
            <option value="TECHNICIANS_ONLY">🔧 Technicians only</option>
            <option value="SENIOR_TECH_ONLY">🛡️ Senior tech only</option>
            <option value="ADMIN_ONLY">🔒 Admin only</option>
            <option value="PRIVATE">🔏 Private</option>
            <option value="SENSITIVE">⚠️ Sensitive</option>
          </select>
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save Draft & Add Steps"}
      </button>
    </div>
  );
}
