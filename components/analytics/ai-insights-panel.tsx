"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Flame,
  Brain,
  Award,
  Lightbulb,
  Clock,
  BarChart3,
} from "lucide-react";

export interface AIInsight {
  type: string;
  title: string;
  description: string;
  metric?: string;
}

interface AIInsightsPanelProps {
  insights: AIInsight[];
}

const INSIGHT_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  best_day: { icon: Calendar, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
  best_time: { icon: Clock, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/40" },
  streak: { icon: Flame, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/40" },
  trend_up: { icon: TrendingUp, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/40" },
  trend_down: { icon: TrendingDown, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40" },
  trend_stable: { icon: BarChart3, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
  focus_area: { icon: Target, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/40" },
  achievement: { icon: Award, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/40" },
  tip: { icon: Lightbulb, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
  pattern: { icon: Brain, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-950/40" },
};

export function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  if (insights.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">AI Insights</h3>
        <div className="text-sm text-slate-400 py-8 text-center">
          Keep using the app — insights about your patterns will appear here after a few days of activity.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Brain className="w-5 h-5 text-indigo-500" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">AI Insights</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
        Pattern detection from your last 30 days of activity
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, idx) => {
          const config = INSIGHT_CONFIG[insight.type] || INSIGHT_CONFIG.pattern;
          const Icon = config.icon;
          return (
            <div
              key={idx}
              className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 hover:shadow-sm transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {insight.title}
                  </h4>
                  {insight.metric && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.bg} ${config.color}`}>
                      {insight.metric}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
