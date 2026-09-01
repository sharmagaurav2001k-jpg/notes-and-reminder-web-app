import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatWhatsAppNumber, sendWhatsAppTextMessage, getWhatsAppConfig } from "@/lib/whatsapp";

/**
 * POST /api/user/whatsapp/verify-otp
 * Verify 6-digit code and map WhatsApp number to app user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json({ error: "Phone number and 6-digit code are required" }, { status: 400 });
    }

    const cleanPhone = formatWhatsAppNumber(phone);
    const cleanCode = code.toString().trim();

    // Look for matching valid unexpired verification
    const verification = await prisma.whatsAppVerification.findFirst({
      where: {
        userId: session.user.id,
        phone: cleanPhone,
        code: cleanCode,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired verification code. Please request a new code." },
        { status: 400 }
      );
    }

    // Mark verification as verified
    await prisma.whatsAppVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    // Update user record: store phoneNumber -> userId mapping
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        whatsappNumber: cleanPhone,
        whatsappVerified: true,
        whatsappNotifications: true,
      },
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
        whatsappVerified: true,
        whatsappNotifications: true,
      },
    });

    // Send welcome confirmation on WhatsApp if configured
    const config = getWhatsAppConfig();
    if (config.isConfigured) {
      try {
        const welcomeText =
          `🎉 *WhatsApp Successfully Linked!*\n\n` +
          `Hi ${updatedUser.name || "there"}! Your WhatsApp number is now connected to *Smart Notes & Reminder*.\n\n` +
          `You'll receive:\n` +
          `🔔 Task due date reminders\n` +
          `🌅 Daily morning digests\n\n` +
          `You can also reply anytime with *help* to see bot commands!`;

        await sendWhatsAppTextMessage({ to: cleanPhone, text: welcomeText });
      } catch (err) {
        console.warn("Welcome message dispatch skipped:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `WhatsApp number +${cleanPhone} successfully verified and linked to your account!`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("POST /api/user/whatsapp/verify-otp error:", error);
    return NextResponse.json({ error: error.message || "Failed to verify code" }, { status: 500 });
  }
}
