"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TaskTrendChartProps {
  data: Array<{ date: string; completed: number; created: number }>;
}

export function TaskTrendChart({ data }: TaskTrendChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Task Completion Trend
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Created vs completed tasks over the last {data.length} days
        </p>
      </div>
      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-slate-400">
          No task data yet
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
                className="fill-slate-400"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                className="fill-slate-400"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid rgba(148,163,184,0.25)",
                  backgroundColor: "rgba(15,23,42,0.9)",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="created"
                name="Created"
                stroke="#94a3b8"
                strokeWidth={2}
                fill="url(#createdGradient)"
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="Completed"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#completedGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
