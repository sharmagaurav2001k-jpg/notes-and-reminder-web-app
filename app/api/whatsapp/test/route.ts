import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getWhatsAppConfig,
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage,
  sendWhatsAppTaskReminder,
} from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getWhatsAppConfig();

    return NextResponse.json({
      configured: config.isConfigured,
      phoneNumberId: config.phoneNumberId ? `${config.phoneNumberId.slice(0, 4)}...${config.phoneNumberId.slice(-4)}` : null,
      wabaId: config.wabaId ? `${config.wabaId.slice(0, 4)}...${config.wabaId.slice(-4)}` : null,
      apiVersion: config.apiVersion,
      webhookVerifyTokenSet: Boolean(config.webhookVerifyToken),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { to, type = "template", message } = body;

    if (!to) {
      return NextResponse.json({ error: "Recipient phone number is required" }, { status: 400 });
    }

    const config = getWhatsAppConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          error:
            "WhatsApp is not configured yet. Please add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env",
        },
        { status: 400 }
      );
    }

    let response;
    if (type === "template") {
      // Standard Meta test template 'hello_world'
      response = await sendWhatsAppTemplateMessage({
        to,
        templateName: "hello_world",
        languageCode: "en_US",
      });
    } else if (type === "sample_reminder") {
      response = await sendWhatsAppTaskReminder(to, {
        title: "Complete Project Milestones & Review Notes",
        priority: "Urgent",
        dueDate: new Date(),
        dueTime: "18:00",
        projectName: "Product Launch 2026",
        goalName: "Launch MVP by End of Month",
      });
    } else {
      response = await sendWhatsAppTextMessage({
        to,
        text: message || "Hello from Smart Notes & Reminder Web App! 🚀 WhatsApp integration is working.",
      });
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `WhatsApp message dispatched to ${to}!`,
    });
  } catch (error: any) {
    console.error("WhatsApp test send error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to send WhatsApp message",
      },
      { status: 500 }
    );
  }
}
