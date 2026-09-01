"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import {
  CheckSquare,
  Plus,
  Search,
  Kanban,
  List as ListIcon,
  Calendar,
  Clock,
  Flag,
  Repeat,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowUpDown,
  Filter,
  Sparkles,
  Loader2,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { TaskModal, TaskItem } from "@/components/tasks/task-modal";
import { formatRecurrenceLabel } from "@/lib/recurrence";

const STATUS_COLUMNS: Array<{
  id: "Inbox" | "Todo" | "InProgress" | "Completed" | "Cancelled";
  label: string;
  icon: string;
  badgeColor: string;
  borderColor: string;
}> = [
    {
      id: "Inbox",
      label: "Inbox",
      icon: "📥",
      badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      borderColor: "border-slate-200 dark:border-slate-800",
    },
    {
      id: "Todo",
      label: "Todo",
      icon: "📝",
      badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50",
      borderColor: "border-blue-200 dark:border-blue-900/40",
    },
    {
      id: "InProgress",
      label: "In Progress",
      icon: "⏳",
      badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/50",
      borderColor: "border-amber-200 dark:border-amber-900/40",
    },
    {
      id: "Completed",
      label: "Completed",
      icon: "✅",
      badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50",
      borderColor: "border-emerald-200 dark:border-emerald-900/40",
    },
    {
      id: "Cancelled",
      label: "Cancelled",
      icon: "🚫",
      badgeColor: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/50 dark:border-red-900/50",
      borderColor: "border-red-200 dark:border-red-900/40",
    },
  ];

