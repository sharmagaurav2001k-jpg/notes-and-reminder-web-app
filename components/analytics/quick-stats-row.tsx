"use client";

import React from "react";
import { CheckCircle2, Target, Flame, FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface QuickStatsRowProps {
  stats: {
    tasksThisMonth: number;
    tasksChangePct: number;
    completionRate: number;
    currentStreak: number;
    notesThisMonth: number;
    goalsActive: number;
  };
}

export function QuickStatsRow({ stats }: QuickStatsRowProps) {
  const changeIcon =
    stats.tasksChangePct > 0 ? (
      <TrendingUp className="w-3.5 h-3.5" />
    ) : stats.tasksChangePct < 0 ? (
      <TrendingDown className="w-3.5 h-3.5" />
    ) : (
      <Minus className="w-3.5 h-3.5" />
    );

  const cards = [
    {
      label: "Tasks This Month",
      value: stats.tasksThisMonth,
      icon: CheckCircle2,
      iconColor: "text-indigo-500",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
      sub: {
        text:
          stats.tasksChangePct === 0
            ? "Same as last month"
            : `${Math.abs(stats.tasksChangePct)}% vs last month`,
        className:
          stats.tasksChangePct > 0
            ? "text-green-600 dark:text-green-400"
            : stats.tasksChangePct < 0
            ? "text-red-500 dark:text-red-400"
            : "text-slate-400",
      },
    },
    {
      label: "Completion Rate",
      value: `${stats.completionRate}%`,
      icon: Target,
      iconColor: "text-violet-500",
      iconBg: "bg-violet-50 dark:bg-violet-950/40",
      sub: { text: "of all tasks created", className: "text-slate-400" },
    },
    {
      label: "Current Streak",
      value: `${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`,
      icon: Flame,
      iconColor: "text-orange-500",
      iconBg: "bg-orange-50 dark:bg-orange-950/40",
      sub: { text: "keep it going! 🔥", className: "text-slate-400" },
    },
    {
      label: "Notes Created",
      value: stats.notesThisMonth,
      icon: FileText,
      iconColor: "text-pink-500",
      iconBg: "bg-pink-50 dark:bg-pink-950/40",
      sub: { text: `${stats.goalsActive} active goals`, className: "text-slate-400" },
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {card.label}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {card.value}
            </div>
            <div className={`flex items-center gap-1 text-[11px] font-medium mt-1 ${card.sub.className}`}>
              {card.label === "Tasks This Month" && changeIcon}
              {card.sub.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
