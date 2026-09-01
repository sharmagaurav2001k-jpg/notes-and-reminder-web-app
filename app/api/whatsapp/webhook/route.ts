import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getWhatsAppConfig, sendWhatsAppTextMessage, formatWhatsAppNumber } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

/**
 * Verify Meta X-Hub-Signature-256 (HMAC SHA-256)
 * Prevents spoofed / fake webhook payloads
 */
function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!appSecret) {
    // If no app secret configured yet in local development, skip verification with warning
    console.warn("[WhatsApp Webhook] META_APP_SECRET is not set. Skipping signature verification in dev.");
    return true;
  }

  if (!signatureHeader) {
    console.error("[WhatsApp Webhook] Missing X-Hub-Signature-256 header.");
    return false;
  }

  // Format is "sha256=<signature_hex>"
  const parts = signatureHeader.split("=");
  const signature = parts.length === 2 ? parts[1] : signatureHeader;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", appSecret)
      .update(rawBody, "utf8")
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (err) {
    console.error("[WhatsApp Webhook] Error during signature calculation:", err);
    return false;
  }
}

/**
 * GET /api/whatsapp/webhook
 * Meta Webhook Verification Handshake
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const { webhookVerifyToken } = getWhatsAppConfig();

    if (mode === "subscribe" && token === webhookVerifyToken) {
      console.log("[WhatsApp Webhook] Verification successful. Challenge accepted.");
      return new NextResponse(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.warn(`[WhatsApp Webhook] Verification token mismatch. Expected: "${webhookVerifyToken}", Received: "${token}"`);
    return NextResponse.json({ error: "Forbidden: Token Mismatch" }, { status: 403 });
  } catch (error: any) {
    console.error("[WhatsApp Webhook] GET verification error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/webhook
 * Inbound WhatsApp Messages & Status Updates Receiver
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature256 = req.headers.get("x-hub-signature-256") || req.headers.get("x-hub-signature");
    const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || "";

    // 1. Verify Cryptographic Signature
    const isSignatureValid = verifyMetaSignature(rawBody, signature256, appSecret);
    if (!isSignatureValid) {
      console.error("[WhatsApp Webhook] REJECTED: Invalid X-Hub-Signature-256 signature.");
      return NextResponse.json({ error: "Unauthorized: Invalid Signature" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // 2. Validate WhatsApp Business Account Payload
    if (payload.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Not a WhatsApp Business Account event" }, { status: 404 });
    }

    const entries = payload.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        // A. Handle Inbound Messages
        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            await handleInboundMessage(message, value.metadata);
          }
        }

        // B. Handle Message Delivery Status Receipts
        if (value.statuses && value.statuses.length > 0) {
          for (const statusObj of value.statuses) {
            handleStatusReceipt(statusObj);
          }
        }
      }
    }

    // Always respond 200 OK immediately as required by Meta webhook SLA
    return NextResponse.json({ status: "SUCCESS" }, { status: 200 });
  } catch (error: any) {
    console.error("[WhatsApp Webhook] Handler error:", error);
    // Return 200 so Meta doesn't disable or repeatedly spam the endpoint on unhandled error
    return NextResponse.json({ status: "ERROR_ACKNOWLEDGED" }, { status: 200 });
  }
}

import { parseInboundWhatsAppMessage, executeWhatsAppCommand, findUserByConnectCode } from "@/lib/whatsapp-parser";

/**
 * Handle user messages sent from WhatsApp
 */
async function handleInboundMessage(message: any, metadata: any) {
  const from = message.from; // Phone number in international format without + (e.g. 919876543210)
  const messageId = message.id;
  const messageType = message.type;
  const timestamp = message.timestamp;

  console.log(`[WhatsApp Webhook] Inbound message (${messageType}) from ${from}:`, message);

  if (messageType === "text") {
    const textBody = message.text?.body?.trim() || "";
    const cleanPhone = formatWhatsAppNumber(from);

    // 1. Parse command first to check for MAGIC CONNECT CODE
    const command = parseInboundWhatsAppMessage(textBody);
    console.log(`[WhatsApp Webhook] Parsed Command:`, command);

    // Handle MAGIC 1-CLICK CONNECT COMMAND (Zero OTP!)
    if (command.type === "CONNECT") {
      const matchedUser = await findUserByConnectCode(command.code);
      if (matchedUser) {
        // Link this phone number to matched user with instant verification!
        await prisma.user.update({
          where: { id: matchedUser.id },
          data: {
            whatsappNumber: cleanPhone,
            whatsappVerified: true,
          },
        });

        const reply = await executeWhatsAppCommand(command, matchedUser.id, matchedUser.name || "there");
        try {
          await sendWhatsAppTextMessage({ to: from, text: reply });
        } catch (e: any) {
          console.warn("[WhatsApp Webhook] Connect reply failed:", e?.message);
        }
        return;
      } else {
        try {
          await sendWhatsAppTextMessage({
            to: from,
            text: `❌ *Invalid Connect Code*\n\nCould not link account with code *${command.code}*.\nPlease visit your Settings page on RemindNotes to generate a fresh link!`,
          });
        } catch (e: any) {
          console.warn("[WhatsApp Webhook] Invalid code reply failed:", e?.message);
        }
        return;
      }
    }

    // Find linked user in database by WhatsApp Number
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { whatsappNumber: cleanPhone },
          { whatsappNumber: `+${cleanPhone}` },
        ],
      },
      select: { id: true, name: true, email: true },
    });

    console.log(`[WhatsApp Webhook] Matched User:`, user ? `${user.name} (${user.email})` : "Unregistered Sender");

    // If sender is not linked to any user in DB
    if (!user) {
      const unlinkedMsg =
        `⚠️ *Account Not Linked*\n\n` +
        `Your WhatsApp number (*+${cleanPhone}*) is not linked to any account on *Smart Notes & Reminder*.\n\n` +
        `To connect in 1 click (No OTP):\n` +
        `1. Open the web app Settings ➔ *WhatsApp*\n` +
        `2. Click *"⚡ 1-Click Connect on WhatsApp"*\n` +
        `3. Or enter your number manually in Settings!`;

      try {
        await sendWhatsAppTextMessage({ to: from, text: unlinkedMsg });
      } catch (e: any) {
        console.warn("[WhatsApp Webhook] Outbound reply skipped (Credentials pending in .env):", e?.message);
      }
      return;
    }

    // 2. Execute command & format rich response
    const replyText = await executeWhatsAppCommand(command, user.id, user.name || "there");

    // 3. Dispatch response back to user
    try {
      await sendWhatsAppTextMessage({ to: from, text: replyText });
    } catch (e: any) {
      console.warn("[WhatsApp Webhook] Outbound reply skipped (Credentials pending in .env):", e?.message);
    }
  }
}

/**
 * Handle delivery receipts (sent, delivered, read, failed)
 */
function handleStatusReceipt(statusObj: any) {
  const messageId = statusObj.id;
  const status = statusObj.status; // "sent" | "delivered" | "read" | "failed"
  const recipient = statusObj.recipient_id;
  const timestamp = statusObj.timestamp;

  console.log(`[WhatsApp Webhook Status] Message ${messageId} -> ${status.toUpperCase()} for ${recipient} at ${timestamp}`);

  if (status === "failed" && statusObj.errors) {
    console.error(`[WhatsApp Webhook Error] Delivery failure for message ${messageId}:`, statusObj.errors);
  }
}