function TasksContent() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View & Filter States
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // all, overdue, today, upcoming, nodate
  const [sortBy, setSortBy] = useState<"dueDateAsc" | "dueDateDesc" | "priority" | "newest">("dueDateAsc");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [defaultStatusForNew, setDefaultStatusForNew] = useState<string>("Inbox");

  // Fetch Tasks
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Open Create Modal with Preset Status
  const handleCreateTask = (statusPreset: string = "Inbox") => {
    setDefaultStatusForNew(statusPreset);
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleEditTask = (task: TaskItem) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  // Toggle Completion
  const handleToggleComplete = async (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    if (!task.id) return;

    // Optimistic update
    const willBeCompleted = task.status !== "Completed";
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
            ...t,
            status: willBeCompleted ? "Completed" : "Todo",
            completedAt: willBeCompleted ? new Date().toISOString() : null,
          }
          : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error("Toggle task error:", err);
      fetchTasks();
    }
  };

  // Quick Move Status
  const handleMoveStatus = async (
    e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>,
    task: TaskItem,
    newStatus: string
  ) => {
    e.stopPropagation();
    if (!task.id || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus as any } : t))
    );

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
    } catch (err) {
      console.error("Move status error:", err);
      fetchTasks();
    }
  };

  // Quick Delete
  const handleDeleteTask = async (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    if (!task.id) return;
    if (!window.confirm(`Delete task "${task.title}"?`)) return;

    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      fetchTasks();
    } catch (err) {
      console.error("Delete task error:", err);
      fetchTasks();
    }
  };

  // Priority styling helper
  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case "Urgent":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50";
      case "High":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50";
      case "Medium":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800";
    }
  };

  // Filter & Sort Pipeline
  const filteredTasks = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const in7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);

    return tasks.filter((task) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = (task.description || "").toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 2. Tab Filter (in list view)
      if (viewMode === "list" && activeTab !== "all" && task.status !== activeTab) {
        return false;
      }

      // 3. Priority Filter
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      // 4. Date Range Filter
      if (dateFilter === "overdue") {
        if (!task.dueDate || task.status === "Completed") return false;
        if (new Date(task.dueDate) >= startOfToday) return false;
      } else if (dateFilter === "today") {
        if (!task.dueDate) return false;
        const d = new Date(task.dueDate);
        if (d < startOfToday || d > endOfToday) return false;
      } else if (dateFilter === "upcoming") {
        if (!task.dueDate) return false;
        const d = new Date(task.dueDate);
        if (d <= endOfToday || d > in7Days) return false;
      } else if (dateFilter === "nodate") {
        if (task.dueDate) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      if (sortBy === "dueDateAsc") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === "dueDateDesc") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      if (sortBy === "priority") {
        const weights: Record<string, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        return (weights[b.priority || "Medium"] || 0) - (weights[a.priority || "Medium"] || 0);
      }
      // "newest"
      return new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime();
    });
  }, [tasks, searchQuery, activeTab, priorityFilter, dateFilter, sortBy, viewMode]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5 tracking-tight">
            <CheckSquare className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Tasks & Todo Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kanban board, status pipelines, priority queues, and recurrence engine
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              title="Kanban Board View"
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === "kanban"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
            >
              <Kanban className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List View"
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === "list"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
            >
              <ListIcon className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          {/* Create Task Button */}
          <button
            onClick={() => handleCreateTask("Inbox")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="space-y-3 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in title or description..."
              className="w-full pl-8.5 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Filters & Sorting Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Priority:
              </span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="Urgent">🔴 Urgent</option>
                <option value="High">🟠 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">⚪ Low</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Date:
              </span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Dates</option>
                <option value="overdue">⚠️ Overdue</option>
                <option value="today">📅 Due Today</option>
                <option value="upcoming">⏳ Next 7 Days</option>
                <option value="nodate">📥 No Due Date</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="dueDateAsc">Due Date (Earliest)</option>
                <option value="dueDateDesc">Due Date (Latest)</option>
                <option value="priority">Priority (High to Low)</option>
                <option value="newest">Recently Added</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Strip (Only in List View) */}
        {viewMode === "list" && (
          <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${activeTab === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
            >
              All Tasks ({tasks.length})
            </button>
            {STATUS_COLUMNS.map((col) => {
              const count = tasks.filter((t) => t.status === col.id).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setActiveTab(col.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === col.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                >
                  <span>{col.icon}</span>
                  <span>{col.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content: Kanban Board or List View */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : viewMode === "kanban" ? (
        /* ================= KANBAN BOARD VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {STATUS_COLUMNS.map((column) => {
            const columnTasks = filteredTasks.filter((t) => (t.status || "Inbox") === column.id);

            return (
              <div
                key={column.id}
                className="flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 p-3 min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{column.icon}</span>
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      {column.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {columnTasks.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCreateTask(column.id)}
                      title={`Add task to ${column.label}`}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Task Cards Column */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[70vh] pr-0.5">
                  {columnTasks.length === 0 ? (
                    <div
                      onClick={() => handleCreateTask(column.id)}
                      className="p-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs hover:border-indigo-400 hover:text-indigo-600 transition-all cursor-pointer"
                    >
                      + Add task
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const isCompleted = task.status === "Completed";
                      const priorityBadge = getPriorityBadge(task.priority);

                      return (
                        <div
                          key={task.id}
                          onClick={() => handleEditTask(task)}
                          className={`p-3.5 rounded-xl border bg-white dark:bg-slate-850 shadow-2xs hover:shadow-md transition-all group cursor-pointer ${isCompleted
                              ? "opacity-60 border-slate-200 dark:border-slate-800"
                              : "border-slate-200/90 dark:border-slate-750 hover:border-indigo-400"
                            }`}
                        >
                          {/* Top: Priority & Recurrence */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${priorityBadge}`}
                            >
                              {task.priority || "Medium"}
                            </span>

                            {task.repeatRule && (
                              <span
                                className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 font-semibold"
                                title={formatRecurrenceLabel(task.repeatRule)}
                              >
                                <Repeat className="w-3 h-3" />
                                <span className="hidden sm:inline">Repeat</span>
                              </span>
                            )}
                          </div>

                          {/* Task Title with Complete Checkbox */}
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleToggleComplete(e, task)}
                              className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                              ) : (
                                <Circle className="w-4 h-4 hover:fill-slate-100" />
                              )}
                            </button>
                            <h4
                              className={`font-semibold text-xs text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 ${isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""
                                }`}
                            >
                              {task.title}
                            </h4>
                          </div>

                          {/* Description preview */}
                          {task.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 pl-6">
                              {task.description}
                            </p>
                          )}

                          {/* Footer: Due Date & Action */}
                          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 pl-6">
                            {task.dueDate ? (
                              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                                {task.dueTime ? ` • ${task.dueTime}` : ""}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">No date</span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => handleDeleteTask(e, task)}
                              title="Delete task"
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= TABBED / LIST VIEW ================= */
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center">
              <CheckSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                No tasks match your filters
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Try switching tabs or clicking below to add a task.
              </p>
              <button
                onClick={() => handleCreateTask("Inbox")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
              >
                + Add Task
              </button>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isCompleted = task.status === "Completed";
              const priorityBadge = getPriorityBadge(task.priority);

              return (
                <div
                  key={task.id}
                  onClick={() => handleEditTask(task)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md transition-all group cursor-pointer gap-3 ${isCompleted
                      ? "opacity-60 border-slate-200 dark:border-slate-800"
                      : "border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-700"
                    }`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => handleToggleComplete(e, task)}
                      className="mt-0.5 sm:mt-0 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${priorityBadge}`}>
                          {task.priority || "Medium"}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {task.status || "Inbox"}
                        </span>
                        {task.repeatRule && (
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                            <Repeat className="w-3 h-3" />
                            {formatRecurrenceLabel(task.repeatRule)}
                          </span>
                        )}
                      </div>
                      <h4
                        className={`font-semibold text-sm text-slate-900 dark:text-slate-100 truncate mt-1 ${isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""
                          }`}
                      >
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xl">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Date, Status Switcher & Delete */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    {task.dueDate ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(task.dueDate).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                        {task.dueTime ? ` • ${task.dueTime}` : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">No date</span>
                    )}

                    <select
                      value={task.status || "Inbox"}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleMoveStatus(e, task, e.target.value)}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
                    >
                      <option value="Inbox">Inbox</option>
                      <option value="Todo">Todo</option>
                      <option value="InProgress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteTask(e, task)}
                      title="Delete Task"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask || (defaultStatusForNew ? ({ status: defaultStatusForNew } as any) : null)}
        onSaved={fetchTasks}
        onDeleted={fetchTasks}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <TasksContent />
    </Suspense>
  );
}
