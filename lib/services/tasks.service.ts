import { prisma } from "@/lib/prisma";
import { calculateNextDueDate } from "@/lib/recurrence";
import { calculateAndUpdateGoalProgress } from "@/lib/goal-progress";

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string | null;
  dueDate?: Date | string | null;
  dueTime?: string | null;
  priority?: "Low" | "Medium" | "High" | "Urgent" | string;
  status?: "Inbox" | "Todo" | "InProgress" | "Completed" | "Cancelled" | string;
  repeatRule?: string | null;
  goalId?: string | null;
  projectId?: string | null;
}

/**
 * Service: Create a Task
 */
export async function createTask(input: CreateTaskInput) {
  const {
    userId,
    title,
    description = null,
    dueDate,
    dueTime = null,
    priority = "Medium",
    status = "Todo",
    repeatRule = null,
    goalId = null,
    projectId = null,
  } = input;

  let parsedDueDate: Date | null = null;
  if (dueDate) {
    parsedDueDate = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  }

  const task = await prisma.task.create({
    data: {
      userId,
      title: title.trim(),
      description: description ? description.trim() : null,
      dueDate: parsedDueDate,
      dueTime,
      priority,
      status,
      repeatRule,
      goalId: goalId || null,
      projectId: projectId || null,
    },
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

  return task;
}

/**
 * Service: Toggle or mark task complete, handling recurrence & goal sync
 */
export async function completeTask({
  taskId,
  userId,
  targetStatus,
}: {
  taskId: string;
  userId: string;
  targetStatus?: "Completed" | "Todo";
}) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!task) {
    throw new Error(`Task with ID "${taskId}" not found.`);
  }

  const willBeCompleted = targetStatus ? targetStatus === "Completed" : task.status !== "Completed";

  // 1. Update task status
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: willBeCompleted ? "Completed" : "Todo",
      completedAt: willBeCompleted ? new Date() : null,
    },
    include: {
      goal: true,
      project: true,
    },
  });

  let nextOccurrence = null;

  // 2. Handle recurring rule auto-advance on complete
  if (willBeCompleted && task.repeatRule) {
    const nextDueDate = calculateNextDueDate(
      task.dueDate || task.createdAt,
      task.repeatRule,
      new Date()
    );

    if (nextDueDate) {
      nextOccurrence = await prisma.task.create({
        data: {
          userId,
          title: task.title,
          description: task.description,
          dueDate: nextDueDate,
          dueTime: task.dueTime,
          priority: task.priority,
          status: "Todo",
          repeatRule: task.repeatRule,
          goalId: task.goalId,
          projectId: task.projectId,
        },
      });
    }
  }

  // 3. If linked to a goal with auto-calculation, sync progress
  if (task.goalId) {
    try {
      await calculateAndUpdateGoalProgress(task.goalId);
    } catch (e) {
      console.warn("Goal progress sync skipped:", e);
    }
  }

  return {
    task: updatedTask,
    nextOccurrence,
    wasCompleted: willBeCompleted,
  };
}

/**
 * Service: Fetch Today's scheduled tasks for a user
 */
export async function getTodayTasks(userId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return prisma.task.findMany({
    where: {
      userId,
      dueDate: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      goal: { select: { id: true, name: true, color: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: [
      { status: "asc" },
      { priority: "desc" },
      { dueTime: "asc" },
    ],
  });
}
