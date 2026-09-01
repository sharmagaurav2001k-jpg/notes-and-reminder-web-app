"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Briefcase,
  Target,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export interface ProjectGoalSummary {
  id: string;
  name: string;
  color?: string;
  type?: string;
}

export interface ProjectItem {
  id?: string;
  name: string;
  description?: string | null;
  status?: string;
  goalId?: string | null;
  goal?: ProjectGoalSummary | null;
  progress?: number;
  tasksCount?: number;
  completedTasksCount?: number;
  notesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ProjectItem | null;
  defaultGoalId?: string | null;
  onSaved?: (project: ProjectItem) => void;
  onDeleted?: (projectId: string) => void;
}

const PROJECT_STATUSES = [
  { id: "Active", label: "Active", icon: "⚡", bg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" },
  { id: "InProgress", label: "In Progress", icon: "⏳", bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" },
  { id: "Completed", label: "Completed", icon: "✅", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
  { id: "Paused", label: "Paused", icon: "⏸️", bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
  { id: "Cancelled", label: "Cancelled", icon: "❌", bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" },
  { id: "Archived", label: "Archived", icon: "📦", bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
];

export function ProjectModal({
  isOpen,
  onClose,
  project,
  defaultGoalId,
  onSaved,
  onDeleted,
}: ProjectModalProps) {
  const isEditing = Boolean(project?.id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Active");
  const [goalId, setGoalId] = useState<string>("");

  const [goalsList, setGoalsList] = useState<{ id: string; name: string; color: string }[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load available goals for assignment dropdown
  useEffect(() => {
    if (isOpen) {
      const loadGoals = async () => {
        try {
          setIsLoadingGoals(true);
          const res = await fetch("/api/goals");
          if (res.ok) {
            const data = await res.json();
            setGoalsList(
              (data.goals || []).map((g: any) => ({
                id: g.id,
                name: g.name,
                color: g.color || "#6366f1",
              }))
            );
          }
        } catch (err) {
          console.error("Failed to load goals for project modal:", err);
        } finally {
          setIsLoadingGoals(false);
        }
      };
      loadGoals();
    }
  }, [isOpen]);

  // Reset or Populate form fields
  useEffect(() => {
    if (isOpen) {
      if (project) {
        setName(project.name || "");
        setDescription(project.description || "");
        setStatus(project.status || "Active");
        setGoalId(project.goalId || "");
      } else {
        setName("");
        setDescription("");
        setStatus("Active");
        setGoalId(defaultGoalId || "");
      }
      setErrorMessage("");
    }
  }, [isOpen, project, defaultGoalId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Project name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        status,
        goalId: goalId.trim() || null,
      };

      const url = isEditing ? `/api/projects/${project?.id}` : "/api/projects";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save project");
      }

      onSaved?.(data.project);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while saving the project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!project?.id) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${project.name}"? Connected tasks and notes will remain safe as standalone items.`
    );
    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted?.(project.id);
        onClose();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to delete project");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {isEditing ? "Edit Project" : "Create New Project"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing ? "Update project details and status" : "Group related tasks, notes & link to a goal"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign 2026, Mobile App Launch"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Description / Scope
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project aiming to accomplish? Key milestones, scope or notes..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Goal Link Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Parent Goal (Optional)</span>
            </label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="">⚡ Standalone Project (No Parent Goal)</option>
              {goalsList.map((g) => (
                <option key={g.id} value={g.id}>
                  🎯 {g.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Linking to a goal helps aggregate project progress into higher-level vision tracking.
            </p>
          </div>

          {/* Status Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROJECT_STATUSES.map((st) => {
                const isSelected = status === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatus(st.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <span>{st.icon}</span>
                    <span>{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          {isEditing ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Delete Project</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/25 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEditing ? "Save Changes" : "Create Project"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
