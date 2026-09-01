import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateDailyProductivityScore,
  startOfDay,
  endOfDay,
} from "@/lib/services/analytics.service";

/**
 * GET & POST /api/cron/daily-score
 * Automated Worker: Calculates the daily productivity score for every user
 * who had any activity on the target day (defaults to today).
 * Optional query param: ?date=YYYY-MM-DD to backfill a specific day.
 */
export async function GET(req: NextRequest) {
  return handleCronDailyScore(req);
}

export async function POST(req: NextRequest) {
  return handleCronDailyScore(req);
}

async function handleCronDailyScore(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const urlSecret = req.nextUrl.searchParams.get("key");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && urlSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
    }

    console.log("[Cron Worker] Running daily productivity score calculation...");

    // Optional explicit date (YYYY-MM-DD or any parseable date string)
    const dateParam = req.nextUrl.searchParams.get("date");
    let targetDate = new Date();
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!Number.isNaN(parsed.getTime())) {
        targetDate = parsed;
      } else {
        return NextResponse.json(
          { error: `Invalid date parameter: ${dateParam}` },
          { status: 400 }
        );
      }
    }

    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // Find every user with any task/note/goal activity on the target day
    const [taskUsers, noteUsers, goalUsers] = await Promise.all([
      prisma.task.findMany({
        where: { updatedAt: { gte: dayStart, lte: dayEnd } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.note.findMany({
        where: { updatedAt: { gte: dayStart, lte: dayEnd } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.goal.findMany({
        where: { updatedAt: { gte: dayStart, lte: dayEnd } },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

    const userIds = Array.from(
      new Set([...taskUsers, ...noteUsers, ...goalUsers].map((u) => u.userId))
    );

    const scores: { userId: string; score: number; streakDays: number }[] = [];
    const failures: { userId: string; error: string }[] = [];

    for (const userId of userIds) {
      try {
        const record = await calculateDailyProductivityScore(userId, targetDate);
        scores.push({
          userId,
          score: record.score,
          streakDays: record.streakDays,
        });
      } catch (err) {
        console.error(`[Cron Worker] Failed to score user ${userId}:`, err);
        failures.push({
          userId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    console.log(
      `[Cron Worker] Daily score completed: ${scores.length} scored, ${failures.length} failed`
    );

    return NextResponse.json({
      success: true,
      date: dayStart.toISOString(),
      usersWithActivity: userIds.length,
      processed: scores.length,
      scores,
      failures,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron Worker] Error processing daily score:", error);
    const message = error instanceof Error ? error.message : "Internal Cron Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
