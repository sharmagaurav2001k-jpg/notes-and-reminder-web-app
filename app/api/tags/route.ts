import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTagSchema, formatZodError } from "@/lib/validations";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";

// GET /api/tags
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tags = await prisma.tag.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { notes: true },
        },
      },
    });

    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error("Fetch tags error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

// POST /api/tags
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createTagSchema.safeParse(body);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const tagName = result.data.name.trim().toLowerCase();

    const tag = await prisma.tag.upsert({
      where: {
        userId_name: {
          userId,
          name: tagName,
        },
      },
      update: {
        color: result.data.color,
      },
      create: {
        name: tagName,
        color: result.data.color,
        userId,
      },
    });

    return NextResponse.json({ tag, message: "Tag saved" }, { status: 201 });
  } catch (error: any) {
    console.error("Create tag error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create tag" },
      { status: 500 }
    );
  }
}
