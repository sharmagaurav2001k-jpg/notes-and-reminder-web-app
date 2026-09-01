"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  Plus,
  Clock,
  Repeat,
  Loader2,
  ChevronRight,
  PartyPopper,
} from "lucide-react";
import { TaskItem, TaskModal } from "@/components/tasks/task-modal";
import { formatRecurrenceLabel } from "@/lib/recurrence";

export function TodayWidget() {
  const [todayTasks, setTodayTasks] = useState<TaskItem[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<TaskItem[]>([]);
  const [summary, setSummary] = useState({
    totalToday: 0,
    completedToday: 0,
    pendingToday: 0,
    overdueCount: 0,
    completionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const fetchTodayData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/tasks/today");
      if (res.ok) {
        const data = await res.json();
        setTodayTasks(data.today || []);
        setOverdueTasks(data.overdue || []);
        setSummary(data.summary || {
          totalToday: 0,
          completedToday: 0,
          pendingToday: 0,
          overdueCount: 0,
          completionRate: 0,
        });
      }
    } catch (err) {
      console.error("Failed to load today widget data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  // Optimistic Complete Toggle
  const handleToggleTask = async (task: TaskItem) => {
    if (!task.id) return;
    const willBeCompleted = task.status !== "Completed";

    // Update local state immediately
    setTodayTasks((prev) =>
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

    // Also update overdue if applicable
    setOverdueTasks((prev) =>
      prev.filter((t) => (t.id === task.id && willBeCompleted ? false : true))
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        fetchTodayData();
      }
    } catch (err) {
      console.error("Toggle task error:", err);
      fetchTodayData();
    }
  };

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

  return (
    <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Today&apos;s Focus</span>
              {summary.totalToday > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {summary.completedToday}/{summary.totalToday}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tasks scheduled for today
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedTask(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Overdue Alert Banner if present */}
      {overdueTasks.length > 0 && (
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>
              <strong>{overdueTasks.length}</strong> overdue task{overdueTasks.length === 1 ? "" : "s"}
            </span>
          </div>
          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
            Needs action
          </span>
        </div>
      )}

      {/* Progress Bar */}
      {summary.totalToday > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span>Progress</span>
            <span>{summary.completionRate}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-indigo-600 via-blue-500 to-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${summary.completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      ) : todayTasks.length === 0 && overdueTasks.length === 0 ? (
        <div className="py-7 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
            <PartyPopper className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              No tasks due today 🎉
            </h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              You&apos;re completely caught up for the day! Enjoy your free time or schedule a new item.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedTask(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Today&apos;s Task</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {/* Render Overdue tasks first */}
          {overdueTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => {
                setSelectedTask(task);
                setIsModalOpen(true);
              }}
              className="flex items-start gap-2.5 p-2.5 rounded-xl border border-red-200/80 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/80 transition-colors group cursor-pointer"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleTask(task);
                }}
                className="mt-0.5 text-red-400 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                <Circle className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                    Overdue
                  </span>
                  <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border ${getPriorityBadge(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                  {task.title}
                </p>
              </div>
            </div>
          ))}

          {/* Render Today's tasks */}
          {todayTasks.map((task) => {
            const isCompleted = task.status === "Completed";
            const priorityBadge = getPriorityBadge(task.priority);

            return (
              <div
                key={task.id}
                onClick={() => {
                  setSelectedTask(task);
                  setIsModalOpen(true);
                }}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors group cursor-pointer ${
                  isCompleted
                    ? "bg-slate-50/40 dark:bg-slate-900/30 border-slate-100 dark:border-slate-850 opacity-60"
                    : "bg-slate-50/70 dark:bg-slate-850/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border-slate-100 dark:border-slate-800"
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleTask(task);
                  }}
                  className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border ${priorityBadge}`}>
                      {task.priority}
                    </span>
                    {task.dueTime && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {task.dueTime}
                      </span>
                    )}
                    {task.repeatRule && (
                      <span className="text-[10px] text-indigo-500 font-bold" title={formatRecurrenceLabel(task.repeatRule)}>
                        🔁
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs font-medium truncate mt-0.5 ${
                      isCompleted
                        ? "line-through text-slate-400 dark:text-slate-500"
                        : "text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                    }`}
                  >
                    {task.title}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        onSaved={fetchTodayData}
        onDeleted={fetchTodayData}
      />
    </div>
  );
}
