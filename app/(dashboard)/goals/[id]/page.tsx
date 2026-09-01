"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Target,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  ArrowLeft,
  Edit3,
  Trash2,
  Layers,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Repeat,
  Loader2,
  AlertCircle,
  CheckSquare,
  Sliders,
  RefreshCw,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { GoalModal, GoalItem, MilestoneItem } from "@/components/goals/goal-modal";
import { TaskModal, TaskItem } from "@/components/tasks/task-modal";
import { ProjectModal, ProjectItem } from "@/components/projects/project-modal";

interface PageProps {
  params: Promise<{ id: string }>;
}

function GoalDetailContent({ id }: { id: string }) {
  const router = useRouter();

  const [goal, setGoal] = useState<GoalItem | null>(null);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Milestone input state
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);

  // Manual Progress Slider Override State
  const [sliderProgress, setSliderProgress] = useState(0);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

  // Modals
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  // Fetch Full Goal Data
  const fetchGoalData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/goals/${id}`);
      if (res.ok) {
        const data = await res.json();
        const g = data.goal;
        setGoal(g);
        setMilestones(g.milestones || []);
        setTasks(g.tasks || []);
        setProjects(g.projects || []);
        setSliderProgress(g.progress || 0);
      } else if (res.status === 404) {
        router.push("/goals");
      }
    } catch (err) {
      console.error("Failed to load goal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalData();
  }, [id]);

  // Toggle Milestone Complete
  const handleToggleMilestone = async (milestoneId?: string) => {
    if (!milestoneId) return;

    // Optimistic update
    setMilestones((prev) =>
      prev.map((m) =>
        m.id === milestoneId
          ? { ...m, isCompleted: !m.isCompleted, completedAt: !m.isCompleted ? new Date().toISOString() : null }
          : m
      )
    );

    try {
      const res = await fetch(`/api/goals/${id}/milestones/${milestoneId}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setGoal((prev) => (prev ? { ...prev, progress: data.updatedProgress } : null));
        setSliderProgress(data.updatedProgress);
      }
    } catch (err) {
      console.error("Toggle milestone error:", err);
      fetchGoalData();
    }
  };

  // Add Milestone
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || isAddingMilestone) return;

    try {
      setIsAddingMilestone(true);
      const res = await fetch(`/api/goals/${id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newMilestoneTitle.trim(),
          targetDate: newMilestoneDate ? new Date(newMilestoneDate).toISOString() : null,
          order: milestones.length,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMilestones((prev) => [...prev, data.milestone]);
        setNewMilestoneTitle("");
        setNewMilestoneDate("");
        if (data.updatedProgress !== undefined) {
          setGoal((prev) => (prev ? { ...prev, progress: data.updatedProgress } : null));
          setSliderProgress(data.updatedProgress);
        }
      }
    } catch (err) {
      console.error("Add milestone error:", err);
    } finally {
      setIsAddingMilestone(false);
    }
  };

  // Reorder Milestones
  const handleMoveMilestone = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= milestones.length) return;

    const newMilestones = [...milestones];
    const temp = newMilestones[index];
    newMilestones[index] = newMilestones[targetIndex];
    newMilestones[targetIndex] = temp;

    setMilestones(newMilestones);

    try {
      await fetch(`/api/goals/${id}/milestones`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reorder: newMilestones.map((m) => m.id),
        }),
      });
    } catch (err) {
      console.error("Reorder milestone error:", err);
      fetchGoalData();
    }
  };

  // Delete Milestone
  const handleDeleteMilestone = async (milestoneId?: string) => {
    if (!milestoneId) return;
    setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));

    try {
      const res = await fetch(`/api/goals/${id}/milestones/${milestoneId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.updatedProgress !== undefined) {
          setGoal((prev) => (prev ? { ...prev, progress: data.updatedProgress } : null));
          setSliderProgress(data.updatedProgress);
        }
      }
    } catch (err) {
      console.error("Delete milestone error:", err);
      fetchGoalData();
    }
  };

  // Manual Progress Slider Submit
  const handleSaveSliderProgress = async (newVal: number) => {
    setSliderProgress(newVal);
    setGoal((prev) => (prev ? { ...prev, progress: newVal } : null));

    try {
      setIsUpdatingProgress(true);
      await fetch(`/api/goals/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: newVal }),
      });
    } catch (err) {
      console.error("Progress override error:", err);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Auto Recalculate Trigger
  const handleRecalculateProgress = async () => {
    try {
      setIsUpdatingProgress(true);
      const res = await fetch(`/api/goals/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recalculate: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setGoal((prev) => (prev ? { ...prev, progress: data.progress } : null));
        setSliderProgress(data.progress);
      }
    } catch (err) {
      console.error("Recalculate error:", err);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Toggle Linked Task
  const handleToggleTask = async (taskId?: string) => {
    if (!taskId) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: t.status === "Completed" ? "Todo" : "Completed" } : t))
    );

    try {
      await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" });
    } catch (err) {
      console.error("Toggle task error:", err);
      fetchGoalData();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!goal) return null;

  // Deadline calculation
  let remainingDaysText = "";
  if (goal.targetDate) {
    const diffTime = new Date(goal.targetDate).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) remainingDaysText = `⚠️ Overdue by ${Math.abs(diffDays)}d`;
    else if (diffDays === 0) remainingDaysText = "📅 Due Today";
    else remainingDaysText = `⏳ ${diffDays} days left`;
  }

  const completedMilestonesCount = milestones.filter((m) => m.isCompleted).length;
  const completedTasksCount = tasks.filter((t) => t.status === "Completed").length;

  // SVG Progress Ring calculations
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((goal.progress || 0) / 100) * circumference;

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/goals"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Goals</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsGoalModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Goal</span>
          </button>
        </div>
      </div>

      {/* Hero Visual Card with Progress Ring */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg shadow-indigo-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Left: Metadata & Vision */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2.5 py-1 text-xs font-bold rounded-lg text-white shadow-xs"
                style={{ backgroundColor: goal.color || "#6366f1" }}
              >
                {goal.type || "Short-term"}
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {goal.category || "General"}
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/50">
                {goal.priority || "Medium"} Priority
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                {goal.status || "Active"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {goal.name}
            </h1>

            {goal.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {goal.description}
              </p>
            )}

            {/* Timelines */}
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
              {goal.startDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Started: {new Date(goal.startDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
              {goal.targetDate && (
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5" />
                  Target: {new Date(goal.targetDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  <span className="ml-1 text-indigo-600 dark:text-indigo-400 font-bold">({remainingDaysText})</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: SVG Progress Ring */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 shrink-0">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="stroke-slate-200 dark:stroke-slate-800 fill-none"
                  strokeWidth="10"
                />
                {/* Progress Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="transition-all duration-700 ease-out fill-none stroke-current"
                  style={{
                    color: goal.color || "#6366f1",
                    strokeDasharray: circumference,
                    strokeDashoffset,
                    strokeLinecap: "round",
                  }}
                  strokeWidth="10"
                />
              </svg>
              {/* Inner Percentage */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {goal.progress || 0}%
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Complete
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>
                🚩 <strong>{completedMilestonesCount}</strong>/{milestones.length} Milestones
              </span>
              <span>•</span>
              <span>
                💼 <strong>{projects.length}</strong> Projects
              </span>
              <span>•</span>
              <span>
                ✅ <strong>{completedTasksCount}</strong>/{tasks.length} Tasks
              </span>
            </div>
          </div>
        </div>

        {/* Progress Slider Override Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Sliders className="w-3.5 h-3.5" />
              <span>Progress Slider</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderProgress}
              onChange={(e) => handleSaveSliderProgress(Number(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-10 text-right">
              {sliderProgress}%
            </span>
          </div>

          <button
            type="button"
            onClick={handleRecalculateProgress}
            disabled={isUpdatingProgress}
            title="Auto-calculate from milestones"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer self-end sm:self-auto"
          >
            <RefreshCw className={`w-3 h-3 ${isUpdatingProgress ? "animate-spin" : ""}`} />
            <span>Auto-Sync from Milestones</span>
          </button>
        </div>
      </div>

      {/* Projects Under this Goal */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Projects Under This Goal</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                {projects.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Multi-step initiatives delivering on this vision
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedProject(null);
              setIsProjectModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-slate-400 space-y-2">
            <Briefcase className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-xs">No projects associated with this goal yet.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedProject(null);
                setIsProjectModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold cursor-pointer"
            >
              + Create First Project For This Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md hover:border-indigo-400/80 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {p.status || "Active"}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {p.name}
                </h4>
                {p.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                )}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between font-medium">
                  <span>💼 {p.tasksCount || 0} Tasks</span>
                  <span>📄 {p.notesCount || 0} Notes</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 2-Column Section: Milestones & Connected Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Milestones Checklist & Roadmap */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🚩 Goal Milestones</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {completedMilestonesCount}/{milestones.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Key targets that advance this goal
              </p>
            </div>
          </div>

          {/* Add Milestone Inline Form */}
          <form
            onSubmit={handleAddMilestone}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                placeholder="Add milestone (e.g. Complete chapter 1, pass certification...)"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
              <input
                type="date"
                value={newMilestoneDate}
                onChange={(e) => setNewMilestoneDate(e.target.value)}
                className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newMilestoneTitle.trim() || isAddingMilestone}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                {isAddingMilestone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Milestones List */}
          <div className="space-y-2.5">
            {milestones.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                No milestones added yet. Break this goal down into steps above!
              </div>
            ) : (
              milestones.map((milestone, idx) => (
                <div
                  key={milestone.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all group ${milestone.isCompleted
                      ? "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-65"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300"
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleMilestone(milestone.id)}
                      className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      {milestone.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold text-slate-900 dark:text-slate-100 truncate ${milestone.isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""
                          }`}
                      >
                        {milestone.title}
                      </p>
                      {milestone.targetDate && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          Target: {new Date(milestone.targetDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reorder & Delete Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveMilestone(idx, "up")}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === milestones.length - 1}
                      onClick={() => handleMoveMilestone(idx, "down")}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMilestone(milestone.id)}
                      className="p-1 text-slate-400 hover:text-red-500 cursor-pointer ml-1"
                      title="Delete milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 5 Cols: Connected Tasks & Todos */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>📝 Connected Tasks</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {completedTasksCount}/{tasks.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Action items executing this goal
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedTask({ goalId: id } as any);
                setIsTaskModalOpen(true);
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              + Add Task
            </button>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs space-y-2.5">
            {tasks.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <CheckSquare className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs">No tasks linked to this goal yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTask({ goalId: id } as any);
                    setIsTaskModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold"
                >
                  + Link First Task
                </button>
              </div>
            ) : (
              tasks.map((task) => {
                const isCompleted = task.status === "Completed";
                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors ${isCompleted
                        ? "bg-slate-50/40 dark:bg-slate-900/30 border-slate-100 dark:border-slate-850 opacity-60"
                        : "bg-slate-50/70 dark:bg-slate-850/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border-slate-100 dark:border-slate-800"
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id)}
                      className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${isCompleted ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"
                          }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span>{task.priority || "Medium"}</span>
                        {task.dueDate && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedTask({ goalId: id } as any);
                setIsTaskModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Another Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Goal Edit Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        goal={goal}
        onSaved={fetchGoalData}
        onDeleted={() => router.push("/goals")}
      />

      {/* Project Creation Modal under this Goal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        project={selectedProject}
        defaultGoalId={id}
        onSaved={fetchGoalData}
        onDeleted={fetchGoalData}
      />

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        onSaved={fetchGoalData}
        onDeleted={fetchGoalData}
      />
    </div>
  );
}

export default function GoalDetailPage({ params }: PageProps) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <GoalDetailContent id={id} />
    </Suspense>
  );
}
