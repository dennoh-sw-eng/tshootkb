import { createClient } from "@supabase/supabase-js";

// Server-only — this uses the Supabase service role key, which bypasses
// row-level security and must never be sent to the browser. It's only
// imported from API routes (server code), never from a "use client" file.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const ATTACHMENTS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "attachments";
