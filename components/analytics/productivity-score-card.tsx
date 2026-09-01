"use client";

import React from "react";
import { Flame, TrendingUp } from "lucide-react";

interface ProductivityScoreCardProps {
  score: number;
  taskScore: number;
  goalScore: number;
  noteScore: number;
  streakDays: number;
  weekAverage: number;
}

function getScoreColor(score: number) {
  if (score >= 76) return { stroke: "#22c55e", text: "text-green-500", bg: "bg-green-500" };
  if (score >= 51) return { stroke: "#3b82f6", text: "text-blue-500", bg: "bg-blue-500" };
  if (score >= 26) return { stroke: "#eab308", text: "text-yellow-500", bg: "bg-yellow-500" };
  if (score > 0) return { stroke: "#ef4444", text: "text-red-500", bg: "bg-red-500" };
  return { stroke: "#94a3b8", text: "text-slate-400", bg: "bg-slate-400" };
}

export function ProductivityScoreCard({
  score,
  taskScore,
  goalScore,
  noteScore,
  streakDays,
  weekAverage,
}: ProductivityScoreCardProps) {
  const colors = getScoreColor(score);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const weekDiff = score - weekAverage;
  const isUp = weekDiff >= 0;

  const bars = [
    { label: "Tasks", value: taskScore, max: 40, color: "bg-indigo-500" },
    { label: "Goals", value: goalScore, max: 30, color: "bg-violet-500" },
    { label: "Notes", value: noteScore, max: 30, color: "bg-pink-500" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Score Ring */}
        <div className="relative w-44 h-44 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              strokeWidth="14"
              className="stroke-slate-100 dark:stroke-slate-800"
            />
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              strokeWidth="14"
              stroke={colors.stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 1s ease-in-out, stroke 0.5s" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl font-extrabold ${colors.text} tabular-nums`}>
              {Math.round(score)}
            </span>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">
              Score
            </span>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex-1 w-full space-y-5">
          {/* Streak + Week Comparison */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-sm font-semibold">
              <Flame className="w-4 h-4" />
              {streakDays} day streak
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                isUp
                  ? "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${isUp ? "" : "rotate-180"}`} />
              {isUp ? "+" : ""}
              {Math.round(weekDiff)} vs week avg ({Math.round(weekAverage)})
            </div>
          </div>

          {/* Breakdown bars */}
          <div className="space-y-3">
            {bars.map((bar) => {
              const pct = Math.min(100, (bar.value / bar.max) * 100);
              return (
                <div key={bar.label}>
                  <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    <span>{bar.label}</span>
                    <span className="tabular-nums">
                      {Math.round(bar.value)}/{bar.max}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bar.color} transition-all duration-1000`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
