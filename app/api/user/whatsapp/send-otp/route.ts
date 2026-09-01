import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatWhatsAppNumber, sendWhatsAppTextMessage, getWhatsAppConfig } from "@/lib/whatsapp";

/**
 * POST /api/user/whatsapp/send-otp
 * Generate 6-digit OTP and send via WhatsApp
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
      return NextResponse.json({ error: "Please provide a valid phone number with country code" }, { status: 400 });
    }

    const cleanPhone = formatWhatsAppNumber(phone);
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      return NextResponse.json(
        { error: "Invalid phone number format. Please include country code without symbols (e.g. +91 9876543210)" },
        { status: 400 }
      );
    }

    // Check if phone number is already verified by a different user
    const existingUser = await prisma.user.findFirst({
      where: {
        whatsappNumber: cleanPhone,
        whatsappVerified: true,
        id: { not: session.user.id },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "This WhatsApp number is already linked to another active account." },
        { status: 409 }
      );
    }

    // Generate secure 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save verification in database
    await prisma.whatsAppVerification.create({
      data: {
        userId: session.user.id,
        phone: cleanPhone,
        code,
        expiresAt,
        verified: false,
      },
    });

    const config = getWhatsAppConfig();
    let sentViaWhatsApp = false;
    let deliveryError: string | null = null;

    if (config.isConfigured) {
      try {
        const text =
          `🔐 *Smart Notes & Reminder Verification*\n\n` +
          `Your confirmation code is: *${code}*\n\n` +
          `Enter this code in your account settings to link your WhatsApp for automated reminders & quick captures.\n\n` +
          `_Code valid for 10 minutes._`;

        await sendWhatsAppTextMessage({ to: cleanPhone, text });
        sentViaWhatsApp = true;
      } catch (err: any) {
        console.error("Failed to send OTP via WhatsApp Cloud API:", err);
        deliveryError = err.message || "Failed to dispatch WhatsApp message";
      }
    } else {
      console.log(`[DEV WhatsApp OTP] Code for ${cleanPhone}: ${code}`);
    }

    return NextResponse.json({
      success: true,
      message: sentViaWhatsApp
        ? `Verification code sent to +${cleanPhone} via WhatsApp!`
        : `Verification code generated for +${cleanPhone}.`,
      sentViaWhatsApp,
      deliveryError,
      // For local development when Meta credentials are not yet set in .env:
      devOtp: config.isConfigured ? undefined : code,
    });
  } catch (error: any) {
    console.error("POST /api/user/whatsapp/send-otp error:", error);
    return NextResponse.json({ error: error.message || "Failed to send verification code" }, { status: 500 });
  }
}
