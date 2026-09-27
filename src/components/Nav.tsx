"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const KNOWLEDGE_LINKS = [
  { href: "/knowledge", label: "All Knowledge" },
  { href: "/knowledge?type=SOP", label: "SOPs" },
  { href: "/knowledge?type=TROUBLESHOOTING", label: "Troubleshooting" },
  { href: "/knowledge?type=QUICK_FIX", label: "Quick Fixes" },
  { href: "/knowledge?type=CHECKLIST", label: "Checklists" },
  { href: "/knowledge?type=COMMAND", label: "Commands" },
  { href: "/knowledge?type=KNOWN_ISSUE", label: "Known Issues" },
];

export default function Nav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status !== "authenticated") return null;
  const role = (session.user as any).role;
  const isAdmin = role === "GLOBAL_ADMIN";
  const isSenior = role === "SENIOR_TECHNICIAN" || isAdmin;

  return (
    <aside className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-[var(--border)] p-4 md:min-h-screen">
      <div className="font-bold text-lg mb-1">🛠️ T-Shoot KB</div>
      <div className="text-xs text-[var(--muted)] mb-4">{session.user?.name} · {role.replace("_", " ")}</div>

      <nav className="space-y-4 text-sm">
        <div>
          <Link className={`block py-1 ${pathname === "/" ? "text-white font-semibold" : "text-[var(--muted)]"}`} href="/">Dashboard</Link>
        </div>

        <div>
          <div className="uppercase text-xs text-[var(--muted)] mb-1 tracking-wide">Knowledge</div>
          {KNOWLEDGE_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="block py-1 text-[var(--muted)] hover:text-white">
              {l.label}
            </Link>
          ))}
        </div>

        <div>
          <div className="uppercase text-xs text-[var(--muted)] mb-1 tracking-wide">You</div>
          <Link href="/knowledge?favorites=1" className="block py-1 text-[var(--muted)] hover:text-white">Favorites</Link>
          <Link href="/knowledge?mine=1" className="block py-1 text-[var(--muted)] hover:text-white">My Drafts</Link>
        </div>

        {isSenior && (
          <div>
            <div className="uppercase text-xs text-[var(--muted)] mb-1 tracking-wide">Administration</div>
            {isAdmin && <Link href="/admin/users" className="block py-1 text-[var(--muted)] hover:text-white">Users</Link>}
            <Link href="/admin/categories" className="block py-1 text-[var(--muted)] hover:text-white">Categories</Link>
            {isAdmin && <Link href="/admin/audit-log" className="block py-1 text-[var(--muted)] hover:text-white">Audit Log</Link>}
          </div>
        )}
      </nav>

      <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn mt-6 w-full justify-center text-xs">
        Sign out
      </button>
    </aside>
  );
}
