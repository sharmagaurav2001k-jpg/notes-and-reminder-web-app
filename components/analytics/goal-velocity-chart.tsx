"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface GoalVelocityChartProps {
  data: Array<{ week: string; active: number; completed: number }>;
}

export function GoalVelocityChart({ data }: GoalVelocityChartProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Goal Velocity</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Active vs completed goals per week
        </p>
      </div>
      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-slate-400">
          No goal data yet
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
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
                cursor={{ fill: "rgba(99,102,241,0.06)" }}
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
              <Bar dataKey="active" name="Active goals" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="completed" name="Completed goals" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
