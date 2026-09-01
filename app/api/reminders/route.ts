import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createReminderSchema, formatZodError } from "@/lib/validations";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";

// GET /api/reminders
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reminders = await prisma.reminder.findMany({
      where: { userId },
      orderBy: [
        { isCompleted: "asc" },
        { dueDate: "asc" },
      ],
    });

    return NextResponse.json({ reminders });
  } catch (error: any) {
    console.error("Fetch reminders error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch reminders" }, { status: 500 });
  }
}

// POST /api/reminders
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createReminderSchema.safeParse(body);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const reminder = await prisma.reminder.create({
      data: {
        title: result.data.title,
        dueDate: new Date(result.data.dueDate),
        priority: result.data.priority,
        userId,
      },
    });

    return NextResponse.json({ reminder, message: "Reminder created successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("Create reminder error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create reminder" }, { status: 500 });
  }
}
