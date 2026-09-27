const STATUS_STYLE: Record<string, string> = {
  DRAFT: "text-yellow-300 border-yellow-700",
  IN_REVIEW: "text-blue-300 border-blue-700",
  PUBLISHED: "text-green-300 border-green-700",
  ARCHIVED: "text-gray-400 border-gray-600",
};

const VISIBILITY_META: Record<string, { icon: string; label: string }> = {
  PUBLIC_TO_TEAM: { icon: "👥", label: "Team" },
  TECHNICIANS_ONLY: { icon: "🔧", label: "Technicians" },
  SENIOR_TECH_ONLY: { icon: "🛡️", label: "Senior Tech" },
  ADMIN_ONLY: { icon: "🔒", label: "Admin Only" },
  PRIVATE: { icon: "🔏", label: "Private" },
  SENSITIVE: { icon: "⚠️", label: "Sensitive" },
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_STYLE[status] || ""}`}>{status.replace("_", " ")}</span>;
}

export function VisibilityBadge({ visibility }: { visibility: string }) {
  const meta = VISIBILITY_META[visibility] || { icon: "❔", label: visibility };
  return (
    <span className="badge">
      {meta.icon} {meta.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  return <span className="badge">{type.replace("_", " ")}</span>;
}
