import { supabaseAdmin } from "@/lib/supabase/server";

const AVATARS_BUCKET = "avatars";
const ATTACHMENTS_BUCKET = "attachments";

/* ------------------------------------------------------------------ */
/* Initialize buckets (call once from setup script or migration)       */
/* ------------------------------------------------------------------ */

export async function ensureStorageBuckets() {
  const buckets = [AVATARS_BUCKET, ATTACHMENTS_BUCKET];

  for (const bucket of buckets) {
    const { error } = await supabaseAdmin.storage.createBucket(bucket, {
      public: bucket === AVATARS_BUCKET, // avatars are public, attachments are private
      fileSizeLimit: bucket === AVATARS_BUCKET ? 2 * 1024 * 1024 : 10 * 1024 * 1024, // 2MB / 10MB
      allowedMimeTypes: bucket === AVATARS_BUCKET
        ? ["image/jpeg", "image/png", "image/gif", "image/webp"]
        : [
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf",
            "text/plain", "text/markdown",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ],
    });

    if (error && !error.message.includes("already exists")) {
      console.error(`Failed to create bucket ${bucket}:`, error.message);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Avatar Upload                                                       */
/* ------------------------------------------------------------------ */

export async function uploadAvatar(userId: string, file: File | Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.split("/")[1] || "png";
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, {
      contentType: mimeType,
      upsert: true, // overwrite existing avatar
    });

  if (error) throw new Error(`Avatar upload failed: ${error.message}`);

  // Get public URL
  const { data } = supabaseAdmin.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteAvatar(userId: string): Promise<void> {
  // List all files in user's avatar folder
  const { data: files } = await supabaseAdmin.storage
    .from(AVATARS_BUCKET)
    .list(userId);

  if (files && files.length > 0) {
    const paths = files.map(f => `${userId}/${f.name}`);
    await supabaseAdmin.storage.from(AVATARS_BUCKET).remove(paths);
  }
}

/* ------------------------------------------------------------------ */
/* Note Attachments                                                    */
/* ------------------------------------------------------------------ */

export interface AttachmentMeta {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: Date;
}

export async function uploadAttachment(
  userId: string,
  noteId: string,
  file: File | Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const path = `${userId}/${noteId}/${fileName}`;

  const { error } = await supabaseAdmin.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, file, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Attachment upload failed: ${error.message}`);

  // Generate a signed URL (valid 1 hour) since bucket is private
  const { data, error: urlError } = await supabaseAdmin.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 3600);

  if (urlError) throw new Error(`Signed URL failed: ${urlError.message}`);
  return data.signedUrl;
}

export async function listAttachments(userId: string, noteId: string) {
  const { data, error } = await supabaseAdmin.storage
    .from(ATTACHMENTS_BUCKET)
    .list(`${userId}/${noteId}`);

  if (error) throw new Error(`List attachments failed: ${error.message}`);
  return data || [];
}

export async function deleteAttachment(userId: string, noteId: string, fileName: string) {
  const path = `${userId}/${noteId}/${fileName}`;
  const { error } = await supabaseAdmin.storage
    .from(ATTACHMENTS_BUCKET)
    .remove([path]);

  if (error) throw new Error(`Delete attachment failed: ${error.message}`);
}

export async function getAttachmentSignedUrl(userId: string, noteId: string, fileName: string, expiresInSec: number = 3600) {
  const path = `${userId}/${noteId}/${fileName}`;
  const { data, error } = await supabaseAdmin.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresInSec);

  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}
