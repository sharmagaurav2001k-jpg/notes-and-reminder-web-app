import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateGoalSchema, formatZodError } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/goals/:id - Retrieve full goal with milestones, linked projects, and tasks
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const goal = await prisma.goal.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        milestones: {
          orderBy: { order: "asc" },
        },
        projects: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            updatedAt: true,
            _count: {
              select: {
                tasks: true,
                notes: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            dueTime: true,
            repeatRule: true,
            projectId: true,
            completedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            milestones: true,
            projects: true,
            tasks: true,
          },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const totalMilestones = goal.milestones.length;
    const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;
    let computedProgress = goal.progress;
    if (totalMilestones > 0) {
      computedProgress = Math.round((completedMilestones / totalMilestones) * 100);
    }

    return NextResponse.json({
      goal: {
        ...goal,
        computedProgress,
        projectsCount: goal._count.projects,
        tasksCount: goal._count.tasks,
        milestonesCount: totalMilestones,
      },
    });
  } catch (error) {
    console.error("GET /api/goals/:id error:", error);
    return NextResponse.json({ error: "Failed to fetch goal" }, { status: 500 });
  }
}

// PATCH /api/goals/:id - Update goal properties
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingGoal = await prisma.goal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = updateGoalSchema.safeParse(body);

    if (!parseResult.success) {
      const { error, issues } = formatZodError(parseResult.error);
      return NextResponse.json({ error, issues }, { status: 400 });
    }

    const updateData: any = {};
    const fields = [
      "name",
      "description",
      "category",
      "type",
      "priority",
      "status",
      "progress",
      "color",
    ] as const;

    fields.forEach((field) => {
      if (parseResult.data[field] !== undefined) {
        updateData[field] = parseResult.data[field];
      }
    });

    if (parseResult.data.startDate !== undefined) {
      updateData.startDate = parseResult.data.startDate ? new Date(parseResult.data.startDate) : null;
    }

    if (parseResult.data.targetDate !== undefined) {
      updateData.targetDate = parseResult.data.targetDate ? new Date(parseResult.data.targetDate) : null;
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: updateData,
      include: {
        milestones: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { milestones: true, tasks: true, projects: true },
        },
      },
    });

    return NextResponse.json({ goal: updatedGoal });
  } catch (error) {
    console.error("PATCH /api/goals/:id error:", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

// DELETE /api/goals/:id - Safe deletion / Soft-delete with task unlinking
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const isSoftDelete = searchParams.get("soft") === "true";

    const existingGoal = await prisma.goal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    if (isSoftDelete) {
      // Soft Delete: Mark goal as Archived/Cancelled
      const archivedGoal = await prisma.goal.update({
        where: { id },
        data: { status: "Archived" },
      });
      return NextResponse.json({
        message: "Goal archived successfully",
        goal: archivedGoal,
      });
    }

    // Hard Delete: Safely decouple linked tasks and projects so they are preserved
    await prisma.$transaction([
      // 1. Unlink tasks so they become standalone tasks rather than being orphaned
      prisma.task.updateMany({
        where: { goalId: id, userId: session.user.id },
        data: { goalId: null },
      }),
      // 2. Unlink projects
      prisma.project.updateMany({
        where: { goalId: id, userId: session.user.id },
        data: { goalId: null },
      }),
      // 3. Milestones are cascaded automatically via Prisma schema onDelete: Cascade
      // 4. Delete the goal container
      prisma.goal.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({
      message: "Goal deleted successfully and connected tasks were safely decoupled",
    });
  } catch (error) {
    console.error("DELETE /api/goals/:id error:", error);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
