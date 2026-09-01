import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCategorySchema, formatZodError } from "@/lib/validations";

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

// PATCH /api/categories/[id]
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
    const result = updateCategorySchema.safeParse(body);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const updated = await prisma.category.updateMany({
      where: { id, userId },
      data: {
        ...(result.data.name && { name: result.data.name.trim() }),
        ...(result.data.color && { color: result.data.color }),
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Category not found or unauthorized" }, { status: 404 });
    }

    const category = await prisma.category.findUnique({ where: { id } });

    return NextResponse.json({ category, message: "Category updated successfully" });
  } catch (error: any) {
    console.error("Update category error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id]
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

    await prisma.note.updateMany({
      where: { categoryId: id, userId },
      data: { categoryId: null },
    });

    const deleted = await prisma.category.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Category not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error: any) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete category" },
      { status: 500 }
    );
  }
}
