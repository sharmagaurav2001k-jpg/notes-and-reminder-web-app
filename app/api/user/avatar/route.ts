import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { uploadAvatar, deleteAvatar } from "@/lib/supabase/storage";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, GIF, WebP allowed" }, { status: 400 });
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const avatarUrl = await uploadAvatar(userId, buffer, file.type);

    // Update user's avatarUrl in database
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return NextResponse.json({ avatarUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await deleteAvatar(userId);

    // Remove avatarUrl from user
    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
  }
}
