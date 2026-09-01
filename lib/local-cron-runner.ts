/**
 * Local Development Cron Runner
 * Automatically triggers due task reminders check every 60 seconds in dev mode.
 */

import { processDueTaskReminders } from "@/lib/services/reminders-cron.service";

let isCronRunning = false;
let cronInterval: NodeJS.Timeout | null = null;

export function initLocalCronRunner() {
  if (cronInterval) return; // Prevent duplicate timers during HMR

  console.log("⏰ [Local Cron Worker] Initialized background due-reminder ticker (Runs every 60s)");

  cronInterval = setInterval(async () => {
    if (isCronRunning) return;
    isCronRunning = true;

    try {
      const result = await processDueTaskReminders();
      if (result.sent > 0 || result.failed > 0) {
        console.log(`⏰ [Local Cron Worker] Processed ${result.processed} tasks: ${result.sent} sent, ${result.failed} failed.`);
      }
    } catch (err: any) {
      console.warn("[Local Cron Worker] Reminder tick error:", err.message);
    } finally {
      isCronRunning = false;
    }
  }, 60 * 1000); // 60 seconds
}
