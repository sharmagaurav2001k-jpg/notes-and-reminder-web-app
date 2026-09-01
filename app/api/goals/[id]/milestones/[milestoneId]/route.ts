import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateMilestoneSchema, formatZodError } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string; milestoneId: string }>;
}

// PATCH /api/goals/:id/milestones/:milestoneId - Update milestone (e.g. toggle complete)
export async function PATCH(req: Request, { params }: RouteParams) {
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

    const body = await req.json().catch(() => ({}));
    const parseResult = updateMilestoneSchema.safeParse(body);

    if (!parseResult.success) {
      const { error, issues } = formatZodError(parseResult.error);
      return NextResponse.json({ error, issues }, { status: 400 });
    }

    const updateData: any = {};
    if (parseResult.data.title !== undefined) updateData.title = parseResult.data.title;
    if (parseResult.data.description !== undefined) updateData.description = parseResult.data.description;
    if (parseResult.data.order !== undefined) updateData.order = parseResult.data.order;
    if (parseResult.data.targetDate !== undefined) {
      updateData.targetDate = parseResult.data.targetDate ? new Date(parseResult.data.targetDate) : null;
    }
    if (parseResult.data.isCompleted !== undefined) {
      updateData.isCompleted = parseResult.data.isCompleted;
      updateData.completedAt = parseResult.data.isCompleted ? new Date() : null;
    }

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: updateData,
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

    return NextResponse.json({ milestone, updatedProgress: progress });
  } catch (error) {
    console.error("PATCH milestone error:", error);
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
  }
}

// DELETE /api/goals/:id/milestones/:milestoneId - Delete milestone
export async function DELETE(req: Request, { params }: RouteParams) {
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

    await prisma.milestone.delete({
      where: { id: milestoneId },
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

    return NextResponse.json({ message: "Milestone deleted", updatedProgress: progress });
  } catch (error) {
    console.error("DELETE milestone error:", error);
    return NextResponse.json({ error: "Failed to delete milestone" }, { status: 500 });
  }
}
