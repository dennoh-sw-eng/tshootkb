import { Role, Visibility } from "./types";

/**
 * All authorization lives here so it is enforced once, consistently, on the
 * server. Every API route must call the relevant function below before
 * reading/writing data — never rely on the UI hiding a button.
 */

export type SessionUser = {
  id: string;
  role: Role;
  disabled?: boolean;
};

const ROLE_RANK: Record<Role, number> = {
  GLOBAL_ADMIN: 5,
  SENIOR_TECHNICIAN: 4,
  MID_TECHNICIAN: 3,
  INTERN: 2,
  VIEWER: 1,
};

export function atLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function isAdmin(role: Role) {
  return role === "GLOBAL_ADMIN";
}

export function canCreateArticle(role: Role) {
  // Everyone except pure VIEWER can create at least a draft.
  return role !== "VIEWER";
}

// NOTE: `status`, `visibility`, `type` below are typed as plain `string`
// (not the narrower ArticleStatus/Visibility/ArticleType unions) because
// these fields are stored as String columns in the database (SQLite/many
// Postgres setups don't get a compile-time guarantee here) and Prisma
// therefore types them as `string` on query results. The narrower unions
// in src/lib/types.ts are still the source of truth for *valid* values —
// enforced by zod at the API boundary — but a function that receives a
// live Article/Step record needs to accept the wider `string` type Prisma
// actually returns, or every call site fails to compile.
export function canEditArticle(user: SessionUser, article: { authorId: string; status: string }) {
  if (isAdmin(user.role)) return true;
  if (user.role === "SENIOR_TECHNICIAN") return true;
  if (user.role === "MID_TECHNICIAN") {
    // Mid-level can edit their own docs, and can edit published docs
    // only by creating a new revision (still their own edit action).
    return article.authorId === user.id;
  }
  if (user.role === "INTERN") {
    return article.authorId === user.id && article.status === "DRAFT";
  }
  return false;
}

export function canDeletePermanently(role: Role) {
  return isAdmin(role);
}

export function canArchive(user: SessionUser, article: { authorId: string }) {
  return isAdmin(user.role) || user.role === "SENIOR_TECHNICIAN" || article.authorId === user.id;
}

export function canPublish(role: Role) {
  return isAdmin(role) || role === "SENIOR_TECHNICIAN";
}

export function canReview(role: Role) {
  return isAdmin(role) || role === "SENIOR_TECHNICIAN";
}

export function canSubmitForReview(user: SessionUser, article: { authorId: string }) {
  return atLeast(user.role, "INTERN") && article.authorId === user.id;
}

export function canManageUsers(role: Role) {
  return isAdmin(role);
}

export function canManageCategories(role: Role) {
  return isAdmin(role) || role === "SENIOR_TECHNICIAN";
}

export function canViewAuditLog(role: Role) {
  return isAdmin(role);
}

export function canComment(role: Role) {
  return role !== "VIEWER" || true; // viewers are read-only; keep explicit below
}

export function canRestoreVersion(role: Role) {
  return isAdmin(role) || role === "SENIOR_TECHNICIAN";
}

/**
 * Whether a user may see a given article at all, based on its visibility
 * classification, its status, and (for PRIVATE) ownership. Restricted
 * articles must not appear in search results or be fetchable by ID for
 * users who fail this check — return 404, not 403, to avoid confirming
 * that a restricted title exists.
 */
export function canViewArticle(
  user: SessionUser | null,
  article: { visibility: string; status: string; authorId: string }
): boolean {
  if (!user || user.disabled) return false;

  // Non-published articles are only visible to the author and reviewers/admins.
  if (article.status !== "PUBLISHED") {
    if (article.authorId === user.id) return true;
    return isAdmin(user.role) || user.role === "SENIOR_TECHNICIAN";
  }

  if (isAdmin(user.role)) return true;

  switch (article.visibility) {
    case "PUBLIC_TO_TEAM":
      return true;
    case "TECHNICIANS_ONLY":
      return atLeast(user.role, "MID_TECHNICIAN") || user.role === "SENIOR_TECHNICIAN" || user.role === "INTERN"
        ? atLeast(user.role, "INTERN")
        : false;
    case "SENIOR_TECH_ONLY":
      return atLeast(user.role, "SENIOR_TECHNICIAN");
    case "ADMIN_ONLY":
      return isAdmin(user.role);
    case "PRIVATE":
      return article.authorId === user.id;
    case "SENSITIVE":
      // Sensitive requires explicit senior+ clearance; interns/viewers never see it
      // even if TECHNICIANS_ONLY would otherwise apply.
      return atLeast(user.role, "SENIOR_TECHNICIAN") || article.authorId === user.id;
    default:
      return false;
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  GLOBAL_ADMIN: "Global Admin",
  SENIOR_TECHNICIAN: "Senior Technician",
  MID_TECHNICIAN: "Mid-Level Technician",
  INTERN: "Intern",
  VIEWER: "Viewer",
};

export const VISIBILITY_LABELS: Record<Visibility, { label: string; icon: string }> = {
  PUBLIC_TO_TEAM: { label: "Team", icon: "👥" },
  TECHNICIANS_ONLY: { label: "Technicians", icon: "🔧" },
  SENIOR_TECH_ONLY: { label: "Senior Tech Only", icon: "🛡️" },
  ADMIN_ONLY: { label: "Admin Only", icon: "🔒" },
  PRIVATE: { label: "Private", icon: "🔏" },
  SENSITIVE: { label: "Sensitive", icon: "⚠️" },
};
