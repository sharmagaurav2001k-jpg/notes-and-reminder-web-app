import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quickNoteSchema, formatZodError } from "@/lib/validations";

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

// POST /api/notes/quick
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = quickNoteSchema.safeParse(body);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const rawText = (result.data.text || result.data.content || "").trim();

    if (!rawText) {
      return NextResponse.json(
        { error: "Text or content is required for Quick Capture" },
        { status: 400 }
      );
    }

    const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
    let title = "";
    let content = "";

    if (lines.length > 1) {
      title = lines[0].slice(0, 120);
      content = lines.slice(1).join("\n");
    } else {
      title = rawText.length > 60 ? rawText.slice(0, 60) + "..." : rawText;
      content = rawText;
    }

    const category = await prisma.category.upsert({
      where: {
        userId_name: {
          userId,
          name: "Quick Notes",
        },
      },
      update: {},
      create: {
        name: "Quick Notes",
        userId,
        color: "#10b981",
      },
    });

    const note = await prisma.note.create({
      data: {
        title,
        content,
        categoryId: category.id,
        userId,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(
      {
        note: {
          ...note,
          category: note.category?.name || "Quick Notes",
        },
        message: "Quick note captured successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Quick note capture error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to capture quick note" },
      { status: 500 }
    );
  }
}
