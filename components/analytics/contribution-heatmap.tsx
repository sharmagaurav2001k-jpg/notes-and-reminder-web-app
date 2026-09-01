"use client";

import React, { useState } from "react";

interface HeatmapCell {
  date: string;
  score: number;
  level: number; // 0-4
}

interface ContributionHeatmapProps {
  data: HeatmapCell[];
}

const LEVEL_COLORS = [
  "bg-slate-100 dark:bg-slate-800",
  "bg-green-200 dark:bg-green-900",
  "bg-green-400 dark:bg-green-700",
  "bg-green-500 dark:bg-green-600",
  "bg-green-700 dark:bg-green-500",
];

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ContributionHeatmap({ data }: ContributionHeatmapProps) {
  const [hovered, setHovered] = useState<HeatmapCell | null>(null);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
          Productivity Heatmap
        </h3>
        <div className="h-32 flex items-center justify-center text-sm text-slate-400">
          Start completing tasks to build your heatmap!
        </div>
      </div>
    );
  }

  // Group cells into weeks (columns of 7 days, starting Monday)
  const weeks: HeatmapCell[][] = [];
  let currentWeek: HeatmapCell[] = [];
  data.forEach((cell, idx) => {
    const d = new Date(cell.date);
    const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0
    if (idx === 0 && dayOfWeek !== 0) {
      for (let i = 0; i < dayOfWeek; i++) {
        currentWeek.push({ date: "", score: -1, level: -1 }); // padding
      }
    }
    currentWeek.push(cell);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push({ date: "", score: -1, level: -1 });
    weeks.push(currentWeek);
  }

  // Month labels: find first week of each month
  const monthLabels: Array<{ col: number; label: string }> = [];
  weeks.forEach((week, col) => {
    const firstCell = week.find((c) => c.date);
    if (!firstCell) return;
    const d = new Date(firstCell.date);
    if (d.getDate() <= 7) {
      monthLabels.push({ col, label: MONTHS[d.getMonth()] });
    }
  });

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Productivity Heatmap
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daily productivity over the last {weeks.length} weeks
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Less</span>
          {LEVEL_COLORS.map((color, i) => (
            <div key={i} className={`w-3 h-3 rounded-[4px] ${color}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex ml-8 mb-1">
            {weeks.map((_, col) => {
              const label = monthLabels.find((m) => m.col === col);
              return (
                <div key={col} className="w-3.5 shrink-0">
                  {label && (
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      {label.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1 shrink-0">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="w-6 h-3.5 flex items-center">
                  {label && <span className="text-[10px] text-slate-400">{label}</span>}
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, col) => (
              <div key={col} className="flex flex-col gap-[3px]">
                {week.map((cell, row) =>
                  cell.level === -1 ? (
                    <div key={row} className="w-3.5 h-3.5 rounded-[4px] bg-transparent" />
                  ) : (
                    <div
                      key={row}
                      className={`w-3.5 h-3.5 rounded-[4px] ${LEVEL_COLORS[cell.level]} hover:ring-2 hover:ring-indigo-400 hover:ring-offset-1 hover:ring-offset-white dark:hover:ring-offset-slate-900 transition-all cursor-pointer`}
                      onMouseEnter={() => setHovered(cell)}
                      onMouseLeave={() => setHovered(null)}
                      title={cell.date}
                    />
                  )
                )}
              </div>
            ))}
          </div>

          {/* Tooltip */}
          <div className="mt-3 h-5 text-xs text-slate-500 dark:text-slate-400">
            {hovered && hovered.date ? (
              <span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {new Date(hovered.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>{" "}
                — score {Math.round(hovered.score)}
              </span>
            ) : (
              <span className="text-slate-300 dark:text-slate-600">
                Hover over a square to see details
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
