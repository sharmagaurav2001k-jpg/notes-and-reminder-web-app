import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";

// GET /api/tasks/upcoming (next 7 days, date-grouped)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const daysCount = Math.min(parseInt(searchParams.get("days") || "7", 10), 30);
    const includeCompleted = searchParams.get("includeCompleted") === "true";

    const now = new Date();
    // Start of Tomorrow
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    // End of N days ahead
    const endOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysCount, 23, 59, 59, 999);

    const whereClause: any = {
      userId,
      dueDate: {
        gte: startOfTomorrow,
        lte: endOfRange,
      },
    };

    if (!includeCompleted) {
      whereClause.status = { not: "Completed" };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: [
        { dueDate: "asc" },
        { priority: "desc" },
        { dueTime: "asc" },
      ],
    });

    // Generate date buckets for each day in range
    const groupedDays: Array<{
      date: string; // "YYYY-MM-DD"
      label: string; // "Tomorrow", "Thursday, Aug 28", etc.
      dayName: string;
      tasks: any[];
    }> = [];

    const groupedMap: Record<string, any[]> = {};

    for (let i = 1; i <= daysCount; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const isoDate = d.toISOString().split("T")[0];

      let label = "";
      if (i === 1) {
        label = "Tomorrow";
      } else {
        label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      }

      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

      groupedDays.push({
        date: isoDate,
        label,
        dayName,
        tasks: [],
      });

      groupedMap[isoDate] = [];
    }

    // Distribute tasks into corresponding date groups
    for (const task of tasks) {
      if (task.dueDate) {
        const taskDateIso = new Date(task.dueDate).toISOString().split("T")[0];
        if (groupedMap[taskDateIso]) {
          groupedMap[taskDateIso].push(task);
        }
        const bucket = groupedDays.find((b) => b.date === taskDateIso);
        if (bucket) {
          bucket.tasks.push(task);
        }
      }
    }

    return NextResponse.json({
      days: groupedDays,
      grouped: groupedMap,
      totalUpcoming: tasks.length,
      range: {
        startDate: startOfTomorrow.toISOString().split("T")[0],
        endDate: endOfRange.toISOString().split("T")[0],
      },
    });
  } catch (error: any) {
    console.error("Fetch upcoming tasks error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch upcoming tasks" },
      { status: 500 }
    );
  }
}
