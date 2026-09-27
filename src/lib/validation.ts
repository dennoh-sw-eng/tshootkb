import { z } from "zod";

export const stepSchema = z.object({
  id: z.string().optional(), // present = existing step, absent = new
  order: z.number().int().min(0),
  type: z.enum(["TEXT", "COMMAND", "WARNING", "NOTE", "SCREENSHOT", "CHECKPOINT", "DECISION", "LINK"]),
  title: z.string().max(300).optional().nullable(),
  content: z.string().max(20000).optional().nullable(),
  command: z.string().max(20000).optional().nullable(),
  shell: z.string().max(50).optional().nullable(),
  expectedResult: z.string().max(5000).optional().nullable(),
  warning: z.string().max(5000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  linkUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  linkLabel: z.string().max(300).optional().nullable(),
  decisionYesStepOrder: z.number().int().optional().nullable(),
  decisionNoStepOrder: z.number().int().optional().nullable(),
});

export const articleCreateSchema = z.object({
  title: z.string().min(3).max(300),
  description: z.string().min(1).max(3000),
  type: z.enum(["SOP", "TROUBLESHOOTING", "QUICK_FIX", "COMMAND", "CHECKLIST", "KNOWN_ISSUE"]),
  categoryId: z.string().optional().nullable(),
  visibility: z
    .enum(["PUBLIC_TO_TEAM", "TECHNICIANS_ONLY", "SENIOR_TECH_ONLY", "ADMIN_ONLY", "PRIVATE", "SENSITIVE"])
    .default("PUBLIC_TO_TEAM"),
  priority: z.string().max(50).optional().nullable(),
  difficulty: z.string().max(50).optional().nullable(),
  audience: z.string().max(200).optional().nullable(),
  estimatedTime: z.string().max(50).optional().nullable(),
  requiredAccessLevel: z.string().max(200).optional().nullable(),
  internalNotes: z.string().max(5000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
});

export const articleUpdateSchema = articleCreateSchema.partial().extend({
  status: z.enum(["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
  changeSummary: z.string().max(500).optional(),
});

export const stepsReplaceSchema = z.object({
  steps: z.array(stepSchema).max(200),
  changeSummary: z.string().max(500).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(3000),
});

export const userCreateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: z.enum(["GLOBAL_ADMIN", "SENIOR_TECHNICIAN", "MID_TECHNICIAN", "INTERN", "VIEWER"]),
});

export const userUpdateSchema = z.object({
  role: z.enum(["GLOBAL_ADMIN", "SENIOR_TECHNICIAN", "MID_TECHNICIAN", "INTERN", "VIEWER"]).optional(),
  disabled: z.boolean().optional(),
});

export const setupSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
