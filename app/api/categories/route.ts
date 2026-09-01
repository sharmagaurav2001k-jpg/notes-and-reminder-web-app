import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCategorySchema, formatZodError } from "@/lib/validations";

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

// GET /api/categories
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { notes: true },
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error("Fetch categories error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST /api/categories
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createCategorySchema.safeParse(body);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const category = await prisma.category.upsert({
      where: {
        userId_name: {
          userId,
          name: result.data.name.trim(),
        },
      },
      update: {
        color: result.data.color,
      },
      create: {
        name: result.data.name.trim(),
        color: result.data.color,
        userId,
      },
    });

    return NextResponse.json({ category, message: "Category saved" }, { status: 201 });
  } catch (error: any) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create category" },
      { status: 500 }
    );
  }
}
