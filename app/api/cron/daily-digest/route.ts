import { NextRequest, NextResponse } from "next/server";
import { processDailyFocusDigests } from "@/lib/services/reminders-cron.service";

/**
 * GET & POST /api/cron/daily-digest
 * Automated Worker: Dispatches Morning Daily Focus Digest to all WhatsApp users
 */
export async function GET(req: NextRequest) {
  return handleCronDailyDigest(req);
}

export async function POST(req: NextRequest) {
  return handleCronDailyDigest(req);
}

async function handleCronDailyDigest(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const urlSecret = req.nextUrl.searchParams.get("key");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && urlSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
    }

    console.log("[Cron Worker] Running morning daily focus digest...");
    const stats = await processDailyFocusDigests();
    console.log("[Cron Worker] Daily digest completed:", stats);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    });
  } catch (error: any) {
    console.error("[Cron Worker] Error processing daily digest:", error);
    return NextResponse.json(
      { error: error.message || "Internal Cron Error" },
      { status: 500 }
    );
  }
}
