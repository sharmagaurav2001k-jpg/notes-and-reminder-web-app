import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

import { completeTask } from "@/lib/services/tasks.service";

// POST /api/tasks/[id]/complete
export async function POST(
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

    const { task, nextOccurrence, wasCompleted } = await completeTask({
      taskId: id,
      userId,
    });

    return NextResponse.json({
      task,
      nextOccurrence,
      message: wasCompleted
        ? nextOccurrence
          ? "Task completed & next recurring instance scheduled!"
          : "Task marked as completed"
        : "Task marked as pending",
    });
  } catch (error: any) {
    console.error("Complete task error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update task completion" },
      { status: 500 }
    );
  }
}
