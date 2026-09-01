import dotenv from "dotenv";
dotenv.config();

import { sendWhatsAppTextMessage, sendWhatsAppTemplateMessage, sendWhatsAppTaskReminder } from "../lib/whatsapp";
import { prisma } from "../lib/prisma";

async function testLiveWhatsApp() {
  console.log("🚀 Testing Live WhatsApp Cloud API Send...");

  const user = await prisma.user.findFirst({
    where: { whatsappVerified: true },
  });

  if (!user || !user.whatsappNumber) {
    console.log("No verified user with WhatsApp number found.");
    return;
  }

  // Ensure country code e.g. 91 if 10 digits
  let targetNumber = user.whatsappNumber;
  if (targetNumber.length === 10) {
    targetNumber = `91${targetNumber}`;
  }

  console.log(`Sending to target: ${targetNumber} (User: ${user.name})`);

  try {
    // 1. Send sample task reminder
    const res = await sendWhatsAppTaskReminder(targetNumber, {
      title: "Review Notes & Finish Project Milestones 🚀",
      dueDate: new Date(),
      dueTime: "11:00 AM",
      priority: "Urgent",
      projectName: "Product Launch 2026",
      goalName: "Launch Notes & Reminder Web App",
    });

    console.log("✅ Meta API Response:", JSON.stringify(res, null, 2));
    console.log(`\n🎉 Message sent successfully to +${targetNumber}! Check your WhatsApp.`);
  } catch (error: any) {
    console.error("❌ Live WhatsApp Send Error:", error.message);
  }
}

testLiveWhatsApp().catch(console.error);
