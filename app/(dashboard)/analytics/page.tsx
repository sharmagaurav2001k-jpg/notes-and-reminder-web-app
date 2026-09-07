"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { ProductivityScoreCard } from "@/components/analytics/productivity-score-card";
import { TaskTrendChart } from "@/components/analytics/task-trend-chart";
import { GoalVelocityChart } from "@/components/analytics/goal-velocity-chart";
import { ContributionHeatmap } from "@/components/analytics/contribution-heatmap";
import { TimeDistribution } from "@/components/analytics/time-distribution";
import { AIInsightsPanel, AIInsight } from "@/components/analytics/ai-insights-panel";
import { WeeklyReviewCard } from "@/components/analytics/weekly-review-card";
import { QuickStatsRow } from "@/components/analytics/quick-stats-row";

interface ScoreRecord {
  date: string;
  score: number;
  taskScore: number;
  goalScore: number;
  noteScore: number;
  streakDays: number;
  tasksCompleted: number;
  tasksTotal: number;
}

interface AnalyticsData {
  todayScore: ScoreRecord | null;
  history: ScoreRecord[];
  taskTrend: Array<{ date: string; completed: number; created: number }>;
  goalVelocity: Array<{ week: string; active: number; completed: number }>;
  heatmap: Array<{ date: string; score: number; level: number }>;
  timeDistribution: {
    byPriority: Array<{ priority: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
  insights: AIInsight[];
  stats: {
    tasksThisMonth: number;
    tasksChangePct: number;
    completionRate: number;
    currentStreak: number;
    notesThisMonth: number;
    goalsActive: number;
  };
}

function SkeletonCard({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm animate-pulse ${className}`}>
      {children || (
        <>
          <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800 mb-4" />
          <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [review, setReview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/analytics?view=dashboard");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load analytics");
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchReview = useCallback(async () => {
    try {
      setIsReviewLoading(true);
      const res = await fetch("/api/analytics?view=weekly-review", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setReview(json.review);
      }
    } finally {
      setIsReviewLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    // Load existing latest review without regenerating
    (async () => {
      try {
        const res = await fetch("/api/analytics?view=weekly-review");
        if (res.ok) {
          const json = await res.json();
          setReview(json.review);
        }
      } catch {
        // ignore
      }
    })();
  }, [fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-56 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} className="!p-5">
              <></>
            </SkeletonCard>
          ))}
        </div>
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-8 text-center">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const todayScore = data?.todayScore;
  const weekAverage =
    data && data.history.length > 0
      ? data.history.slice(-7).reduce((s, h) => s + h.score, 0) / Math.min(7, data.history.length)
      : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Analytics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your productivity, visualized — powered by your own data
            </p>
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      {data?.stats && <QuickStatsRow stats={data.stats} />}

      {/* Productivity Score Hero */}
      <ProductivityScoreCard
        score={todayScore?.score ?? 0}
        taskScore={todayScore?.taskScore ?? 0}
        goalScore={todayScore?.goalScore ?? 0}
        noteScore={todayScore?.noteScore ?? 0}
        streakDays={todayScore?.streakDays ?? data?.stats?.currentStreak ?? 0}
        weekAverage={weekAverage}
      />

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TaskTrendChart data={data?.taskTrend ?? []} />
        <GoalVelocityChart data={data?.goalVelocity ?? []} />
      </div>

      {/* Heatmap */}
      <ContributionHeatmap data={data?.heatmap ?? []} />

      {/* Time distribution */}
      {data?.timeDistribution && (
        <TimeDistribution
          byPriority={data.timeDistribution.byPriority}
          byStatus={data.timeDistribution.byStatus}
        />
      )}

      {/* AI Insights */}
      <AIInsightsPanel insights={data?.insights ?? []} />

      {/* Weekly Review */}
      <WeeklyReviewCard review={review} onGenerate={fetchReview} isLoading={isReviewLoading} />
    </div>
  );
}
