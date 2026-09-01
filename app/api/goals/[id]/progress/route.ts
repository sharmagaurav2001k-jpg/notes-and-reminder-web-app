import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateAndUpdateGoalProgress } from "@/lib/goal-progress";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const progressPayloadSchema = z.object({
  progress: z.number().min(0).max(100).optional().nullable(),
  recalculate: z.boolean().optional().default(false),
});

// GET /api/goals/:id/progress - Get detailed progress metrics
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const goal = await prisma.goal.findFirst({
      where: { id, userId: session.user.id },
      include: {
        milestones: {
          select: { id: true, title: true, isCompleted: true, completedAt: true },
        },
        tasks: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const totalMilestones = goal.milestones.length;
    const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;
    const milestoneRatioProgress =
      totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : null;

    const totalTasks = goal.tasks.length;
    const completedTasks = goal.tasks.filter((t) => t.status === "Completed").length;

    return NextResponse.json({
      goalId: goal.id,
      name: goal.name,
      currentProgress: goal.progress,
      status: goal.status,
      milestones: {
        total: totalMilestones,
        completed: completedMilestones,
        calculatedProgress: milestoneRatioProgress,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
      },
    });
  } catch (error) {
    console.error("GET /api/goals/:id/progress error:", error);
    return NextResponse.json({ error: "Failed to get goal progress" }, { status: 500 });
  }
}

// POST /api/goals/:id/progress - Set manual override OR trigger automatic recalculate
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const goal = await prisma.goal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = progressPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid progress payload" }, { status: 400 });
    }

    const { progress, recalculate } = parseResult.data;

    // If recalculate is requested or progress is null/undefined, calculate from milestones
    const manualValue = recalculate ? null : progress;

    const result = await calculateAndUpdateGoalProgress(id, manualValue);

    return NextResponse.json({
      message: result.isAutoCalculated
        ? "Progress automatically calculated from milestones"
        : "Manual progress override saved",
      ...result,
    });
  } catch (error) {
    console.error("POST /api/goals/:id/progress error:", error);
    return NextResponse.json({ error: "Failed to update goal progress" }, { status: 500 });
  }
}
