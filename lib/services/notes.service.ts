import { prisma } from "@/lib/prisma";

export interface CreateNoteInput {
  userId: string;
  title: string;
  content?: string | null;
  category?: string;
  categoryId?: string | null;
  projectId?: string | null;
  color?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  tags?: string[];
}

export interface SearchNotesInput {
  userId: string;
  query: string;
  limit?: number;
}

/**
 * Service: Create a Note with category & tag upserts
 */
export async function createNote(input: CreateNoteInput) {
  const {
    userId,
    title,
    content = "",
    category = "General",
    categoryId,
    projectId,
    color = "default",
    isPinned = false,
    isFavorite = false,
    isArchived = false,
    tags = [],
  } = input;

  let finalCategoryId = categoryId;

  // Auto-upsert category if string name provided
  if (!finalCategoryId && category) {
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
        color: "#6366f1",
      },
    });
    finalCategoryId = cat.id;
  }

  // Create Note record
  const note = await prisma.note.create({
    data: {
      userId,
      title: title.trim(),
      content: content || "",
      categoryId: finalCategoryId,
      projectId: projectId || null,
      color,
      isPinned,
      isFavorite,
      isArchived,
    },
    include: {
      category: true,
      project: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  // Link / upsert tags
  if (tags && tags.length > 0) {
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

      await prisma.noteTag.upsert({
        where: {
          noteId_tagId: {
            noteId: note.id,
            tagId: tag.id,
          },
        },
        update: {},
        create: {
          noteId: note.id,
          tagId: tag.id,
        },
      });
    }
  }

  return {
    ...note,
    categoryName: note.category?.name || "General",
  };
}

/**
 * Service: Search notes by keyword across title & content
 */
export async function searchNotes({ userId, query, limit = 5 }: SearchNotesInput) {
  const clean = query.trim();
  if (!clean) return [];

  const notes = await prisma.note.findMany({
    where: {
      userId,
      isArchived: false,
      OR: [
        { title: { contains: clean, mode: "insensitive" } },
        { content: { contains: clean, mode: "insensitive" } },
        {
          tags: {
            some: {
              tag: { name: { contains: clean, mode: "insensitive" } },
            },
          },
        },
      ],
    },
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
    orderBy: [
      { isPinned: "desc" },
      { updatedAt: "desc" },
    ],
    take: limit,
  });

  return notes.map((n) => ({
    ...n,
    categoryName: n.category?.name || "General",
    tags: n.tags.map((t) => t.tag.name),
  }));
}
