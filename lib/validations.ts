import { z } from "zod";

// ==========================================
// Note Schemas
// ==========================================
export const createNoteSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(1, "Title cannot be empty")
    .max(200, "Title cannot exceed 200 characters"),
  content: z.string().optional().nullable().default(""),
  category: z.string().trim().max(50, "Category name too long").optional().default("General"),
  categoryId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  color: z.string().max(30).optional().default("default"),
  isPinned: z.boolean().optional().default(false),
  isFavorite: z.boolean().optional().default(false),
  isArchived: z.boolean().optional().default(false),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(15, "Cannot attach more than 15 tags")
    .optional()
    .default([]),
});

export const updateNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(200, "Title cannot exceed 200 characters")
    .optional(),
  content: z.string().optional().nullable(),
  category: z.string().trim().max(50, "Category name too long").optional(),
  categoryId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  color: z.string().max(30).optional(),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(15).optional(),
});

export const quickNoteSchema = z
  .object({
    text: z.string().optional(),
    content: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean((data.text && data.text.trim().length > 0) || (data.content && data.content.trim().length > 0)),
    {
      message: "Text or content is required for Quick Capture",
      path: ["text"],
    }
  );

// ==========================================
// Category Schemas
// ==========================================
export const createCategorySchema = z.object({
  name: z
    .string({ required_error: "Category name is required" })
    .trim()
    .min(1, "Category name cannot be empty")
    .max(50, "Category name cannot exceed 50 characters"),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a valid hex code (e.g. #6366f1)")
    .optional()
    .default("#6366f1"),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name cannot be empty")
    .max(50, "Category name cannot exceed 50 characters")
    .optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a valid hex code (e.g. #6366f1)")
    .optional(),
});

// ==========================================
// Tag Schemas
// ==========================================
export const createTagSchema = z.object({
  name: z
    .string({ required_error: "Tag name is required" })
    .trim()
    .min(1, "Tag name cannot be empty")
    .max(30, "Tag name cannot exceed 30 characters"),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a valid hex code (e.g. #8b5cf6)")
    .optional()
    .default("#8b5cf6"),
});

export const updateTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tag name cannot be empty")
    .max(30, "Tag name cannot exceed 30 characters")
    .optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a valid hex code (e.g. #8b5cf6)")
    .optional(),
});

// ==========================================
// Reminder Schemas
// ==========================================
export const createReminderSchema = z.object({
  title: z
    .string({ required_error: "Reminder title is required" })
    .trim()
    .min(1, "Reminder title cannot be empty")
    .max(200, "Reminder title cannot exceed 200 characters"),
  dueDate: z.string({ required_error: "Due date is required" }).or(z.date()),
  priority: z.enum(["High", "Medium", "Normal"]).optional().default("Normal"),
});

export const updateReminderSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  dueDate: z.string().or(z.date()).optional(),
  priority: z.enum(["High", "Medium", "Normal"]).optional(),
  isCompleted: z.boolean().optional(),
});

// ==========================================
// Task Schemas & Business Rules
// ==========================================
export const createTaskSchema = z
  .object({
    title: z
      .string({ required_error: "Task title is required" })
      .trim()
      .min(1, "Task title cannot be empty")
      .max(250, "Task title cannot exceed 250 characters"),
    description: z.string().optional().nullable().default(""),
    dueDate: z.string().datetime().or(z.string().date()).or(z.date()).optional().nullable(),
    dueTime: z.string().max(20).optional().nullable(),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional().default("Medium"),
    status: z.enum(["Inbox", "Todo", "InProgress", "Completed", "Cancelled"]).optional().default("Inbox"),
    repeatRule: z.string().max(200).optional().nullable(),
    goalId: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Rule 1: If dueTime is specified, dueDate is mandatory
    if (data.dueTime && !data.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Due date is required when a specific due time is provided",
        path: ["dueDate"],
      });
    }

    // Rule 2: Recurring tasks must have a base dueDate
    if (data.repeatRule && !data.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Due date is required for recurring tasks",
        path: ["dueDate"],
      });
    }
  });

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(250).optional(),
    description: z.string().optional().nullable(),
    dueDate: z.string().datetime().or(z.string().date()).or(z.date()).optional().nullable(),
    dueTime: z.string().max(20).optional().nullable(),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
    status: z.enum(["Inbox", "Todo", "InProgress", "Completed", "Cancelled"]).optional(),
    repeatRule: z.string().max(200).optional().nullable(),
    goalId: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
    completedAt: z.string().datetime().or(z.date()).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // If dueTime is explicitly set without dueDate
    if (data.dueTime && data.dueDate === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot set a due time on a task with no due date",
        path: ["dueDate"],
      });
    }
  });

