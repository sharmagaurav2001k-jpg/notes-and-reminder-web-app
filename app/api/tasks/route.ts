import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTaskSchema, formatZodError } from "@/lib/validations";
import { Prisma } from "@prisma/client";

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

// GET /api/tasks (list with status, priority, search, date, goal, and project filters)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // Inbox, Todo, InProgress, Completed, Cancelled
    const priority = searchParams.get("priority"); // Low, Medium, High, Urgent
    const search = searchParams.get("search")?.trim();
    const isCompleted = searchParams.get("completed"); // "true" | "false"
    const goalId = searchParams.get("goalId");
    const projectId = searchParams.get("projectId");

    const whereClause: Prisma.TaskWhereInput = {
      userId,
    };

    if (status && status !== "all") {
      whereClause.status = status;
    }

    if (priority && priority !== "all") {
      whereClause.priority = priority;
    }

    if (goalId) {
      whereClause.goalId = goalId;
    }

    if (projectId) {
      whereClause.projectId = projectId;
    }

    if (isCompleted === "true") {
      whereClause.status = "Completed";
    } else if (isCompleted === "false") {
      whereClause.status = { not: "Completed" };
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
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
      orderBy: [
        { status: "asc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ tasks, total: tasks.length });
  } catch (error: any) {
    console.error("Fetch tasks error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

import { createTask } from "@/lib/services/tasks.service";

// POST /api/tasks (create a new task)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createTaskSchema.safeParse(body);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const task = await createTask({
      userId,
      ...result.data,
    });

    return NextResponse.json(
      { task, message: "Task created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create task" },
      { status: 500 }
    );
  }
}
