import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";
import { parseInboundWhatsAppMessage, executeWhatsAppCommand } from "../lib/whatsapp-parser";
import { sendWhatsAppTextMessage, formatWhatsAppNumber } from "../lib/whatsapp";

async function testLiveCommand(commandText: string) {
  console.log(`\n========================================`);
  console.log(`💬 Simulating User Sending: "${commandText}"`);
  console.log(`========================================`);

  const user = await prisma.user.findFirst({
    where: { whatsappVerified: true },
  });

  if (!user || !user.whatsappNumber) {
    console.error("No verified user found in DB.");
    return;
  }

  const phone = formatWhatsAppNumber(user.whatsappNumber);
  console.log(`User: ${user.name} | Phone: +${phone}`);

  // 1. Parse
  const command = parseInboundWhatsAppMessage(commandText);
  console.log("1. Parsed Command:", command);

  // 2. Execute
  const replyText = await executeWhatsAppCommand(command, user.id, user.name || "Karan");
  console.log("\n2. Generated Reply:\n" + replyText);

  // 3. Dispatch Live over WhatsApp Cloud API!
  console.log(`\n3. Dispatching live response to WhatsApp (+${phone})...`);
  const waRes = await sendWhatsAppTextMessage({
    to: phone,
    text: replyText,
  });

  console.log("✅ Delivered to WhatsApp! Message ID:", waRes.messages?.[0]?.id);
}

async function run() {
  await testLiveCommand("today");
  await new Promise((r) => setTimeout(r, 1500));
  await testLiveCommand("note Buy domain and hosting for RemindNotes");
}

run().catch(console.error);
