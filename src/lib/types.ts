// SQLite (used for local/dev) has no native enum support, so the
// corresponding Prisma model fields are plain Strings — see the note at
// the top of prisma/schema.prisma. These TypeScript union types give the
// app layer the same safety a real enum would, and match the zod schemas
// in src/lib/validation.ts that actually enforce the allowed values on
// every write.

export type Role = "GLOBAL_ADMIN" | "SENIOR_TECHNICIAN" | "MID_TECHNICIAN" | "INTERN" | "VIEWER";

export type ArticleStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";

export type Visibility =
  | "PUBLIC_TO_TEAM"
  | "TECHNICIANS_ONLY"
  | "SENIOR_TECH_ONLY"
  | "ADMIN_ONLY"
  | "PRIVATE"
  | "SENSITIVE";

export type ArticleType = "SOP" | "TROUBLESHOOTING" | "QUICK_FIX" | "COMMAND" | "CHECKLIST" | "KNOWN_ISSUE";

export type StepType =
  | "TEXT"
  | "COMMAND"
  | "WARNING"
  | "NOTE"
  | "SCREENSHOT"
  | "CHECKPOINT"
  | "DECISION"
  | "LINK";
