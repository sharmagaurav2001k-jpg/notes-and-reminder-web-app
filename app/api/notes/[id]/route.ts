import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateNoteSchema, formatZodError } from "@/lib/validations";

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

// GET /api/notes/[id]
export async function GET(
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

    const note = await prisma.note.findFirst({
      where: { id, userId },
      include: {
        category: true,
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({
      note: {
        ...note,
        category: note.category?.name || "General",
        tags: note.tags.map((t) => t.tag.name),
      },
    });
  } catch (error: any) {
    console.error("Fetch note error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch note" }, { status: 500 });
  }
}

// PATCH /api/notes/[id]
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
    const result = updateNoteSchema.safeParse(body);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const { category, categoryId, projectId, tags, ...directUpdates } = result.data;

    let finalCategoryId = categoryId;
    if (category !== undefined && !finalCategoryId) {
      const cat = await prisma.category.upsert({
        where: {
          userId_name: {
            userId,
            name: category.trim(),
          },
        },
        update: {},
        create: {
          name: category.trim(),
          userId,
        },
      });
      finalCategoryId = cat.id;
    }

    const updated = await prisma.note.updateMany({
      where: { id, userId },
      data: {
        ...directUpdates,
        ...(finalCategoryId !== undefined && { categoryId: finalCategoryId }),
        ...(projectId !== undefined && { projectId: projectId || null }),
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
    }

    // Update tags if provided
    if (tags !== undefined) {
      await prisma.noteTag.deleteMany({ where: { noteId: id } });

      for (const tagName of tags) {
        if (!tagName.trim()) continue;
        const tag = await prisma.tag.upsert({
          where: {
            userId_name: {
              userId,
              name: tagName.trim().toLowerCase(),
            },
          },
          update: {},
          create: {
            name: tagName.trim().toLowerCase(),
            userId,
          },
        });

        await prisma.noteTag.create({
          data: {
            noteId: id,
            tagId: tag.id,
          },
        });
      }
    }

    const updatedNote = await prisma.note.findUnique({
      where: { id },
      include: {
        category: true,
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json({
      note: {
        ...updatedNote,
        category: updatedNote?.category?.name || "General",
        tags: updatedNote?.tags.map((t) => t.tag.name) || [],
      },
      message: "Note updated successfully",
    });
  } catch (error: any) {
    console.error("Update note error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update note" }, { status: 500 });
  }
}

// DELETE /api/notes/[id]
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

    const deleted = await prisma.note.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ message: "Note deleted successfully" });
  } catch (error: any) {
    console.error("Delete note error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete note" }, { status: 500 });
  }
}
