import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTaskSchema, formatZodError } from "@/lib/validations";
import { calculateNextDueDate } from "@/lib/recurrence";

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

// GET /api/tasks/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.task.findFirst({
      where: { id, userId },
      include: {
        goal: {
          select: {
            id: true,
            name: true,
            color: true,
            type: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error("Fetch single task error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingTask = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 });
    }

    const body = await req.json();
    const result = updateTaskSchema.safeParse(body);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const data = result.data;
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.dueTime !== undefined) updateData.dueTime = data.dueTime;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.repeatRule !== undefined) updateData.repeatRule = data.repeatRule;
    if (data.goalId !== undefined) updateData.goalId = data.goalId;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;

    let nextOccurrence = null;

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "Completed") {
        updateData.completedAt = new Date();

        // If transitioning to Completed and task has a repeatRule, generate next occurrence
        if (existingTask.status !== "Completed" && (data.repeatRule || existingTask.repeatRule)) {
          const rule = data.repeatRule || existingTask.repeatRule;
          const nextDueDate = calculateNextDueDate(
            data.dueDate ? new Date(data.dueDate) : existingTask.dueDate || existingTask.createdAt,
            rule,
            new Date()
          );

          if (nextDueDate) {
            nextOccurrence = await prisma.task.create({
              data: {
                title: data.title || existingTask.title,
                description: data.description !== undefined ? data.description : existingTask.description,
                dueDate: nextDueDate,
                dueTime: data.dueTime || existingTask.dueTime,
                priority: data.priority || existingTask.priority,
                status: "Todo",
                repeatRule: rule,
                goalId: data.goalId || existingTask.goalId,
                projectId: data.projectId || existingTask.projectId,
                userId,
              },
            });
          }
        }
      } else {
        updateData.completedAt = null;
      }
    }

    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        goal: {
          select: {
            id: true,
            name: true,
            color: true,
            type: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      task: updatedTask,
      nextOccurrence,
      message: "Task updated successfully",
    });
  } catch (error: any) {
    console.error("Update task error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await prisma.task.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete task" },
      { status: 500 }
    );
  }
}
