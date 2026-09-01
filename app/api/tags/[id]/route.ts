import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTagSchema, formatZodError } from "@/lib/validations";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";

// PATCH /api/tags/[id]
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
    const result = updateTagSchema.safeParse(body);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const updated = await prisma.tag.updateMany({
      where: { id, userId },
      data: {
        ...(result.data.name && { name: result.data.name.trim().toLowerCase() }),
        ...(result.data.color && { color: result.data.color }),
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Tag not found or unauthorized" }, { status: 404 });
    }

    const tag = await prisma.tag.findUnique({ where: { id } });

    return NextResponse.json({ tag, message: "Tag updated successfully" });
  } catch (error: any) {
    console.error("Update tag error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update tag" },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/[id]
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

    const deleted = await prisma.tag.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Tag not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ message: "Tag deleted successfully" });
  } catch (error: any) {
    console.error("Delete tag error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete tag" },
      { status: 500 }
    );
  }
}
