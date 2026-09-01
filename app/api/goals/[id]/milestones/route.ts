import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMilestoneSchema, formatZodError } from "@/lib/validations";
import { calculateAndUpdateGoalProgress } from "@/lib/goal-progress";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/goals/:id/milestones - List all milestones of a goal with stats
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: goalId } = await params;

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: session.user.id },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const milestones = await prisma.milestone.findMany({
      where: { goalId },
      orderBy: { order: "asc" },
    });

    const total = milestones.length;
    const completed = milestones.filter((m) => m.isCompleted).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return NextResponse.json({
      milestones,
      summary: {
        total,
        completed,
        pending: total - completed,
        progress,
      },
    });
  } catch (error) {
    console.error("GET /api/goals/:id/milestones error:", error);
    return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 });
  }
}

// POST /api/goals/:id/milestones - Add a new milestone
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: goalId } = await params;

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: session.user.id },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = createMilestoneSchema.safeParse(body);

    if (!parseResult.success) {
      const { error, issues } = formatZodError(parseResult.error);
      return NextResponse.json({ error, issues }, { status: 400 });
    }

    const { title, description, targetDate, isCompleted, order } = parseResult.data;

    let finalOrder = order;
    if (finalOrder === undefined || finalOrder === 0) {
      const count = await prisma.milestone.count({ where: { goalId } });
      finalOrder = count;
    }

    const milestone = await prisma.milestone.create({
      data: {
        goalId,
        title,
        description: description || null,
        targetDate: targetDate ? new Date(targetDate) : null,
        isCompleted: isCompleted || false,
        completedAt: isCompleted ? new Date() : null,
        order: finalOrder,
      },
    });

    // Auto-recalculate progress
    const progressResult = await calculateAndUpdateGoalProgress(goalId);

    return NextResponse.json(
      {
        milestone,
        updatedProgress: progressResult.progress,
        autoUpdatedStatus: progressResult.autoUpdatedStatus,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/goals/:id/milestones error:", error);
    return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
  }
}

// PATCH /api/goals/:id/milestones - Bulk Reorder / Batch Update Milestones
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: goalId } = await params;

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: session.user.id },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    // Mode A: Reorder array of milestone IDs in order
    if (Array.isArray(body.reorder)) {
      const reorderIds: string[] = body.reorder;
      await prisma.$transaction(
        reorderIds.map((id, index) =>
          prisma.milestone.updateMany({
            where: { id, goalId },
            data: { order: index },
          })
        )
      );

      const updated = await prisma.milestone.findMany({
        where: { goalId },
        orderBy: { order: "asc" },
      });

      return NextResponse.json({
        message: "Milestones reordered successfully",
        milestones: updated,
      });
    }

    // Mode B: Batch update items
    if (Array.isArray(body.milestones)) {
      const updates = body.milestones;
      await prisma.$transaction(
        updates.map((item: any) =>
          prisma.milestone.updateMany({
            where: { id: item.id, goalId },
            data: {
              ...(item.title !== undefined ? { title: item.title } : {}),
              ...(item.order !== undefined ? { order: item.order } : {}),
              ...(item.isCompleted !== undefined
                ? {
                    isCompleted: item.isCompleted,
                    completedAt: item.isCompleted ? new Date() : null,
                  }
                : {}),
            },
          })
        )
      );

      const progressResult = await calculateAndUpdateGoalProgress(goalId);
      const allMilestones = await prisma.milestone.findMany({
        where: { goalId },
        orderBy: { order: "asc" },
      });

      return NextResponse.json({
        message: "Milestones batch updated",
        milestones: allMilestones,
        updatedProgress: progressResult.progress,
      });
    }

    return NextResponse.json(
      { error: "Invalid payload. Provide 'reorder' array or 'milestones' array" },
      { status: 400 }
    );
  } catch (error) {
    console.error("PATCH /api/goals/:id/milestones bulk error:", error);
    return NextResponse.json({ error: "Failed to batch update milestones" }, { status: 500 });
  }
}
