import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUserId } from "@/lib/auth-helpers";

// GET /api/notes/search?q=...&status=recent|favorites|pinned|archived
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getAuthenticatedUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status") || "all"; // all, recent, favorites, pinned, archived
    const category = searchParams.get("category");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    // If a search query is provided, execute Postgres tsvector Full-Text Search with ILIKE partial match
    if (rawQuery) {
      const ilikePattern = `%${rawQuery}%`;

      const results = await prisma.$queryRaw<Array<{
        id: string;
        title: string;
        content: string | null;
        color: string;
        isPinned: boolean;
        isFavorite: boolean;
        isArchived: boolean;
        categoryName: string | null;
        tags: any;
        createdAt: Date;
        updatedAt: Date;
        rank: number;
      }>>`
        SELECT 
          n.id,
          n.title,
          n.content,
          n.color,
          n."isPinned",
          n."isFavorite",
          n."isArchived",
          n."createdAt",
          n."updatedAt",
          c.name AS "categoryName",
          COALESCE(
            (
              SELECT json_agg(t.name)
              FROM "NoteTag" nt
              JOIN "Tag" t ON nt."tagId" = t.id
              WHERE nt."noteId" = n.id
            ),
            '[]'::json
          ) AS tags,
          ts_rank(
            to_tsvector('english', COALESCE(n.title, '') || ' ' || COALESCE(n.content, '')),
            plainto_tsquery('english', ${rawQuery})
          ) AS rank
        FROM "Note" n
        LEFT JOIN "Category" c ON n."categoryId" = c.id
        WHERE n."userId" = ${userId}
          AND (
            to_tsvector('english', COALESCE(n.title, '') || ' ' || COALESCE(n.content, '')) @@ plainto_tsquery('english', ${rawQuery})
            OR n.title ILIKE ${ilikePattern}
            OR n.content ILIKE ${ilikePattern}
            OR EXISTS (
              SELECT 1 FROM "NoteTag" nt2
              JOIN "Tag" t2 ON nt2."tagId" = t2.id
              WHERE nt2."noteId" = n.id AND t2.name ILIKE ${ilikePattern}
            )
          )
        ORDER BY rank DESC, n."isPinned" DESC, n."updatedAt" DESC
        LIMIT ${limit};
      `;

      const formattedNotes = results.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        color: n.color,
        category: n.categoryName || "General",
        isPinned: Boolean(n.isPinned),
        isFavorite: Boolean(n.isFavorite),
        isArchived: Boolean(n.isArchived),
        tags: Array.isArray(n.tags) ? n.tags : [],
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }));

      return NextResponse.json({
        notes: formattedNotes,
        query: rawQuery,
        total: formattedNotes.length,
      });
    }

    // If no search query, return standard filtered views (e.g. Recent, Favorites/Pinned, Archived)
    const whereClause: Prisma.NoteWhereInput = {
      userId,
    };

    if (status === "pinned") {
      whereClause.isPinned = true;
      whereClause.isArchived = false;
    } else if (status === "favorites") {
      whereClause.isFavorite = true;
      whereClause.isArchived = false;
    } else if (status === "recent") {
      whereClause.isArchived = false;
    } else if (status === "archived") {
      whereClause.isArchived = true;
    } else {
      whereClause.isArchived = false;
    }

    if (category && category !== "All") {
      whereClause.category = { name: category };
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
      take: limit,
      orderBy: [
        { isPinned: "desc" },
        { updatedAt: "desc" },
      ],
      include: {
        category: { select: { id: true, name: true, color: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    const formatted = notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      category: n.category?.name || "General",
      color: n.color,
      isPinned: n.isPinned,
      isArchived: n.isArchived,
      isFavorite: n.isFavorite,
      tags: n.tags.map((t) => t.tag.name),
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));

    return NextResponse.json({
      notes: formatted,
      total: formatted.length,
      status,
    });
  } catch (error: any) {
    console.error("Search notes error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to search notes" },
      { status: 500 }
    );
  }
}
