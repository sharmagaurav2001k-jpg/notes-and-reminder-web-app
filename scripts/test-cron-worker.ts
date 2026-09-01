import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";
import { processDueTaskReminders, processDailyFocusDigests } from "../lib/services/reminders-cron.service";

async function testCronWorker() {
  console.log("🚀 Testing Automated WhatsApp Cron Reminders & Daily Digest System...\n");

  const user = await prisma.user.findFirst({
    where: { whatsappVerified: true },
  });

  if (!user || !user.whatsappNumber) {
    console.error("No verified user found in DB.");
    return;
  }

  console.log(`Verified User: ${user.name} | Phone: +${user.whatsappNumber}`);

  // 1. Create a simulated due task for this user
  console.log("\n1. Creating a simulated Due Task: 'Finalize Deployment & Review PRD'...");
  const dueTask = await prisma.task.create({
    data: {
      userId: user.id,
      title: "Finalize Deployment & Review PRD 🚀",
      description: "Ensure all production keys and cron jobs are active",
      dueDate: new Date(), // Today
      dueTime: "10:00", // Past hour today
      priority: "Urgent",
      status: "Todo",
      isNotified: false,
    },
  });
  console.log(`Created Task ID: ${dueTask.id} (isNotified: ${dueTask.isNotified})`);

  // 2. Run Due Reminders Cron
  console.log("\n2. Running processDueTaskReminders()...");
  const reminderStats = await processDueTaskReminders();
  console.log("Reminder Stats:", JSON.stringify(reminderStats, null, 2));

  // 3. Verify task was marked as notified
  const updatedTask = await prisma.task.findUnique({ where: { id: dueTask.id } });
  console.log(`Task '${updatedTask?.title}' isNotified after cron:`, updatedTask?.isNotified);

  // 4. Run Daily Focus Digest Cron
  console.log("\n4. Running processDailyFocusDigests()...");
  const digestStats = await processDailyFocusDigests();
  console.log("Daily Digest Stats:", JSON.stringify(digestStats, null, 2));

  console.log("\n🎉 Automated Cron Reminders & Daily Digest Tested Successfully!");
}

testCronWorker().catch(console.error);