// ==========================================
// Goal & Milestone Schemas
// ==========================================
export const createMilestoneSchema = z.object({
  title: z
    .string({ required_error: "Milestone title is required" })
    .trim()
    .min(1, "Milestone title cannot be empty")
    .max(200, "Milestone title too long"),
  description: z.string().optional().nullable(),
  targetDate: z.string().datetime().or(z.string().date()).or(z.date()).optional().nullable(),
  isCompleted: z.boolean().optional().default(false),
  order: z.number().int().optional().default(0),
});

export const updateMilestoneSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  targetDate: z.string().datetime().or(z.string().date()).or(z.date()).optional().nullable(),
  isCompleted: z.boolean().optional(),
  completedAt: z.string().datetime().or(z.date()).optional().nullable(),
  order: z.number().int().optional(),
});

export const createGoalSchema = z.object({
  name: z
    .string({ required_error: "Goal name is required" })
    .trim()
    .min(1, "Goal name cannot be empty")
    .max(200, "Goal name cannot exceed 200 characters"),
  description: z.string().optional().nullable().default(""),
  category: z.string().trim().max(50).optional().default("General"),
  type: z
    .enum(["Short-term", "Long-term", "Habit", "Financial", "Career", "Learning", "Personal"])
    .optional()
    .default("Short-term"),
  startDate: z.string().datetime().or(z.string().date()).or(z.date()).optional().nullable(),
  targetDate: z.string().datetime().or(z.string().date()).or(z.date()).optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional().default("Medium"),
  status: z.enum(["Active", "InProgress", "Completed", "Paused", "Cancelled", "Archived"]).optional().default("Active"),
  progress: z.number().min(0).max(100).optional().default(0),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a valid hex code")
    .optional()
    .default("#6366f1"),
  milestones: z.array(createMilestoneSchema).optional().default([]),
});

export const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  category: z.string().trim().max(50).optional(),
  type: z
    .enum(["Short-term", "Long-term", "Habit", "Financial", "Career", "Learning", "Personal"])
    .optional(),
  startDate: z.string().datetime().or(z.string().date()).or(z.date()).optional().nullable(),
  targetDate: z.string().datetime().or(z.string().date()).or(z.date()).optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
  status: z.enum(["Active", "InProgress", "Completed", "Paused", "Cancelled", "Archived"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a valid hex code")
    .optional(),
});

// ==========================================
// Project Schemas
// ==========================================
export const createProjectSchema = z.object({
  name: z
    .string({ required_error: "Project name is required" })
    .trim()
    .min(1, "Project name cannot be empty")
    .max(200, "Project name cannot exceed 200 characters"),
  description: z.string().optional().nullable().default(""),
  goalId: z.string().optional().nullable(),
  status: z
    .enum(["Active", "InProgress", "Completed", "Paused", "Cancelled", "Archived"])
    .optional()
    .default("Active"),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  goalId: z.string().optional().nullable(),
  status: z
    .enum(["Active", "InProgress", "Completed", "Paused", "Cancelled", "Archived"])
    .optional(),
});

// ==========================================
// User Profile Schema
// ==========================================
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(100, "Name cannot exceed 100 characters").optional(),
  avatarUrl: z.string().url("Invalid avatar URL format").optional().nullable().or(z.literal("")),
  timezone: z.string().max(50).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

// ==========================================
// Helper for Formatted Zod Error Response
// ==========================================
export function formatZodError(error: z.ZodError) {
  const firstIssue = error.issues[0];
  const message = firstIssue?.message || "Invalid input data";
  return {
    error: message,
    issues: error.flatten().fieldErrors,
  };
}
