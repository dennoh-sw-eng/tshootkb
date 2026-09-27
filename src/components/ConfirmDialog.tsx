"use client";

import { useState } from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmPhrase,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmPhrase?: string; // if set, user must type this exact phrase
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  if (!open) return null;

  const canConfirm = !confirmPhrase || typed === confirmPhrase;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card p-5 max-w-sm w-full">
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-[var(--muted)] mb-4">{message}</p>
        {confirmPhrase && (
          <input
            className="input mb-4"
            placeholder={`Type ${confirmPhrase} to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        )}
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            disabled={!canConfirm}
            onClick={onConfirm}
            style={{ opacity: canConfirm ? 1 : 0.5 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
