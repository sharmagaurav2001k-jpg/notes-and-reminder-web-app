import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";
import {
  uploadAttachment,
  listAttachments,
  deleteAttachment,
  getAttachmentSignedUrl,
} from "@/lib/supabase/storage";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: noteId } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const signedUrl = await uploadAttachment(userId, noteId, buffer, file.name, file.type);

    return NextResponse.json({ url: signedUrl, fileName: file.name, mimeType: file.type, size: file.size });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: noteId } = await params;
    const files = await listAttachments(userId, noteId);

    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (f) => ({
        ...f,
        url: await getAttachmentSignedUrl(userId, noteId, f.name),
      })),
    );

    return NextResponse.json({ files: filesWithUrls });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "List failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: noteId } = await params;
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("file");
    if (!fileName) return NextResponse.json({ error: "File name required" }, { status: 400 });

    await deleteAttachment(userId, noteId, fileName);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
  }
}
