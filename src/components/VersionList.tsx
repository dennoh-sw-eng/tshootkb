"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";

type Version = { versionNumber: number; changeSummary: string | null; createdBy: string; createdAt: string };

export default function VersionList({ articleId, versions, canRestore }: { articleId: string; versions: Version[]; canRestore: boolean }) {
  const router = useRouter();
  const [target, setTarget] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    if (target == null) return;
    setBusy(true);
    const res = await fetch(`/api/articles/${articleId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionNumber: target }),
    });
    setBusy(false);
    setTarget(null);
    if (res.ok) router.push(`/knowledge/${articleId}`);
    else setError((await res.json()).error);
  }

  return (
    <div className="space-y-2">
      {error && <div className="text-sm text-red-300">{error}</div>}
      {versions.map((v) => (
        <div key={v.versionNumber} className="card p-3 flex items-center justify-between text-sm">
          <div>
            <div className="font-semibold">Version {v.versionNumber}.0</div>
            <div className="text-xs text-[var(--muted)]">{v.changeSummary || "No summary"} · {v.createdBy} · {new Date(v.createdAt).toLocaleString()}</div>
          </div>
          {canRestore && (
            <button className="btn" onClick={() => setTarget(v.versionNumber)} disabled={busy}>Restore</button>
          )}
        </div>
      ))}
      {versions.length === 0 && <div className="text-sm text-[var(--muted)]">No versions yet — publish this article to start version history.</div>}

      <ConfirmDialog
        open={target != null}
        title={`Restore version ${target}?`}
        message="The article's current content will be replaced with this version's content. Nothing is lost — this creates a new version on top, so you can always undo by restoring again."
        confirmLabel="Restore"
        onConfirm={restore}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
