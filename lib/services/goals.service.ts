import { prisma } from "@/lib/prisma";

export interface CreateGoalInput {
  userId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  type?: string;
  startDate?: Date | string | null;
  targetDate?: Date | string | null;
  priority?: "Low" | "Medium" | "High" | "Urgent" | string;
  status?: "Active" | "InProgress" | "Completed" | "Paused" | "Cancelled" | string;
  color?: string | null;
  progress?: number;
  milestones?: Array<{
    title: string;
    description?: string | null;
    targetDate?: Date | string | null;
    isCompleted?: boolean;
    order?: number;
  }>;
}

/**
 * Service: Create a Goal
 */
export async function createGoal(input: CreateGoalInput) {
  const {
    userId,
    name,
    description = null,
    category = "General",
    type = "Short-term",
    startDate = new Date(),
    targetDate = null,
    priority = "Medium",
    status = "Active",
    color = "#6366f1",
    progress = 0,
    milestones,
  } = input;

  let parsedStartDate: Date | null = null;
  if (startDate) {
    parsedStartDate = typeof startDate === "string" ? new Date(startDate) : startDate;
  }

  let parsedTargetDate: Date | null = null;
  if (targetDate) {
    parsedTargetDate = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      name: name.trim(),
      description: description ? description.trim() : null,
      category: category || "General",
      type,
      startDate: parsedStartDate,
      targetDate: parsedTargetDate,
      priority,
      status,
      color: color || "#6366f1",
      progress: progress || 0,
      milestones:
        milestones && milestones.length > 0
          ? {
              create: milestones.map((m, idx) => ({
                title: m.title.trim(),
                description: m.description ? m.description.trim() : null,
                targetDate: m.targetDate ? (typeof m.targetDate === "string" ? new Date(m.targetDate) : m.targetDate) : null,
                isCompleted: m.isCompleted || false,
                order: m.order ?? idx,
              })),
            }
          : undefined,
    },
    include: {
      milestones: {
        orderBy: { order: "asc" },
      },
      tasks: { select: { id: true, status: true } },
      projects: { select: { id: true, name: true, status: true } },
      _count: {
        select: { milestones: true, tasks: true, projects: true },
      },
    },
  });

  return goal;
}

/**
 * Service: Fetch active goals for a user
 */
export async function getActiveGoals(userId: string, limit = 10) {
  return prisma.goal.findMany({
    where: {
      userId,
      status: { in: ["Active", "InProgress"] },
    },
    include: {
      milestones: true,
      tasks: { select: { id: true, status: true } },
      projects: { select: { id: true, name: true, status: true } },
    },
    orderBy: [
      { targetDate: "asc" },
      { createdAt: "desc" },
    ],
    take: limit,
  });
}
