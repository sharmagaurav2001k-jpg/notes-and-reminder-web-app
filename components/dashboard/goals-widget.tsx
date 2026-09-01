"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Target,
  ChevronRight,
  Plus,
  Clock,
  Sparkles,
  Loader2,
  TrendingUp,
  Award,
  Compass,
} from "lucide-react";
import { GoalItem, GoalModal } from "@/components/goals/goal-modal";

interface GoalsWidgetProps {
  initialGoals?: GoalItem[];
  maxDisplay?: number;
}

export function GoalsWidget({ initialGoals, maxDisplay = 3 }: GoalsWidgetProps) {
  const [goals, setGoals] = useState<GoalItem[]>(initialGoals || []);
  const [isLoading, setIsLoading] = useState(!initialGoals);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(null);

  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/goals");
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      }
    } catch (err) {
      console.error("Failed to load goals for widget:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialGoals) {
      fetchGoals();
    } else {
      setGoals(initialGoals);
    }
  }, [initialGoals]);

  // Filter only active / in-progress goals for this widget
  const activeGoals = goals.filter((g) => g.status !== "Archived" && g.status !== "Cancelled");
  const displayGoals = activeGoals.slice(0, maxDisplay);

  return (
    <div className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs space-y-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Vision & Goals Progress</span>
              {activeGoals.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {activeGoals.length}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Active milestones & track record
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedGoal(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
          <Link
            href="/goals"
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      ) : displayGoals.length === 0 ? (
        <div className="py-7 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              No active vision goals 🎯
            </h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Set ambitious goals, break them into milestones, and track your success.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedGoal(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Your First Goal</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayGoals.map((goal) => {
            const progress = goal.progress || 0;
            const completedM = goal.milestones?.filter((m) => m.isCompleted).length ?? goal.completedMilestonesCount ?? 0;
            const totalM = goal.milestones?.length ?? goal.milestonesCount ?? 0;

            let remainingText = "";
            if (goal.targetDate) {
              const diffTime = new Date(goal.targetDate).getTime() - new Date().getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays < 0) remainingText = `⚠️ Overdue by ${Math.abs(diffDays)}d`;
              else if (diffDays === 0) remainingText = "📅 Due Today";
              else remainingText = `⏳ ${diffDays}d left`;
            }

            return (
              <Link
                key={goal.id}
                href={`/goals/${goal.id}`}
                className="block p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all group cursor-pointer space-y-2"
              >
                {/* Header: Title & Progress % */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: goal.color || "#6366f1" }}
                    />
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {goal.name}
                    </h4>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 shrink-0">
                    {progress}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: goal.color || "#6366f1",
                    }}
                  />
                </div>

                {/* Footer details */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {remainingText || (goal.targetDate ? new Date(goal.targetDate).toLocaleDateString([], { month: "short", day: "numeric" }) : "No deadline")}
                  </span>
                  <span>🚩 {completedM}/{totalM} Milestones</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Goal Modal */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        goal={selectedGoal}
        onSaved={fetchGoals}
        onDeleted={fetchGoals}
      />
    </div>
  );
}
