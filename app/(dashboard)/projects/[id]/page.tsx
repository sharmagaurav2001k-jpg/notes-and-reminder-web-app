"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Target,
  Plus,
  ArrowLeft,
  Edit3,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  FileText,
  CheckSquare,
  Sparkles,
  Loader2,
  Trash2,
  Layers,
  ChevronRight,
  ExternalLink,
  Tag,
  Star,
  Pin,
  Flame,
  Filter,
  Sliders,
} from "lucide-react";
import { ProjectModal, ProjectItem } from "@/components/projects/project-modal";
import { TaskModal, TaskItem } from "@/components/tasks/task-modal";
import { NoteModal, NoteItem } from "@/components/notes/note-modal";

interface PageProps {
  params: Promise<{ id: string }>;
}

function ProjectDetailContent({ id }: { id: string }) {
  const router = useRouter();

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Task Filter & Inline Add
  const [taskFilter, setTaskFilter] = useState<"all" | "Todo" | "InProgress" | "Completed" | "Urgent">("all");
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskDate, setQuickTaskDate] = useState("");
  const [quickTaskPriority, setQuickTaskPriority] = useState("Medium");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Inline Note Add
  const [quickNoteTitle, setQuickNoteTitle] = useState("");
  const [quickNoteContent, setQuickNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  const fetchProjectData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        const p = data.project;
        setProject(p);
        setTasks(p.tasks || []);
        setNotes(p.notes || []);
      } else if (res.status === 404) {
        router.push("/projects");
      }
    } catch (err) {
      console.error("Failed to load project details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  // Quick inline task creation
  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim() || isAddingTask) return;

    try {
      setIsAddingTask(true);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickTaskTitle.trim(),
          dueDate: quickTaskDate ? new Date(quickTaskDate).toISOString() : null,
          priority: quickTaskPriority,
          projectId: id,
          goalId: project?.goalId || null,
          status: "Todo",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => [data.task, ...prev]);
        setQuickTaskTitle("");
        setQuickTaskDate("");
        setQuickTaskPriority("Medium");
        fetchProjectData();
      }
    } catch (err) {
      console.error("Quick add task error:", err);
    } finally {
      setIsAddingTask(false);
    }
  };

  // Quick inline note creation
  const handleQuickAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteTitle.trim() || isAddingNote) return;

    try {
      setIsAddingNote(true);
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickNoteTitle.trim(),
          content: quickNoteContent.trim() || "",
          projectId: id,
          category: "Project Notes",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => [data.note, ...prev]);
        setQuickNoteTitle("");
        setQuickNoteContent("");
        fetchProjectData();
      }
    } catch (err) {
      console.error("Quick add note error:", err);
    } finally {
      setIsAddingNote(false);
    }
  };

  // Toggle task complete / pending
  const handleToggleTask = async (taskId?: string) => {
    if (!taskId) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: t.status === "Completed" ? "Todo" : "Completed" } : t))
    );

    try {
      await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" });
      fetchProjectData();
    } catch (err) {
      console.error("Toggle task error:", err);
      fetchProjectData();
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId?: string) => {
    if (!taskId) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      fetchProjectData();
    } catch (err) {
      console.error("Delete task error:", err);
      fetchProjectData();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!project) return null;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "all") return true;
    if (taskFilter === "Urgent") return t.priority === "Urgent";
    return t.status === taskFilter;
  });

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects Workspace</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsProjectModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Project</span>
          </button>
        </div>
      </div>

      {/* Hero Visual Card */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg shadow-indigo-500/5 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Metadata & Goal Link */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              {project.goal ? (
                <Link
                  href={`/goals/${project.goal.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg text-white shadow-xs hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: project.goal.color || "#6366f1" }}
                  title="View Parent Goal Roadmap"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Goal: {project.goal.name}</span>
                  <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="Link this project to a Vision Goal"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>⚡ Standalone Project (Click to Link Goal)</span>
                </button>
              )}

              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/50">
                {project.status || "Active"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {project.name}
            </h1>

            {project.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Right: Execution Metric Badge */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 shrink-0 min-w-[220px]">
            <span className="text-3xl font-extrabold bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
              {progress}%
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Task Execution
            </span>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 mt-3">
              <span>✅ {completedTasks}/{totalTasks} Tasks</span>
              <span>•</span>
              <span>📄 {notes.length} Notes</span>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2-Column Section: Project Action Tasks & Project Documentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Project Tasks */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Linked Tasks & Todos</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {completedTasks}/{totalTasks}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Actionable milestones and deliverables for this project
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedTask({ projectId: id, goalId: project.goalId } as any);
                setIsTaskModalOpen(true);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Full Task Modal</span>
            </button>
          </div>

          {/* Quick Add Inline Form */}
          <form
            onSubmit={handleQuickAddTask}
            className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                placeholder="Add task to project (e.g. Design mockups, implement auth API)..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={quickTaskDate}
                  onChange={(e) => setQuickTaskDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
                />
                <select
                  value={quickTaskPriority}
                  onChange={(e) => setQuickTaskPriority(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!quickTaskTitle.trim() || isAddingTask}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                {isAddingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add Task</span>
              </button>
            </div>
          </form>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: "all", label: "All Tasks" },
                { id: "Todo", label: "Todo" },
                { id: "InProgress", label: "In Progress" },
                { id: "Completed", label: "Completed" },
                { id: "Urgent", label: "🔥 Urgent" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTaskFilter(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                  taskFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tasks List */}
          <div className="space-y-2.5">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                No tasks matching this filter. Add deliverables above!
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isCompleted = task.status === "Completed";
                const isUrgent = task.priority === "Urgent";
                const isHigh = task.priority === "High";

                let isOverdue = false;
                if (task.dueDate && !isCompleted) {
                  isOverdue = new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
                }

                return (
                  <div
                    key={task.id}
                    className={`flex items-start justify-between p-3.5 rounded-2xl border transition-all group ${
                      isCompleted
                        ? "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-65"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-semibold text-slate-900 dark:text-slate-100 truncate ${
                            isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              isUrgent
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : isHigh
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {task.priority || "Medium"}
                          </span>

                          <span className="px-1.5 py-0.5 rounded bg-indigo-50/70 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 font-medium">
                            {task.status}
                          </span>

                          {task.dueDate && (
                            <span
                              className={`flex items-center gap-1 font-semibold ${
                                isOverdue
                                  ? "text-rose-600 dark:text-rose-400 font-bold"
                                  : "text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                              {isOverdue && " (Overdue)"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTask(task);
                          setIsTaskModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-colors cursor-pointer"
                        title="Edit task"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 5 Cols: Project Notes & Documentation */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <span>Linked Notes & Docs</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300">
                  {notes.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Documentation, specs & decisions for this project
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedNote({ projectId: id } as any);
                setIsNoteModalOpen(true);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Full Note Modal</span>
            </button>
          </div>

          {/* Quick Note Add Form */}
          <form
            onSubmit={handleQuickAddNote}
            className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2"
          >
            <input
              type="text"
              value={quickNoteTitle}
              onChange={(e) => setQuickNoteTitle(e.target.value)}
              placeholder="Note title (e.g. Architecture decisions, meeting recap)..."
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={quickNoteContent}
                onChange={(e) => setQuickNoteContent(e.target.value)}
                placeholder="Key takeaways or summary..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!quickNoteTitle.trim() || isAddingNote}
                className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
              >
                {isAddingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add Note</span>
              </button>
            </div>
          </form>

          {/* Notes List */}
          <div className="space-y-2.5">
            {notes.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30">
                <FileText className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs">No documentation linked to this project yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNote({ projectId: id } as any);
                    setIsNoteModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  + Create First Note
                </button>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    setSelectedNote(note);
                    setIsNoteModalOpen(true);
                  }}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-1.5 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {note.isPinned && (
                        <Pin className="w-3 h-3 text-indigo-500 fill-indigo-500/20 shrink-0" />
                      )}
                      {note.isFavorite && (
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate">
                        {note.title}
                      </h4>
                    </div>

                    <span className="text-[10px] text-slate-400 shrink-0">
                      {note.updatedAt
                        ? new Date(note.updatedAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </span>
                  </div>

                  {note.content && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {note.content}
                    </p>
                  )}

                  <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                      {note.category || "General"}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                      Click to edit ✍️
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        project={project}
        onSaved={fetchProjectData}
        onDeleted={() => router.push("/projects")}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        onSaved={fetchProjectData}
        onDeleted={fetchProjectData}
      />

      {/* Note Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        note={selectedNote}
        onSaved={fetchProjectData}
        onDeleted={fetchProjectData}
      />
    </div>
  );
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ProjectDetailContent id={id} />
    </Suspense>
  );
}
