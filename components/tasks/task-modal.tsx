"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Flag,
  Repeat,
  Save,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  Target,
  Briefcase,
} from "lucide-react";
import { formatRecurrenceLabel } from "@/lib/recurrence";

export interface TaskItem {
  id?: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  status?: "Inbox" | "Todo" | "InProgress" | "Completed" | "Cancelled";
  repeatRule?: string | null;
  goalId?: string | null;
  goal?: {
    id: string;
    name: string;
    color?: string | null;
    type?: string | null;
  } | null;
  projectId?: string | null;
  project?: {
    id: string;
    name: string;
    status?: string | null;
  } | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface GoalOption {
  id: string;
  name: string;
  color?: string | null;
  type?: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
  status?: string | null;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskItem | null;
  onSaved: () => void;
  onDeleted?: () => void;
}

const PRIORITIES: Array<{
  value: "Low" | "Medium" | "High" | "Urgent";
  label: string;
  color: string;
  activeBg: string;
}> = [
  {
    value: "Low",
    label: "Low",
    color: "text-slate-500",
    activeBg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700",
  },
  {
    value: "Medium",
    label: "Medium",
    color: "text-amber-500",
    activeBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800",
  },
  {
    value: "High",
    label: "High",
    color: "text-orange-500",
    activeBg: "bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-800",
  },
  {
    value: "Urgent",
    label: "Urgent",
    color: "text-red-500",
    activeBg: "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800",
  },
];

const RECURRENCE_PRESETS = [
  { label: "Does not repeat", value: "" },
  { label: "Daily", value: "daily" },
  { label: "Every Weekday (Mon–Fri)", value: "weekdays" },
  { label: "Weekly", value: "weekly" },
  { label: "Every 2 Weeks", value: "biweekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

export function TaskModal({
  isOpen,
  onClose,
  task,
  onSaved,
  onDeleted,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [dueTime, setDueTime] = useState<string>("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");
  const [status, setStatus] = useState<"Inbox" | "Todo" | "InProgress" | "Completed">("Inbox");
  const [repeatRule, setRepeatRule] = useState<string>("");
  const [goalId, setGoalId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");

  // Goal & Project options lists
  const [availableGoals, setAvailableGoals] = useState<GoalOption[]>([]);
  const [availableProjects, setAvailableProjects] = useState<ProjectOption[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);

  // Custom Recurrence state
  const [showCustomRecurrence, setShowCustomRecurrence] = useState(false);
  const [customFrequency, setCustomFrequency] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [customDayOfMonth, setCustomDayOfMonth] = useState<number>(5);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available goals and projects for dropdowns
  useEffect(() => {
    if (!isOpen) return;

    const fetchDropdownData = async () => {
      try {
        setIsLoadingDropdowns(true);
        const [goalsRes, projectsRes] = await Promise.all([
          fetch("/api/goals"),
          fetch("/api/projects"),
        ]);

        if (goalsRes.ok) {
          const data = await goalsRes.json();
          setAvailableGoals(data.goals || []);
        }

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setAvailableProjects(data.projects || []);
        }
      } catch (err) {
        console.error("Failed to load dropdown options for task:", err);
      } finally {
        setIsLoadingDropdowns(false);
      }
    };

    fetchDropdownData();
  }, [isOpen]);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        setDueDate(d.toISOString().split("T")[0]);
      } else {
        setDueDate("");
      }
      setDueTime(task.dueTime || "");
      setPriority(task.priority || "Medium");
      setStatus((task.status as any) || "Inbox");
      setRepeatRule(task.repeatRule || "");
      setGoalId(task.goalId || "");
      setProjectId(task.projectId || "");
    } else {
      setTitle("");
      setDescription("");
      const todayIso = new Date().toISOString().split("T")[0];
      setDueDate(todayIso);
      setDueTime("");
      setPriority("Medium");
      setStatus("Inbox");
      setRepeatRule("");
      setGoalId("");
      setProjectId("");
    }
    setError(null);
    setShowCustomRecurrence(false);
  }, [task, isOpen]);

