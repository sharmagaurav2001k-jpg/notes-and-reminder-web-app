import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseInboundWhatsAppMessage, executeWhatsAppCommand } from "@/lib/whatsapp-parser";
import { sendWhatsAppTextMessage, formatWhatsAppNumber } from "@/lib/whatsapp";

// POST /api/whatsapp/simulate-command
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { commandText } = body;

    if (!commandText || typeof commandText !== "string") {
      return NextResponse.json({ error: "Command text is required" }, { status: 400 });
    }

    // Find authenticated user
    const userId = session.user.id;
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: userId }] : []),
          ...(session.user.email ? [{ email: session.user.email }] : []),
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.whatsappNumber || !user.whatsappVerified) {
      return NextResponse.json(
        { error: "Please verify your WhatsApp number in Settings first." },
        { status: 400 }
      );
    }

    // 1. Parse Command
    const command = parseInboundWhatsAppMessage(commandText);

    // 2. Execute Command via DB Services
    const replyText = await executeWhatsAppCommand(command, user.id, user.name || "there");

    // 3. Dispatch Live WhatsApp message to user's phone number!
    const targetPhone = formatWhatsAppNumber(user.whatsappNumber);
    const waResponse = await sendWhatsAppTextMessage({
      to: targetPhone,
      text: replyText,
    });

    return NextResponse.json({
      success: true,
      commandText,
      parsedCommand: command,
      replyText,
      waResponse,
      recipient: targetPhone,
      message: `Command executed & response delivered to +${targetPhone}!`,
    });
  } catch (error: any) {
    console.error("Simulate WhatsApp command error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute WhatsApp command" },
      { status: 500 }
    );
  }
}
