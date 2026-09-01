import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProjectSchema, formatZodError } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - Get project details with linked tasks, notes, and parent goal
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
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
            progress: true,
            status: true,
          },
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
            completedAt: true,
            createdAt: true,
          },
          orderBy: [
            { status: "asc" },
            { dueDate: "asc" },
            { createdAt: "desc" },
          ],
        },
        notes: {
          select: {
            id: true,
            title: true,
            content: true,
            category: true,
            color: true,
            isPinned: true,
            isFavorite: true,
            updatedAt: true,
          },
          orderBy: [
            { isPinned: "desc" },
            { updatedAt: "desc" },
          ],
        },
        _count: {
          select: {
            tasks: true,
            notes: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === "Completed").length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      project: {
        ...project,
        progress,
        tasksCount: project._count.tasks,
        completedTasksCount: completedTasks,
        notesCount: project._count.notes,
      },
    });
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

// PATCH /api/projects/[id] - Update project metadata, status, or linked goal
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingProject = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = updateProjectSchema.safeParse(body);

    if (!parseResult.success) {
      const { error, issues } = formatZodError(parseResult.error);
      return NextResponse.json({ error, issues }, { status: 400 });
    }

    const { name, description, goalId, status } = parseResult.data;

    // If updating goalId, verify ownership
    if (goalId !== undefined && goalId !== null) {
      const userGoal = await prisma.goal.findFirst({
        where: { id: goalId, userId: session.user.id },
        select: { id: true },
      });

      if (!userGoal) {
        return NextResponse.json({ error: "Associated goal not found or access denied" }, { status: 404 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (goalId !== undefined) updateData.goalId = goalId || null;
    if (status !== undefined) updateData.status = status;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ project });
  } catch (error) {
    console.error("PATCH /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete project safely
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingProject = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
