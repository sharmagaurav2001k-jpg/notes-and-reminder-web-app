import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAuthenticatedUserId(session: any) {
  if (session?.user?.id) return session.user.id;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { id: true },
    });
    return user?.id || null;
  }
  return null;
}

// GET /api/dashboard - Aggregated Dashboard payload (Notes, Today & Upcoming Tasks, Goals, Projects, Stats)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const in7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);

    // Parallel optimized DB queries
    const [
      notes,
      todayTasks,
      overdueTasks,
      upcomingTasksRaw,
      goals,
      projects,
      reminders,
      noteCounts,
      taskCounts,
      reminderCounts,
      projectCounts,
    ] = await Promise.all([
      // 1. Recent Notes (Pinned first, then latest updated)
      prisma.note.findMany({
        where: { userId, isArchived: false },
        include: {
          category: { select: { id: true, name: true, color: true } },
          tags: {
            include: { tag: { select: { id: true, name: true, color: true } } },
          },
        },
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        take: 12,
      }),

      // 2. Today's Tasks
      prisma.task.findMany({
        where: {
          userId,
          dueDate: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        include: {
          goal: { select: { id: true, name: true, color: true, type: true } },
          project: { select: { id: true, name: true, status: true } },
        },
        orderBy: [{ status: "asc" }, { priority: "asc" }, { dueTime: "asc" }],
      }),

      // 3. Overdue Tasks (dueDate before today, status not Completed)
      prisma.task.findMany({
        where: {
          userId,
          dueDate: { lt: startOfToday },
          status: { not: "Completed" },
        },
        include: {
          goal: { select: { id: true, name: true, color: true, type: true } },
          project: { select: { id: true, name: true, status: true } },
        },
        orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
        take: 10,
      }),

      // 4. Upcoming Tasks for next 7 days (after today)
      prisma.task.findMany({
        where: {
          userId,
          dueDate: {
            gt: endOfToday,
            lte: in7Days,
          },
        },
        include: {
          goal: { select: { id: true, name: true, color: true, type: true } },
          project: { select: { id: true, name: true, status: true } },
        },
        orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
      }),

      // 5. Active Goals with milestone and task summaries
      prisma.goal.findMany({
        where: {
          userId,
          status: { notIn: ["Archived", "Cancelled"] },
        },
        include: {
          milestones: {
            orderBy: { order: "asc" },
          },
          _count: {
            select: { milestones: true, tasks: true, projects: true },
          },
        },
        orderBy: [{ status: "asc" }, { targetDate: "asc" }, { createdAt: "desc" }],
        take: 6,
      }),

      // 6. Active Projects
      prisma.project.findMany({
        where: {
          userId,
          status: { notIn: ["Archived", "Cancelled"] },
        },
        select: {
          id: true,
          name: true,
          status: true,
          goalId: true,
          goal: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          _count: {
            select: { tasks: true, notes: true },
          },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: 6,
      }),

      // 7. Active Reminders
      prisma.reminder.findMany({
        where: { userId },
        orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }],
        take: 6,
      }),

      // 8. Aggregate Counts
      prisma.note.aggregate({
        where: { userId, isArchived: false },
        _count: { id: true },
      }),
      prisma.task.aggregate({
        where: { userId },
        _count: { id: true },
      }),
      prisma.reminder.aggregate({
        where: { userId },
        _count: { id: true },
      }),
      prisma.project.aggregate({
        where: { userId },
        _count: { id: true },
      }),
    ]);

    // Format Notes
    const formattedNotes = notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      category: n.category?.name || "General",
      categoryId: n.categoryId,
      color: n.color,
      isPinned: n.isPinned,
      isFavorite: n.isFavorite,
      isArchived: n.isArchived,
      tags: n.tags.map((t) => t.tag.name),
      updatedAt: n.updatedAt.toISOString(),
      createdAt: n.createdAt.toISOString(),
    }));

    // Today's summary metrics
    const totalToday = todayTasks.length;
    const completedToday = todayTasks.filter((t) => t.status === "Completed").length;
    const pendingToday = totalToday - completedToday;
    const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

    // Group upcoming tasks by day for the next 7 days
    const upcomingDays = [];
    for (let i = 1; i <= 7; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

      const dayTasks = upcomingTasksRaw.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= startOfDay && d <= endOfDay;
      });

      const dayName = targetDate.toLocaleDateString("en-US", { weekday: "short" });
      const label =
        i === 1
          ? "Tomorrow"
          : targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      upcomingDays.push({
        date: targetDate.toISOString().split("T")[0],
        dayName,
        label,
        tasks: dayTasks,
      });
    }

    // Format Goals with computed progress
    const formattedGoals = goals.map((goal) => {
      const totalMilestones = goal.milestones.length;
      const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;
      let computedProgress = goal.progress;
      if (totalMilestones > 0) {
        computedProgress = Math.round((completedMilestones / totalMilestones) * 100);
      }

      return {
        id: goal.id,
        name: goal.name,
        description: goal.description,
        type: goal.type,
        category: goal.category,
        priority: goal.priority,
        status: goal.status,
        color: goal.color,
        progress: computedProgress,
        targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
        milestonesCount: totalMilestones,
        completedMilestonesCount: completedMilestones,
        tasksCount: goal._count.tasks,
        projectsCount: goal._count.projects,
      };
    });

    const activeRemindersCount = reminders.filter((r) => !r.isCompleted).length;
    const starredNotesCount = formattedNotes.filter((n) => n.isFavorite).length;

    return NextResponse.json({
      stats: {
        totalNotes: noteCounts._count.id || 0,
        starredNotes: starredNotesCount,
        totalTasks: taskCounts._count.id || 0,
        activeReminders: activeRemindersCount,
        activeGoals: formattedGoals.length,
        totalProjects: projectCounts._count.id || 0,
      },
      today: {
        tasks: todayTasks,
        overdue: overdueTasks,
        summary: {
          totalToday,
          completedToday,
          pendingToday,
          overdueCount: overdueTasks.length,
          completionRate,
        },
      },
      upcoming: {
        days: upcomingDays,
        totalUpcoming: upcomingTasksRaw.length,
      },
      goals: formattedGoals,
      projects,
      notes: formattedNotes,
      reminders,
    });
  } catch (error: any) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch aggregated dashboard" },
      { status: 500 }
    );
  }
}
