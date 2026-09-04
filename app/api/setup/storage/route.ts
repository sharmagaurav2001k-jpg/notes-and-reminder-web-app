import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";
import { ensureStorageBuckets } from "@/lib/supabase/storage";

/**
 * One-time setup endpoint to create Supabase storage buckets.
 * Call this once after deployment to initialize the avatars and attachments buckets.
 *
 * GET /api/setup/storage — creates buckets if they don't exist
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureStorageBuckets();

    return NextResponse.json({
      success: true,
      message: "Storage buckets created (avatars: public, 2MB | attachments: private, 10MB)",
      buckets: [
        { name: "avatars", public: true, maxSize: "2MB", types: ["image/jpeg", "image/png", "image/gif", "image/webp"] },
        { name: "attachments", public: false, maxSize: "10MB", types: ["images", "pdf", "text", "docx", "xlsx"] },
      ],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Setup failed" }, { status: 500 });
  }
}
