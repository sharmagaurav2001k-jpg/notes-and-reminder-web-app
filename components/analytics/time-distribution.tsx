"use client";

import React from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface TimeDistributionProps {
  byPriority: Array<{ priority: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
  Normal: "#3b82f6",
};

const STATUS_COLORS: Record<string, string> = {
  Inbox: "#94a3b8",
  Todo: "#6366f1",
  InProgress: "#8b5cf6",
  Completed: "#22c55e",
  Cancelled: "#64748b",
};

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(148,163,184,0.25)",
  backgroundColor: "rgba(15,23,42,0.9)",
  color: "#f8fafc",
  fontSize: "12px",
};

export function TimeDistribution({ byPriority, byStatus }: TimeDistributionProps) {
  const priorityData = byPriority.filter((d) => d.count > 0);
  const statusData = byStatus.filter((d) => d.count > 0);
  const totalTasks = priorityData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Time &amp; Priority Distribution
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          How your {totalTasks} tasks break down
        </p>
      </div>

      {totalTasks === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-400">
          No task distribution data yet
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Priority donut */}
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  dataKey="count"
                  nameKey="priority"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {priorityData.map((entry) => (
                    <Cell
                      key={entry.priority}
                      fill={PRIORITY_COLORS[entry.priority] || "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#94a3b8" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={9} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Status bars */}
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusData}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
              >
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="status"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                  className="fill-slate-400"
                />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.06)" }}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Bar dataKey="count" name="Tasks" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {statusData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] || "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
