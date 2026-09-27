"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";

const STEP_TYPES = ["TEXT", "COMMAND", "WARNING", "NOTE", "SCREENSHOT", "CHECKPOINT", "DECISION", "LINK"];

type Step = {
  id?: string;
  _key: string; // client-only stable key for React lists
  order: number;
  type: string;
  title?: string | null;
  content?: string | null;
  command?: string | null;
  shell?: string | null;
  expectedResult?: string | null;
  warning?: string | null;
  notes?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  decisionYesStepOrder?: number | null;
  decisionNoStepOrder?: number | null;
  attachments?: any[];
};

let keyCounter = 0;
const newKey = () => `k${Date.now()}_${keyCounter++}`;

export default function EditorClient({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<any>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingSteps, setSavingSteps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/articles/${articleId}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([a, c]) => {
      setArticle(a);
      setTagsInput((a.tags || []).join(", "));
      setSteps(
        (a.steps || []).map((s: any) => ({ ...s, _key: newKey() }))
      );
      setCategories(c.categories || []);
      setLoading(false);
    });
  }, [articleId]);

  function updateField(field: string, value: any) {
    setArticle((a: any) => ({ ...a, [field]: value }));
  }

  async function saveMeta() {
    setSavingMeta(true);
    setError(null);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await fetch(`/api/articles/${articleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: article.title,
        description: article.description,
        type: article.type,
        categoryId: article.categoryId,
        visibility: article.visibility,
        priority: article.priority,
        difficulty: article.difficulty,
        audience: article.audience,
        estimatedTime: article.estimatedTime,
        requiredAccessLevel: article.requiredAccessLevel,
        internalNotes: article.internalNotes,
        tags,
      }),
    });
    const data = await res.json();
    setSavingMeta(false);
    if (!res.ok) setError(data.error);
    else setNotice("Details saved.");
  }

  function addStep(afterIndex?: number) {
    const step: Step = { _key: newKey(), order: 0, type: "TEXT", title: "", content: "" };
    setSteps((prev) => {
      const arr = [...prev];
      const insertAt = afterIndex == null ? arr.length : afterIndex + 1;
      arr.splice(insertAt, 0, step);
      return arr.map((s, i) => ({ ...s, order: i }));
    });
  }

  function duplicateStep(index: number) {
    setSteps((prev) => {
      const arr = [...prev];
      const copy = { ...arr[index], _key: newKey(), id: undefined };
      arr.splice(index + 1, 0, copy);
      return arr.map((s, i) => ({ ...s, order: i }));
    });
  }

  function removeStep(key: string) {
    setSteps((prev) => prev.filter((s) => s._key !== key).map((s, i) => ({ ...s, order: i })));
    setDeleteKey(null);
  }

  function move(index: number, dir: -1 | 1) {
    setSteps((prev) => {
      const arr = [...prev];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr.map((s, i) => ({ ...s, order: i }));
    });
  }

  function updateStep(key: string, field: string, value: any) {
    setSteps((prev) => prev.map((s) => (s._key === key ? { ...s, [field]: value } : s)));
  }

  async function saveSteps() {
    setSavingSteps(true);
    setError(null);
    const payload = steps.map(({ _key, attachments, ...rest }) => rest);
    const res = await fetch(`/api/articles/${articleId}/steps`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps: payload }),
    });
    const data = await res.json();
    setSavingSteps(false);
    if (!res.ok) setError(data.error);
    else {
      setNotice("Steps saved.");
      router.refresh();
    }
  }

  async function uploadAttachment(stepId: string | undefined, file: File) {
    if (!stepId) {
      setError("Save the steps first so this step has an ID, then attach an image.");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    form.append("stepId", stepId);
    const res = await fetch(`/api/articles/${articleId}/attachments`, { method: "POST", body: form });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    const attachment = await res.json();
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, attachments: [...(s.attachments || []), attachment] } : s)));
  }

  if (loading) return <div className="text-sm text-[var(--muted)]">Loading…</div>;
  if (!article || article.error) return <div className="text-sm text-red-300">{article?.error || "Not found."}</div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Editing: {article.title || "Untitled"}</h1>
        <Link href={`/knowledge/${articleId}`} className="btn">View Article</Link>
      </div>

      {error && <div className="text-sm text-red-300 bg-red-950/40 border border-red-800 rounded-lg p-2">{error}</div>}
      {notice && <div className="text-sm text-green-300 bg-green-950/30 border border-green-800 rounded-lg p-2">{notice}</div>}

      {/* Metadata */}
      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Details</h2>
        <div>
          <label className="text-xs text-[var(--muted)]">Title</label>
          <input className="input" value={article.title || ""} onChange={(e) => updateField("title", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Description / problem statement</label>
          <textarea className="input" rows={2} value={article.description || ""} onChange={(e) => updateField("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--muted)]">Category</label>
            <select className="input" value={article.categoryId || ""} onChange={(e) => updateField("categoryId", e.target.value || null)}>
              <option value="">Uncategorized</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)]">Visibility</label>
            <select className="input" value={article.visibility} onChange={(e) => updateField("visibility", e.target.value)}>
              <option value="PUBLIC_TO_TEAM">👥 Team</option>
              <option value="TECHNICIANS_ONLY">🔧 Technicians only</option>
              <option value="SENIOR_TECH_ONLY">🛡️ Senior tech only</option>
              <option value="ADMIN_ONLY">🔒 Admin only</option>
              <option value="PRIVATE">🔏 Private</option>
              <option value="SENSITIVE">⚠️ Sensitive</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted)]">Priority</label>
            <input className="input" value={article.priority || ""} onChange={(e) => updateField("priority", e.target.value)} placeholder="Low / Medium / High / Critical" />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)]">Difficulty</label>
            <input className="input" value={article.difficulty || ""} onChange={(e) => updateField("difficulty", e.target.value)} placeholder="Beginner / Intermediate / Advanced" />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)]">Audience</label>
            <input className="input" value={article.audience || ""} onChange={(e) => updateField("audience", e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)]">Estimated time</label>
            <input className="input" value={article.estimatedTime || ""} onChange={(e) => updateField("estimatedTime", e.target.value)} placeholder="e.g. 10 minutes" />
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Tags (comma-separated)</label>
          <input className="input" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="printer, spooler, windows11" />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Required access level (free text)</label>
          <input className="input" value={article.requiredAccessLevel || ""} onChange={(e) => updateField("requiredAccessLevel", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Internal notes (author/admin only)</label>
          <textarea className="input" rows={2} value={article.internalNotes || ""} onChange={(e) => updateField("internalNotes", e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={saveMeta} disabled={savingMeta}>
          {savingMeta ? "Saving…" : "Save Details"}
        </button>
      </section>

      {/* Steps */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Steps</h2>
          <button className="btn" onClick={() => addStep()}>+ Add Step</button>
        </div>

        {steps.map((step, i) => (
          <div key={step._key} className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="badge">Step {i + 1}</span>
              <div className="flex gap-1">
                <button className="btn text-xs" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button className="btn text-xs" onClick={() => move(i, 1)} disabled={i === steps.length - 1}>↓</button>
                <button className="btn text-xs" onClick={() => duplicateStep(i)}>Duplicate</button>
                <button className="btn text-xs" onClick={() => addStep(i)}>Insert Below</button>
                <button className="btn btn-danger text-xs" onClick={() => setDeleteKey(step._key)}>Delete</button>
              </div>
            </div>

            <select className="input" value={step.type} onChange={(e) => updateStep(step._key, "type", e.target.value)}>
              {STEP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <input className="input" placeholder="Step title (optional)" value={step.title || ""} onChange={(e) => updateStep(step._key, "title", e.target.value)} />
            <textarea className="input" rows={2} placeholder="Instruction / description" value={step.content || ""} onChange={(e) => updateStep(step._key, "content", e.target.value)} />

            {step.type === "COMMAND" && (
              <div className="grid grid-cols-3 gap-2">
                <select className="input col-span-1" value={step.shell || ""} onChange={(e) => updateStep(step._key, "shell", e.target.value)}>
                  <option value="">Shell…</option>
                  <option>PowerShell</option>
                  <option>CMD</option>
                  <option>Bash</option>
                  <option>SQL</option>
                </select>
                <textarea className="input col-span-2 font-mono text-sm" rows={2} placeholder="Command" value={step.command || ""} onChange={(e) => updateStep(step._key, "command", e.target.value)} />
              </div>
            )}

            {step.type === "WARNING" && (
              <textarea className="input" rows={2} placeholder="Warning text" value={step.warning || ""} onChange={(e) => updateStep(step._key, "warning", e.target.value)} />
            )}

            {step.type === "NOTE" && (
              <textarea className="input" rows={2} placeholder="Note text" value={step.notes || ""} onChange={(e) => updateStep(step._key, "notes", e.target.value)} />
            )}

            {step.type === "LINK" && (
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="https://…" value={step.linkUrl || ""} onChange={(e) => updateStep(step._key, "linkUrl", e.target.value)} />
                <input className="input" placeholder="Link label" value={step.linkLabel || ""} onChange={(e) => updateStep(step._key, "linkLabel", e.target.value)} />
              </div>
            )}

            {step.type === "DECISION" && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <input
                  className="input"
                  type="number"
                  placeholder="YES → step # (1-based)"
                  value={step.decisionYesStepOrder != null ? step.decisionYesStepOrder + 1 : ""}
                  onChange={(e) => updateStep(step._key, "decisionYesStepOrder", e.target.value ? Number(e.target.value) - 1 : null)}
                />
                <input
                  className="input"
                  type="number"
                  placeholder="NO → step # (1-based)"
                  value={step.decisionNoStepOrder != null ? step.decisionNoStepOrder + 1 : ""}
                  onChange={(e) => updateStep(step._key, "decisionNoStepOrder", e.target.value ? Number(e.target.value) - 1 : null)}
                />
              </div>
            )}

            <input className="input" placeholder="Expected result (optional)" value={step.expectedResult || ""} onChange={(e) => updateStep(step._key, "expectedResult", e.target.value)} />

            {step.type === "SCREENSHOT" && (
              <AttachmentUploader stepId={step.id} attachments={step.attachments} onUpload={(f) => uploadAttachment(step.id, f)} />
            )}
          </div>
        ))}

        {steps.length === 0 && <div className="text-sm text-[var(--muted)]">No steps yet — add the first one.</div>}

        <button className="btn btn-primary" onClick={saveSteps} disabled={savingSteps}>
          {savingSteps ? "Saving…" : "Save Steps"}
        </button>
      </section>

      <ConfirmDialog
        open={!!deleteKey}
        title="Delete this step?"
        message="This removes the step from the current draft of the article. Published versions already saved to history are unaffected."
        confirmLabel="Delete Step"
        danger
        onConfirm={() => deleteKey && removeStep(deleteKey)}
        onCancel={() => setDeleteKey(null)}
      />
    </div>
  );
}

function AttachmentUploader({ stepId, attachments, onUpload }: { stepId?: string; attachments?: any[]; onUpload: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(attachments || []).map((a) => (
          <img key={a.id} src={a.path} alt={a.caption || ""} className="h-16 rounded border border-[var(--border)]" />
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
        className="text-xs text-[var(--muted)]"
      />
      {!stepId && <div className="text-xs text-[var(--muted)]">Save steps once to enable screenshot uploads on this step.</div>}
    </div>
  );
}
