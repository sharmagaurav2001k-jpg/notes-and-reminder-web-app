import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNoteSchema, formatZodError } from "@/lib/validations";
import { createNote } from "@/lib/services/notes.service";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";

// GET /api/notes
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const tag = searchParams.get("tag") || "";
    const projectId = searchParams.get("projectId") || "";
    const isArchived = searchParams.get("archived") === "true";
    const isFavorite = searchParams.get("favorite") === "true" ? true : undefined;

    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 50;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId,
      isArchived,
      ...(isFavorite !== undefined ? { isFavorite } : {}),
      ...(projectId ? { projectId } : {}),
      ...(category && category !== "All"
        ? {
            category: {
              name: { equals: category, mode: "insensitive" },
            },
          }
        : {}),
      ...(tag
        ? {
            tags: {
              some: {
                tag: {
                  name: { equals: tag, mode: "insensitive" },
                },
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { content: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, notes] = await Promise.all([
      prisma.note.count({ where: whereClause }),
      prisma.note.findMany({
        where: whereClause,
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
            include: {
              tag: true,
            },
          },
        },
        orderBy: [
          { isPinned: "desc" },
          { updatedAt: "desc" },
        ],
        skip,
        take: limit,
      }),
    ]);

    const formattedNotes = notes.map((n) => ({
      ...n,
      category: n.category?.name || "General",
      categoryColor: n.category?.color || "#6366f1",
      tags: n.tags.map((t) => t.tag.name),
    }));

    return NextResponse.json({
      notes: formattedNotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
      },
    });
  } catch (error: any) {
    console.error("Fetch notes error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// POST /api/notes
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
    const result = createNoteSchema.safeParse(body);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      return NextResponse.json(formatted, { status: 400 });
    }

    const note = await createNote({
      userId,
      ...result.data,
    });

    return NextResponse.json(
      {
        note: {
          ...note,
          category: note.categoryName,
        },
        message: "Note created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create note error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create note in database" },
      { status: 500 }
    );
  }
}