  // Keyboard shortcut: Cmd/Ctrl + S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && isOpen) {
        e.preventDefault();
        handleSave(e as any);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, title, description, dueDate, dueTime, priority, status, repeatRule, goalId, projectId]);

  if (!isOpen) return null;

  const isEditing = Boolean(task?.id);

  // Quick date setters
  const setQuickDate = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setDueDate(d.toISOString().split("T")[0]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a task title.");
      return;
    }

    if (dueTime && !dueDate) {
      setError("Please specify a due date if you are setting a due time.");
      return;
    }

    if (repeatRule && !dueDate) {
      setError("Recurring tasks require a start due date.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate ? new Date(`${dueDate}T12:00:00.000Z`).toISOString() : null,
        dueTime: dueTime || null,
        priority,
        status,
        repeatRule: repeatRule || null,
        goalId: goalId.trim() ? goalId : null,
        projectId: projectId.trim() ? projectId : null,
      };

      const url = isEditing ? `/api/tasks/${task?.id}` : "/api/tasks";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save task");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task?.id) return;
    if (!window.confirm(`Delete task "${task.title}"?`)) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      onDeleted?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-slate-900 dark:text-slate-100">
              {isEditing ? "Edit Task" : "Create New Task"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="px-6 py-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium border-b border-red-200 dark:border-red-900/50 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-base sm:text-lg font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              autoFocus
            />
          </div>

          {/* Description Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              placeholder="Add extra details, checklist, or sub-notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Project & Goal Selectors Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Project Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                <span>Project (Optional)</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="">💼 Standalone Task (No Project)</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Parent Goal Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span>Parent Goal (Optional)</span>
              </label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="">🎯 None (No Parent Goal)</option>
                {availableGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.type ? `[${g.type}] ` : ""}
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-indigo-500" />
              <span>Priority</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                    priority === p.value
                      ? p.activeBg
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date & Time Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {/* Quick Date Presets */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setQuickDate(0)}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(7)}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer"
                >
                  +1 Week
                </button>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="px-1.5 py-0.5 text-[10px] text-red-500 hover:underline ml-auto cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Due Time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Due Time (Optional)</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {dueTime && (
                <button
                  type="button"
                  onClick={() => setDueTime("")}
                  className="text-[10px] text-red-500 hover:underline mt-1.5 inline-block cursor-pointer"
                >
                  Remove time
                </button>
              )}
            </div>
          </div>

          {/* Status & Recurrence Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="Inbox">📥 Inbox</option>
                <option value="Todo">📝 Todo</option>
                <option value="InProgress">⏳ In Progress</option>
                <option value="Completed">✅ Completed</option>
              </select>
            </div>

            {/* Recurrence Rule */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Recurrence</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomRecurrence(!showCustomRecurrence)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  {showCustomRecurrence ? "Presets" : "Custom..."}
                </button>
              </label>

              {!showCustomRecurrence ? (
                <select
                  value={repeatRule}
                  onChange={(e) => setRepeatRule(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {RECURRENCE_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              ) : (
                /* Custom Recurrence Creator */
                <div className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/40 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                      Every
                    </span>
                    <select
                      value={customFrequency}
                      onChange={(e) => setCustomFrequency(e.target.value as any)}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="daily">Day</option>
                      <option value="weekly">Week</option>
                      <option value="monthly">Month</option>
                    </select>

                    {customFrequency === "monthly" && (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
                          on day
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={customDayOfMonth}
                          onChange={(e) => setCustomDayOfMonth(parseInt(e.target.value, 10) || 1)}
                          className="w-12 px-1.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (customFrequency === "monthly") {
                        setRepeatRule(`monthly_on_day_${customDayOfMonth}`);
                      } else {
                        setRepeatRule(customFrequency);
                      }
                      setShowCustomRecurrence(false);
                    }}
                    className="w-full py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
                  >
                    Apply Custom Rule
                  </button>
                </div>
              )}

              {repeatRule && (
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                  🔁 {formatRecurrenceLabel(repeatRule)}
                </p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            ) : (
              <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">Ctrl+S</kbd> to save
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isEditing ? "Save Changes" : "Create Task"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
