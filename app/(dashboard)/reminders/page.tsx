"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle,
  Filter,
  Loader2,
} from "lucide-react";
import { ReminderModal } from "@/components/reminders/reminder-modal";

interface ReminderItem {
  id: string;
  title: string;
  dueDate: string;
  priority: "High" | "Medium" | "Normal";
  isCompleted: boolean;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Pending" | "Completed" | "High">("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchReminders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/reminders");
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders || []);
      }
    } catch (err) {
      console.error("Failed to load reminders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleToggleReminder = async (id: string, isCompleted: boolean) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isCompleted: !isCompleted } : r))
    );

    try {
      await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      });
      fetchReminders();
    } catch (err) {
      console.error("Failed to toggle reminder:", err);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this reminder?")) return;
    try {
      await fetch(`/api/reminders/${id}`, { method: "DELETE" });
      fetchReminders();
    } catch (err) {
      console.error("Failed to delete reminder:", err);
    }
  };

  const filteredReminders = reminders.filter((r) => {
    if (filter === "Pending") return !r.isCompleted;
    if (filter === "Completed") return r.isCompleted;
    if (filter === "High") return r.priority === "High";
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Reminders & Tasks</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Stay on top of scheduled alerts, deadlines, and important priorities.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Reminder</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {(["All", "Pending", "Completed", "High"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${filter === tab
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30">
          <Bell className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            No reminders found
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Click &quot;New Reminder&quot; to schedule your first alert.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((reminder) => {
            const priorityBadge =
              reminder.priority === "High"
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50"
                : reminder.priority === "Medium"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50";

            return (
              <div
                key={reminder.id}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${reminder.isCompleted
                    ? "bg-slate-50/60 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60 opacity-60"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300"
                  }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={reminder.isCompleted}
                    onChange={() => handleToggleReminder(reminder.id, reminder.isCompleted)}
                    className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold truncate ${reminder.isCompleted
                          ? "line-through text-slate-400 dark:text-slate-500"
                          : "text-slate-900 dark:text-slate-100"
                        }`}
                    >
                      {reminder.title}
                    </p>
                    <div className="flex items-center gap-2.5 mt-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(reminder.dueDate).toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${priorityBadge}`}>
                        {reminder.priority} Priority
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteReminder(reminder.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                  title="Delete Reminder"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchReminders}
      />
    </div>
  );
}
