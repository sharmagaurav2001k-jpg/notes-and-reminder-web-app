import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";

// GET /api/tasks/today
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const includeOverdue = searchParams.get("includeOverdue") !== "false";

    // Compute Today's bounds (00:00:00 to 23:59:59.999)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Fetch Today's Tasks
    const todayTasks = await prisma.task.findMany({
      where: {
        userId,
        dueDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { dueTime: "asc" },
      ],
    });

    // 2. Fetch Overdue Tasks (pending tasks with dueDate < startOfToday)
    let overdueTasks: any[] = [];
    if (includeOverdue) {
      overdueTasks = await prisma.task.findMany({
        where: {
          userId,
          status: { not: "Completed" },
          dueDate: {
            lt: startOfToday,
          },
        },
        orderBy: [
          { dueDate: "asc" },
          { priority: "desc" },
        ],
      });
    }

    const totalToday = todayTasks.length;
    const completedToday = todayTasks.filter((t) => t.status === "Completed").length;
    const pendingToday = totalToday - completedToday;
    const overdueCount = overdueTasks.length;

    return NextResponse.json({
      today: todayTasks,
      overdue: overdueTasks,
      summary: {
        totalToday,
        completedToday,
        pendingToday,
        overdueCount,
        completionRate: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 100,
      },
    });
  } catch (error: any) {
    console.error("Fetch today tasks error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch today tasks" },
      { status: 500 }
    );
  }
}
