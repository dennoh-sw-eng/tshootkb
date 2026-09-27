"use client";

import { useState } from "react";

type Comment = { id: string; content: string; user: { name: string } | string; createdAt: string; resolved: boolean };

export default function Comments({ articleId, initial, canComment }: { articleId: string; initial: Comment[]; canComment: boolean }) {
  const [comments, setComments] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/articles/${articleId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setComments((c) => [...c, data]);
    setText("");
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="text-sm border-b border-[var(--border)] pb-2">
          <div className="flex justify-between text-xs text-[var(--muted)]">
            <span>{typeof c.user === "string" ? c.user : c.user.name}</span>
            <span>{new Date(c.createdAt).toLocaleString()}</span>
          </div>
          <p>{c.content}</p>
        </div>
      ))}
      {comments.length === 0 && <div className="text-sm text-[var(--muted)]">No comments yet.</div>}

      {canComment && (
        <div className="flex gap-2 pt-2">
          <input className="input" placeholder="Add a comment…" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn" onClick={submit} disabled={busy}>Post</button>
        </div>
      )}
      {error && <div className="text-sm text-red-300">{error}</div>}
    </div>
  );
}
