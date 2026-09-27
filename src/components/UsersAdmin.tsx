"use client";

import { useEffect, useState } from "react";
import { ROLE_LABELS } from "@/lib/rbac";

type User = { id: string; name: string; email: string; role: string; disabled: boolean; createdAt: string };

const ROLES = ["GLOBAL_ADMIN", "SENIOR_TECHNICIAN", "MID_TECHNICIAN", "INTERN", "VIEWER"];

export default function UsersAdmin({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/users").then((r) => r.json()).then((d) => {
      setUsers(d.users || []);
      setLoading(false);
    });
  }

  useEffect(load, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setName(""); setEmail(""); setPassword(""); setRole("VIEWER");
    setShowInvite(false);
    load();
  }

  async function updateUser(id: string, patch: Partial<{ role: string; disabled: boolean }>) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) load();
    else setError((await res.json()).error);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users</h1>
        <button className="btn btn-primary" onClick={() => setShowInvite((s) => !s)}>+ Create User</button>
      </div>

      {error && <div className="text-sm text-red-300 bg-red-950/40 border border-red-800 rounded-lg p-2">{error}</div>}

      {showInvite && (
        <form onSubmit={invite} className="card p-4 space-y-3 max-w-md">
          <div className="text-sm text-[var(--muted)]">
            Team Access: this creates the account directly with the password you set here — share it with them out of band and ask them to change it after first sign-in. Wire up an email provider for real invite emails.
          </div>
          <input className="input" placeholder="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Temporary password (min 8 chars)" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS]}</option>)}
          </select>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create User"}</button>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-[var(--muted)]">Loading…</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="card p-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-sm">{u.name} {u.disabled && <span className="badge ml-1">Disabled</span>}</div>
                <div className="text-xs text-[var(--muted)]">{u.email}</div>
              </div>
              {u.id === currentUserId ? (
                <span className="badge">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]} (you)</span>
              ) : (
                <div className="flex items-center gap-2">
                  <select className="input w-auto text-xs" value={u.role} onChange={(e) => updateUser(u.id, { role: e.target.value })}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS]}</option>)}
                  </select>
                  <button className="btn text-xs" onClick={() => updateUser(u.id, { disabled: !u.disabled })}>
                    {u.disabled ? "Enable" : "Disable"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
