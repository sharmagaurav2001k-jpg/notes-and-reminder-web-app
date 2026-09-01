import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProjectSchema, formatZodError } from "@/lib/validations";

// GET /api/projects - List projects with optimized select/include and computed metrics
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const goalId = searchParams.get("goalId");
    const search = searchParams.get("search");

    const whereClause: any = {
      userId: session.user.id,
    };

    if (status && status !== "all") {
      whereClause.status = status;
    }

    if (goalId && goalId !== "all") {
      whereClause.goalId = goalId;
    }

    if (search && search.trim()) {
      whereClause.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        goalId: true,
        createdAt: true,
        updatedAt: true,
        goal: {
          select: {
            id: true,
            name: true,
            color: true,
            type: true,
            progress: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            dueTime: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            notes: true,
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { updatedAt: "desc" },
      ],
    });

    // Compute task counts and progress rates cleanly
    const enrichedProjects = projects.map((project) => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter((t) => t.status === "Completed").length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...project,
        progress,
        tasksCount: project._count.tasks,
        completedTasksCount: completedTasks,
        notesCount: project._count.notes,
      };
    });

    return NextResponse.json({ projects: enrichedProjects });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

// POST /api/projects - Create a new project linked optionally to a Goal
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = createProjectSchema.safeParse(body);

    if (!parseResult.success) {
      const { error, issues } = formatZodError(parseResult.error);
      return NextResponse.json({ error, issues }, { status: 400 });
    }

    const { name, description, goalId, status } = parseResult.data;

    // If goalId is provided, verify ownership
    if (goalId) {
      const userGoal = await prisma.goal.findFirst({
        where: { id: goalId, userId: session.user.id },
        select: { id: true },
      });

      if (!userGoal) {
        return NextResponse.json({ error: "Associated goal not found or access denied" }, { status: 404 });
      }
    }

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        goalId: goalId || null,
        status: status || "Active",
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        goalId: true,
        createdAt: true,
        updatedAt: true,
        goal: {
          select: {
            id: true,
            name: true,
            color: true,
            type: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            notes: true,
          },
        },
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
