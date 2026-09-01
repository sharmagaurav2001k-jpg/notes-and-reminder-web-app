import { prisma } from "@/lib/prisma";

export interface GoalProgressResult {
  goalId: string;
  progress: number;
  totalMilestones: number;
  completedMilestones: number;
  isAutoCalculated: boolean;
  autoUpdatedStatus?: string;
}

/**
 * Calculates and updates goal progress based on milestone completion ratio.
 * If manualOverrideValue is provided, the manual value is saved directly.
 * If no milestones exist and no manual value is provided, existing progress is preserved.
 */
export async function calculateAndUpdateGoalProgress(
  goalId: string,
  manualOverrideValue?: number | null
): Promise<GoalProgressResult> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: {
      milestones: true,
      tasks: { select: { id: true, status: true } },
    },
  });

  if (!goal) {
    throw new Error(`Goal with ID "${goalId}" not found.`);
  }

  const totalMilestones = goal.milestones.length;
  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;

  let newProgress = goal.progress;
  let isAutoCalculated = false;

  if (manualOverrideValue !== undefined && manualOverrideValue !== null) {
    // 1. Manual User Override (clamped between 0 and 100)
    newProgress = Math.max(0, Math.min(100, Math.round(manualOverrideValue)));
    isAutoCalculated = false;
  } else if (totalMilestones > 0) {
    // 2. Auto-calculate from milestone ratio
    newProgress = Math.round((completedMilestones / totalMilestones) * 100);
    isAutoCalculated = true;
  }

  // Auto-transition status when progress hits 100% or drops below 100%
  let statusUpdate: string | undefined = undefined;
  if (newProgress === 100 && goal.status !== "Completed" && goal.status !== "Cancelled") {
    statusUpdate = "Completed";
  } else if (newProgress < 100 && goal.status === "Completed") {
    statusUpdate = newProgress > 0 ? "InProgress" : "Active";
  }

  // Persist to database
  await prisma.goal.update({
    where: { id: goalId },
    data: {
      progress: newProgress,
      ...(statusUpdate ? { status: statusUpdate } : {}),
    },
  });

  return {
    goalId,
    progress: newProgress,
    totalMilestones,
    completedMilestones,
    isAutoCalculated,
    autoUpdatedStatus: statusUpdate,
  };
}

/**
 * Bulk recalculates progress for all active goals of a user.
 */
export async function recalculateAllUserGoals(userId: string) {
  const goals = await prisma.goal.findMany({
    where: { userId },
    include: { milestones: true },
  });

  const results: GoalProgressResult[] = [];

  for (const goal of goals) {
    const totalMilestones = goal.milestones.length;
    if (totalMilestones > 0) {
      const res = await calculateAndUpdateGoalProgress(goal.id);
      results.push(res);
    }
  }

  return results;
}
