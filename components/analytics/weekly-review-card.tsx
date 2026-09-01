"use client";

import React from "react";
import { CheckCircle2, FileText, Target, Trophy, Award, Sparkles } from "lucide-react";

interface WeeklyReviewCardProps {
  review: {
    weekStartDate: string;
    weekEndDate: string;
    totalTasks: number;
    completedTasks: number;
    notesCreated: number;
    goalsProgressed: number;
    goalsCompleted: number;
    avgProductivityScore: number;
    topCategories?: Array<{ name: string; count: number }>;
    topTags?: Array<{ name: string; count: number }>;
    summary?: string;
    highlights?: string;
  } | null;
  onGenerate: () => void;
  isLoading: boolean;
}

export function WeeklyReviewCard({ review, onGenerate, isLoading }: WeeklyReviewCardProps) {
  const completionRate = review && review.totalTasks > 0
    ? Math.round((review.completedTasks / review.totalTasks) * 100)
    : 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Weekly Review</h3>
        </div>
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Generating..." : "Generate Review"}
        </button>
      </div>

      {!review ? (
        <div className="text-sm text-slate-400 py-10 text-center">
          Generate your weekly review to see your productivity summary
        </div>
      ) : (
        <div className="space-y-5">
          {/* Date range + summary */}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(review.weekStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" — "}
              {new Date(review.weekEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
            {review.summary && (
              <p className="text-sm text-slate-700 dark:text-slate-200 mt-2 leading-relaxed">
                {review.summary}
              </p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {review.completedTasks}
                <span className="text-xs font-medium text-slate-400 ml-1">/ {review.totalTasks}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{completionRate}% rate</div>
            </div>
            <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40">
              <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-1">
                <Target className="w-3.5 h-3.5" /> Goals
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {review.goalsCompleted}
                <span className="text-xs font-medium text-slate-400 ml-1">done</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{review.goalsProgressed} progressed</div>
            </div>
            <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-950/40">
              <div className="flex items-center gap-1.5 text-pink-600 dark:text-pink-400 text-xs font-semibold mb-1">
                <FileText className="w-3.5 h-3.5" /> Notes
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {review.notesCreated}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">created</div>
            </div>
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/40">
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-semibold mb-1">
                <Trophy className="w-3.5 h-3.5" /> Avg Score
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {Math.round(review.avgProductivityScore)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">/100 weekly</div>
            </div>
            <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/40 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 text-xs font-semibold mb-1">
                <Award className="w-3.5 h-3.5" /> Best Focus
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {review.topCategories?.[0]?.name || "General"}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {review.topCategories?.[0]?.count || 0} items
              </div>
            </div>
          </div>

          {/* Tags */}
          {review.topTags && review.topTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-400">Top tags:</span>
              {review.topTags.slice(0, 5).map((tag) => (
                <span
                  key={tag.name}
                  className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  #{tag.name} <span className="text-slate-400">×{tag.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
