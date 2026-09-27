import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canEditArticle } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { supabaseAdmin, ATTACHMENTS_BUCKET } from "@/lib/supabase";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]);
const MAX_BYTES = (Number(process.env.MAX_UPLOAD_SIZE_MB) || 10) * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });

  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) return NextResponse.json({ error: "That knowledge article could not be found." }, { status: 404 });
  if (!canEditArticle(user, article)) {
    return NextResponse.json({ error: "You do not have permission to modify this article." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const stepId = (form.get("stepId") as string) || null;
  const caption = (form.get("caption") as string) || null;

  if (!file) return NextResponse.json({ error: "No file was provided." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only images (PNG, JPEG, WEBP, GIF) and PDFs can be attached." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File is too large. The limit is ${MAX_BYTES / 1024 / 1024} MB.` }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const objectPath = `${article.id}/${randomUUID()}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(objectPath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Supabase upload failed", uploadError);
    return NextResponse.json({ error: "Could not store the file. Please try again." }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(objectPath);

  const attachment = await prisma.attachment.create({
    data: {
      articleId: article.id,
      stepId,
      filename: file.name,
      path: publicUrlData.publicUrl,
      caption,
      mimeType: file.type,
      size: file.size,
    },
  });

  await logAudit({ userId: user.id, action: "ATTACHMENT_UPLOADED", targetType: "Article", targetId: article.id, details: file.name });

  return NextResponse.json(attachment, { status: 201 });
}
