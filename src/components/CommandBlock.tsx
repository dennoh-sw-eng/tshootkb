"use client";

import { useState } from "react";

export default function CommandBlock({ command, shell }: { command: string; shell?: string | null }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may be unavailable (e.g. insecure context) — fail quietly.
    }
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-black/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 text-xs text-[var(--muted)]">
        <span>{shell || "Command"}</span>
        <button onClick={copy} className="btn text-xs py-0.5 px-2">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm whitespace-pre-wrap break-words">{command}</pre>
    </div>
  );
}
