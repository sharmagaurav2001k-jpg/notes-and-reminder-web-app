import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";
import {
  getDashboardAnalytics,
  generateWeeklyReview,
  getProductivityHistory,
  getTaskCompletionTrend,
  getGoalVelocity,
  getTimeDistribution,
  getHeatmapData,
  getAIInsights,
} from "@/lib/services/analytics.service";

async function getAuthUserId() {
  const session = await getServerSession(authOptions);
  return getAuthenticatedUserId(session);
}

// GET /api/analytics?view=dashboard|productivity|tasks|goals|time|heatmap|weekly-review|insights&days=30
export async function GET(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "dashboard";
    const days = parseInt(searchParams.get("days") || "30", 10);

    switch (view) {
      case "dashboard":
        return NextResponse.json(await getDashboardAnalytics(userId));
      case "productivity":
        return NextResponse.json({ history: await getProductivityHistory(userId, days) });
      case "tasks":
        return NextResponse.json({ trend: await getTaskCompletionTrend(userId, days) });
      case "goals":
        return NextResponse.json({ velocity: await getGoalVelocity(userId, days) });
      case "time":
        return NextResponse.json({ distribution: await getTimeDistribution(userId, days) });
      case "heatmap": {
        const weeks = parseInt(searchParams.get("weeks") || "16", 10);
        return NextResponse.json({ heatmap: await getHeatmapData(userId, weeks) });
      }
      case "weekly-review":
        return NextResponse.json(await generateWeeklyReview(userId));
      case "insights":
        return NextResponse.json({ insights: await getAIInsights(userId) });
      default:
        return NextResponse.json({ error: "Invalid view" }, { status: 400 });
    }
  } catch (error) {
    console.error("Analytics error:", error);
    const message = error instanceof Error ? error.message : "Analytics failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
