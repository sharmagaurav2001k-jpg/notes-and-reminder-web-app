"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Target,
  Calendar,
  Flag,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  Tag,
  CheckCircle2,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export interface MilestoneItem {
  id?: string;
  title: string;
  description?: string | null;
  targetDate?: string | null;
  isCompleted?: boolean;
  order?: number;
}

export interface GoalItem {
  id?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  type?: "Short-term" | "Long-term" | "Habit" | "Financial" | "Career" | "Learning" | "Personal";
  startDate?: string | null;
  targetDate?: string | null;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  status?: "Active" | "InProgress" | "Completed" | "Paused" | "Cancelled" | "Archived";
  progress?: number;
  color?: string | null;
  milestones?: MilestoneItem[];
  milestonesCount?: number;
  completedMilestonesCount?: number;
  tasksCount?: number;
  computedProgress?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: GoalItem | null;
  onSaved?: () => void;
  onDeleted?: () => void;
}

const GOAL_TYPES: Array<{
  id: "Short-term" | "Long-term" | "Habit" | "Financial" | "Career" | "Learning" | "Personal";
  label: string;
  icon: string;
}> = [
    { id: "Short-term", label: "Short-term", icon: "🎯" },
    { id: "Long-term", label: "Long-term", icon: "🏔️" },
    { id: "Habit", label: "Habit", icon: "🔄" },
    { id: "Career", label: "Career", icon: "💼" },
    { id: "Learning", label: "Learning", icon: "📚" },
    { id: "Financial", label: "Financial", icon: "💰" },
    { id: "Personal", label: "Personal", icon: "🌟" },
  ];

const PRIORITIES: Array<{
  id: "Low" | "Medium" | "High" | "Urgent";
  label: string;
  color: string;
}> = [
    { id: "Low", label: "Low", color: "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300" },
    { id: "Medium", label: "Medium", color: "border-amber-400 text-amber-600 bg-amber-500/10" },
    { id: "High", label: "High", color: "border-orange-400 text-orange-600 bg-orange-500/10" },
    { id: "Urgent", label: "Urgent", color: "border-red-500 text-red-600 bg-red-500/10" },
  ];

const COLOR_PRESETS = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Pink", value: "#ec4899" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Rose", value: "#f43f5e" },
];

const CATEGORIES = ["General", "Career", "Finance", "Fitness", "Health", "Learning", "Personal", "Projects"];

export function GoalModal({ isOpen, onClose, goal, onSaved, onDeleted }: GoalModalProps) {
  const isEditing = Boolean(goal?.id);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [type, setType] = useState<GoalItem["type"]>("Short-term");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<GoalItem["priority"]>("Medium");
  const [status, setStatus] = useState<GoalItem["status"]>("Active");
  const [color, setColor] = useState("#6366f1");
  const [progress, setProgress] = useState(0);

  // Initial Milestones Builder
  const [milestones, setMilestones] = useState<Array<{ title: string; targetDate?: string }>>([]);
  const [newMilestoneInput, setNewMilestoneInput] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goal) {
      setName(goal.name || "");
      setDescription(goal.description || "");
      setCategory(goal.category || "General");
      setType(goal.type || "Short-term");
      setStartDate(goal.startDate ? new Date(goal.startDate).toISOString().slice(0, 10) : "");
      setTargetDate(goal.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : "");
      setPriority(goal.priority || "Medium");
      setStatus(goal.status || "Active");
      setColor(goal.color || "#6366f1");
      setProgress(goal.progress || 0);
      setMilestones([]);
    } else {
      // Default Start date as Today
      setName("");
      setDescription("");
      setCategory("General");
      setType("Short-term");
      setStartDate(new Date().toISOString().slice(0, 10));
      setTargetDate("");
      setPriority("Medium");
      setStatus("Active");
      setColor("#6366f1");
      setProgress(0);
      setMilestones([]);
    }
    setError(null);
  }, [goal, isOpen]);

  if (!isOpen) return null;

  // Add initial milestone row
  const handleAddMilestone = () => {
    if (!newMilestoneInput.trim()) return;
    setMilestones((prev) => [...prev, { title: newMilestoneInput.trim() }]);
    setNewMilestoneInput("");
  };

  // Quick Preset Target Dates
  const setQuickTargetDate = (monthsToAdd: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToAdd);
    setTargetDate(d.toISOString().slice(0, 10));
  };

  const setEndOfYearTarget = () => {
    const d = new Date(new Date().getFullYear(), 11, 31);
    setTargetDate(d.toISOString().slice(0, 10));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a goal title.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || "General",
        type,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null,
        priority,
        status,
        color,
        progress: Number(progress),
        ...(!isEditing && milestones.length > 0
          ? {
            milestones: milestones.map((m, idx) => ({
              title: m.title,
              targetDate: m.targetDate ? new Date(m.targetDate).toISOString() : null,
              order: idx,
            })),
          }
          : {}),
      };

      const url = isEditing ? `/api/goals/${goal?.id}` : "/api/goals";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save goal.");
      }

      onSaved?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving the goal.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!goal?.id) return;
    if (!window.confirm(`Are you sure you want to delete "${goal.name}"? Connected tasks will be safely preserved.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete goal.");
      }

      onDeleted?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete goal.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: color }}
            >
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isEditing ? "Edit Goal" : "Create New Goal"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track outcomes, milestones, and timelines
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Goal Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Goal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Master Next.js 15 & Build SaaS, Run 10k Marathon, Save $10,000"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Goal Type Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Goal Type
            </label>
            <div className="flex flex-wrap gap-2">
              {GOAL_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${type === t.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Vision & Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why is this goal important? What is the expected outcome or motivation?"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Dates & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            {/* Target Date */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Target Deadline
                </label>
                <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                  <button type="button" onClick={() => setQuickTargetDate(1)} className="hover:underline">
                    +1M
                  </button>
                  <span>•</span>
                  <button type="button" onClick={() => setQuickTargetDate(3)} className="hover:underline">
                    +3M
                  </button>
                  <span>•</span>
                  <button type="button" onClick={setEndOfYearTarget} className="hover:underline">
                    EOY
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Priority & Category & Color Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Priority */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status (if editing) */}
            {isEditing && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Paused">Paused</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            )}
          </div>

          {/* Color Accent Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Goal Color Theme
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${color === c.value ? "ring-3 ring-offset-2 ring-indigo-500 scale-110" : "hover:scale-105"
                    }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Optional: Add Initial Milestones during Creation */}
          {!isEditing && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Initial Milestones (Optional)
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMilestoneInput}
                  onChange={(e) => setNewMilestoneInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMilestone();
                    }
                  }}
                  placeholder="e.g. Complete module 1, Run first 5k..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddMilestone}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {milestones.length > 0 && (
                <div className="space-y-1.5 pl-1">
                  {milestones.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-850 text-xs text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800/60"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                        <span>{m.title}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setMilestones((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Goal</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || !name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isEditing ? "Save Changes" : "Create Goal"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
