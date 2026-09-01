import dotenv from "dotenv";
dotenv.config();

import { parseInboundWhatsAppMessage, executeWhatsAppCommand } from "../lib/whatsapp-parser";

async function testUnknownCommand() {
  console.log("🧪 Testing Unrecognized Command Fallback...\n");

  const invalidInput = "kuch bhi random message";
  const parsed = parseInboundWhatsAppMessage(invalidInput);
  console.log("1. Parsed as:", parsed.type);

  const reply = await executeWhatsAppCommand(parsed, "test-user-id", "Karan");
  console.log("\n2. Fallback Response Delivered to User:\n" + reply);
}

testUnknownCommand().catch(console.error);
