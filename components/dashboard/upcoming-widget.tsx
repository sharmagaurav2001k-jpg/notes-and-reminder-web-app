"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Repeat,
  Plus,
  Loader2,
  ChevronRight,
  Sparkles,
  CalendarCheck,
} from "lucide-react";
import { TaskItem, TaskModal } from "@/components/tasks/task-modal";
import { formatRecurrenceLabel } from "@/lib/recurrence";

interface DayGroup {
  date: string;
  label: string;
  dayName: string;
  tasks: TaskItem[];
}

export function UpcomingWidget() {
  const [days, setDays] = useState<DayGroup[]>([]);
  const [totalUpcoming, setTotalUpcoming] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const fetchUpcoming = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/tasks/upcoming?days=7");
      if (res.ok) {
        const data = await res.json();
        setDays(data.days || []);
        setTotalUpcoming(data.totalUpcoming || 0);
      }
    } catch (err) {
      console.error("Failed to load upcoming tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
  }, []);

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

  // Only show days that actually have tasks scheduled
  const activeDays = days.filter((d) => d.tasks && d.tasks.length > 0);

  return (
    <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Upcoming 7 Days</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                {totalUpcoming}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Future timeline overview
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
          <span>Schedule</span>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      ) : activeDays.length === 0 ? (
        <div className="py-7 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Clear 7-day timeline 🗓️
            </h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              No tasks scheduled for the next week. Plan ahead and stay proactive!
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
            <span>+ Plan Future Task</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {activeDays.map((dayGroup) => (
            <div key={dayGroup.date} className="space-y-1.5">
              {/* Day Header */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <span>{dayGroup.label}</span>
                <span className="text-[10px] font-normal lowercase">{dayGroup.dayName}</span>
              </div>

              {/* Tasks in this Day */}
              <div className="space-y-1.5">
                {dayGroup.tasks.map((task) => {
                  const priorityBadge = getPriorityBadge(task.priority);

                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task);
                        setIsModalOpen(true);
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.dueTime && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {task.dueTime}
                            </span>
                          )}
                          {task.repeatRule && (
                            <span
                              className="text-[10px] text-indigo-500 font-semibold"
                              title={formatRecurrenceLabel(task.repeatRule)}
                            >
                              🔁 {task.repeatRule}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border shrink-0 ${priorityBadge}`}>
                        {task.priority || "Medium"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        onSaved={fetchUpcoming}
        onDeleted={fetchUpcoming}
      />
    </div>
  );
}
