import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWhatsAppConfig, formatWhatsAppNumber, sendWhatsAppTextMessage } from "@/lib/whatsapp";

/**
 * GET /api/user/whatsapp
 * Fetch current user WhatsApp mapping, verification status, and magic connect details
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
        whatsappVerified: true,
        whatsappNotifications: true,
        whatsappDailyDigest: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const config = getWhatsAppConfig();

    // Generate unique short connect code
    const connectCode = user.id.slice(-6).toUpperCase();
    const botPhone = process.env.WHATSAPP_BOT_PHONE_NUMBER || "15552045343";
    const connectText = `CONNECT ${connectCode}`;
    const connectUrl = `https://wa.me/${botPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(connectText)}`;

    return NextResponse.json({
      whatsappNumber: user.whatsappNumber,
      whatsappVerified: user.whatsappVerified,
      whatsappNotifications: user.whatsappNotifications,
      whatsappDailyDigest: user.whatsappDailyDigest,
      isMetaConfigured: config.isConfigured,
      connectCode,
      botPhone,
      connectUrl,
    });
  } catch (error: any) {
    console.error("GET /api/user/whatsapp error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/user/whatsapp
 * Direct 1-Click Manual Connect (No OTP required)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { phone } = body;

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
    }

    const formattedPhone = formatWhatsAppNumber(phone);
    if (formattedPhone.length < 10) {
      return NextResponse.json({ error: "Phone number is too short" }, { status: 400 });
    }

    // Save and verify immediately!
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        whatsappNumber: formattedPhone,
        whatsappVerified: true,
      },
      select: { id: true, name: true, whatsappNumber: true, whatsappVerified: true },
    });

    // Send a friendly Welcome / Confirmation message over WhatsApp
    try {
      await sendWhatsAppTextMessage({
        to: formattedPhone,
        text:
          `🎉 *Welcome to Smart Notes & Reminder, ${updatedUser.name || "friend"}!* 🚀\n\n` +
          `Your WhatsApp account has been connected successfully!\n\n` +
          `You can now text me anytime:\n` +
          `• *today* — See your scheduled tasks\n` +
          `• *note <text>* — Quick save any thought\n` +
          `• *remind me <when> to <action>* — Set reminder\n` +
          `• *help* — Full command guide`,
      });
    } catch (e: any) {
      console.warn("Direct connect welcome message dispatch:", e?.message);
    }

    return NextResponse.json({
      success: true,
      whatsappNumber: updatedUser.whatsappNumber,
      whatsappVerified: updatedUser.whatsappVerified,
      message: `WhatsApp connected successfully to +${formattedPhone}!`,
    });
  } catch (error: any) {
    console.error("POST /api/user/whatsapp error:", error);
    return NextResponse.json({ error: error.message || "Failed to save WhatsApp number" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/whatsapp
 * Unlink WhatsApp number from user account
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        whatsappNumber: null,
        whatsappVerified: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp number unlinked successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/user/whatsapp error:", error);
    return NextResponse.json({ error: error.message || "Failed to unlink WhatsApp" }, { status: 500 });
  }
}
