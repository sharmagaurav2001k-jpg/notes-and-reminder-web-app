import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string; milestoneId: string }>;
}

// POST /api/goals/:id/milestones/:milestoneId/complete - Quick toggle completion
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: goalId, milestoneId } = await params;

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: session.user.id },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const currentMilestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, goalId },
    });

    if (!currentMilestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const nextCompleted = !currentMilestone.isCompleted;

    const updatedMilestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        isCompleted: nextCompleted,
        completedAt: nextCompleted ? new Date() : null,
      },
    });

    // Recalculate goal progress
    const allMilestones = await prisma.milestone.findMany({
      where: { goalId },
    });
    const completedCount = allMilestones.filter((m) => m.isCompleted).length;
    const progress = allMilestones.length > 0 ? Math.round((completedCount / allMilestones.length) * 100) : 0;

    await prisma.goal.update({
      where: { id: goalId },
      data: { progress },
    });

    return NextResponse.json({
      milestone: updatedMilestone,
      updatedProgress: progress,
    });
  } catch (error) {
    console.error("POST complete milestone error:", error);
    return NextResponse.json({ error: "Failed to toggle milestone" }, { status: 500 });
  }
}
