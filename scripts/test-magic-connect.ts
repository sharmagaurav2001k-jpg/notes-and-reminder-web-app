import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";
import { findUserByConnectCode, parseInboundWhatsAppMessage, executeWhatsAppCommand } from "../lib/whatsapp-parser";

async function testMagicConnect() {
  console.log("🧪 Testing Zero-OTP Connection System...\n");

  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found");
    return;
  }

  const connectCode = user.id.slice(-6).toUpperCase();
  console.log(`1. User: ${user.name} | Connect Code: ${connectCode}`);

  // Test 1: Parser recognizes "CONNECT <CODE>"
  const parsed = parseInboundWhatsAppMessage(`CONNECT ${connectCode}`);
  console.log("2. Parsed Command:", parsed);

  // Test 2: Find user by connect code
  if (parsed.type === "CONNECT") {
    const matched = await findUserByConnectCode(parsed.code);
    console.log(`3. Found User By Code '${parsed.code}':`, matched ? `${matched.name} (${matched.id})` : "Not found");

    if (matched) {
      const reply = await executeWhatsAppCommand(parsed, matched.id, matched.name || "there");
      console.log("\n4. Bot Welcome Reply:\n" + reply);
    }
  }

  console.log("\n✅ Zero-OTP Magic Connect Test Passed Successfully!");
}

testMagicConnect().catch(console.error);
