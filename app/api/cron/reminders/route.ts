import { NextRequest, NextResponse } from "next/server";
import { processDueTaskReminders } from "@/lib/services/reminders-cron.service";

/**
 * GET & POST /api/cron/reminders
 * Automated Worker: Checks due tasks and sends instant WhatsApp reminders
 */
export async function GET(req: NextRequest) {
  return handleCronReminders(req);
}

export async function POST(req: NextRequest) {
  return handleCronReminders(req);
}

async function handleCronReminders(req: NextRequest) {
  try {
    // Check optional CRON_SECRET authorization if set
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const urlSecret = req.nextUrl.searchParams.get("key");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && urlSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
    }

    console.log("[Cron Worker] Running due task reminders check...");
    const stats = await processDueTaskReminders();
    console.log("[Cron Worker] Reminders check completed:", stats);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    });
  } catch (error: any) {
    console.error("[Cron Worker] Error processing reminders:", error);
    return NextResponse.json(
      { error: error.message || "Internal Cron Error" },
      { status: 500 }
    );
  }
}
