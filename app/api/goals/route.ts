import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGoalSchema, formatZodError } from "@/lib/validations";

// GET /api/goals - List all goals with filters, projects & milestone/task statistics
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const whereClause: any = {
      userId: session.user.id,
    };

    if (status && status !== "all") {
      whereClause.status = status;
    }

    if (type && type !== "all") {
      whereClause.type = type;
    }

    if (category && category !== "all") {
      whereClause.category = category;
    }

    if (search && search.trim()) {
      whereClause.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const goals = await prisma.goal.findMany({
      where: whereClause,
      include: {
        milestones: {
          orderBy: { order: "asc" },
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
          },
        },
        _count: {
          select: {
            milestones: true,
            tasks: true,
            projects: true,
          },
        },
      },
      orderBy: [
        { status: "asc" },
        { targetDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    // Compute progress if milestones or tasks exist
    const enrichedGoals = goals.map((goal) => {
      const totalMilestones = goal.milestones.length;
      const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;
      
      let computedProgress = goal.progress;
      if (totalMilestones > 0) {
        computedProgress = Math.round((completedMilestones / totalMilestones) * 100);
      }

      return {
        ...goal,
        computedProgress,
        milestonesCount: totalMilestones,
        completedMilestonesCount: completedMilestones,
        projectsCount: goal._count.projects,
        tasksCount: goal._count.tasks,
      };
    });

    return NextResponse.json({ goals: enrichedGoals });
  } catch (error) {
    console.error("GET /api/goals error:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

import { createGoal } from "@/lib/services/goals.service";

// POST /api/goals - Create new goal (with optional initial milestones)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = createGoalSchema.safeParse(body);

    if (!parseResult.success) {
      const { error, issues } = formatZodError(parseResult.error);
      return NextResponse.json({ error, issues }, { status: 400 });
    }

    const goal = await createGoal({
      userId: session.user.id,
      ...parseResult.data,
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("POST /api/goals error:", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
