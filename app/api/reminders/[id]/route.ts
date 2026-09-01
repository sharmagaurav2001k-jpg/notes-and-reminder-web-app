import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateReminderSchema, formatZodError } from "@/lib/validations";

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

// PATCH /api/reminders/[id]
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

    const body = await req.json();
    const result = updateReminderSchema.safeParse(body);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const updated = await prisma.reminder.updateMany({
      where: { id, userId },
      data: {
        ...(result.data.title && { title: result.data.title }),
        ...(result.data.dueDate && { dueDate: new Date(result.data.dueDate) }),
        ...(result.data.priority && { priority: result.data.priority }),
        ...(result.data.isCompleted !== undefined && { isCompleted: result.data.isCompleted }),
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Reminder not found or unauthorized" }, { status: 404 });
    }

    const reminder = await prisma.reminder.findUnique({ where: { id } });

    return NextResponse.json({ reminder, message: "Reminder updated successfully" });
  } catch (error: any) {
    console.error("Update reminder error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update reminder" }, { status: 500 });
  }
}

// DELETE /api/reminders/[id]
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

    const deleted = await prisma.reminder.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Reminder not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ message: "Reminder deleted successfully" });
  } catch (error: any) {
    console.error("Delete reminder error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete reminder" }, { status: 500 });
  }
}
