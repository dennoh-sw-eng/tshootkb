"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import ConfirmDialog from "./ConfirmDialog";

export default function ArticleActions({
  articleId,
  status,
  isFavorited,
  canEdit,
  canPublish,
  canArchive,
  canDeletePermanently,
  isAuthor,
}: {
  articleId: string;
  status: string;
  isFavorited: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canDeletePermanently: boolean;
  isAuthor: boolean;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(isFavorited);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function toggleFavorite() {
    const res = await fetch(`/api/articles/${articleId}/favorite`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setFavorited(d.favorited);
    }
  }

  async function submitForReview() {
    setBusy(true);
    const res = await fetch(`/api/articles/${articleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_REVIEW" }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError((await res.json()).error);
  }

  async function publish() {
    setBusy(true);
    const res = await fetch(`/api/articles/${articleId}/publish`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError((await res.json()).error);
  }

  async function archive() {
    setBusy(true);
    const res = await fetch(`/api/articles/${articleId}`, { method: "DELETE" });
    setBusy(false);
    setConfirmArchive(false);
    if (res.ok) router.refresh();
    else setError((await res.json()).error);
  }

  async function permanentlyDelete() {
    setBusy(true);
    const res = await fetch(`/api/articles/${articleId}?permanent=1`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    setBusy(false);
    setConfirmDelete(false);
    if (res.ok) router.push("/knowledge");
    else setError((await res.json()).error);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={toggleFavorite} className="btn" title="Favorite">
        {favorited ? "★ Favorited" : "☆ Favorite"}
      </button>
      <Link href={`/knowledge/${articleId}/versions`} className="btn">History</Link>
      {canEdit && <Link href={`/knowledge/${articleId}/edit`} className="btn">Edit</Link>}
      {canEdit && isAuthor && status === "DRAFT" && (
        <button onClick={submitForReview} className="btn" disabled={busy}>Submit for Review</button>
      )}
      {canPublish && status !== "PUBLISHED" && status !== "ARCHIVED" && (
        <button onClick={publish} className="btn btn-primary" disabled={busy}>Publish</button>
      )}
      {canArchive && status !== "ARCHIVED" && (
        <button onClick={() => setConfirmArchive(true)} className="btn" disabled={busy}>Archive</button>
      )}
      {canDeletePermanently && (
        <button onClick={() => setConfirmDelete(true)} className="btn btn-danger" disabled={busy}>Delete Permanently</button>
      )}

      {error && <div className="w-full text-sm text-red-300">{error}</div>}

      <ConfirmDialog
        open={confirmArchive}
        title="Archive this knowledge article?"
        message="It will be hidden from normal search and browsing, but its content and version history are preserved. You can restore it later from an admin view of archived content."
        confirmLabel="Archive"
        onConfirm={archive}
        onCancel={() => setConfirmArchive(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Permanently delete this knowledge article?"
        message="This removes the article and all of its version history forever. This cannot be undone. Consider Archive instead unless you're certain."
        confirmPhrase="DELETE"
        confirmLabel="Delete Forever"
        danger
        onConfirm={permanentlyDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
