import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/user/whatsapp/preferences
 * Update WhatsApp notification settings
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { whatsappNotifications, whatsappDailyDigest } = body;

    const dataToUpdate: any = {};
    if (typeof whatsappNotifications === "boolean") {
      dataToUpdate.whatsappNotifications = whatsappNotifications;
    }
    if (typeof whatsappDailyDigest === "boolean") {
      dataToUpdate.whatsappDailyDigest = whatsappDailyDigest;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: dataToUpdate,
      select: {
        whatsappNumber: true,
        whatsappVerified: true,
        whatsappNotifications: true,
        whatsappDailyDigest: true,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: updatedUser,
    });
  } catch (error: any) {
    console.error("PATCH /api/user/whatsapp/preferences error:", error);
    return NextResponse.json({ error: error.message || "Failed to update preferences" }, { status: 500 });
  }
}
