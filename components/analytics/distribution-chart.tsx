"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { BarChart3, Info } from "lucide-react";

interface HistogramData {
  field: string;
  buckets: Array<{ range: string; min: number; max: number; count: number; percentage: number }>;
  outlierCount: number;
  iqr: number;
  q1: number;
  q3: number;
}

const FIELDS = [
  { value: "score", label: "Overall Score" },
  { value: "taskScore", label: "Task Score" },
  { value: "goalScore", label: "Goal Score" },
  { value: "noteScore", label: "Note Score" },
  { value: "streakDays", label: "Streak Days" },
  { value: "tasksCompleted", label: "Tasks Completed" },
  { value: "notesCreated", label: "Notes Created" },
];

export function DistributionChart() {
  const [data, setData] = useState<HistogramData | null>(null);
  const [field, setField] = useState("score");
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/analytics-learning?view=distribution&field=${field}&days=${days}`);
        if (!res.ok) throw new Error((await res.json()).error || "Failed");
        setData(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [field, days]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm animate-pulse">
        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800 mb-4" />
        <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (error || !data || data.buckets.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm text-center">
        <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">{error || "No data to visualize yet"}</p>
      </div>
    );
  }

  const isOutlier = (min: number) => {
    const lowerFence = data.q1 - 1.5 * data.iqr;
    const upperFence = data.q3 + 1.5 * data.iqr;
    return min < lowerFence || min >= upperFence;
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Distribution Chart</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Histogram with IQR markers and outlier detection</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {FIELDS.map(f => (
            <button key={f.value} onClick={() => setField(f.value)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${field === f.value ? "bg-pink-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500 flex-wrap">
        <span>Q1: <strong className="text-slate-700 dark:text-slate-200">{data.q1}</strong></span>
        <span>Q3: <strong className="text-slate-700 dark:text-slate-200">{data.q3}</strong></span>
        <span>IQR: <strong className="text-slate-700 dark:text-slate-200">{data.iqr}</strong></span>
        {data.outlierCount > 0 && (
          <span className="text-red-500 font-semibold">{data.outlierCount} outlier{data.outlierCount > 1 ? "s" : ""} detected</span>
        )}
        <div className="flex items-center gap-3 ml-auto">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${days === d ? "bg-pink-600 text-white" : "text-slate-400 hover:text-slate-600"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.buckets} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" vertical={false} />
            <XAxis dataKey="range" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-slate-400" />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} className="fill-slate-400" />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid rgba(148,163,184,0.25)", backgroundColor: "rgba(15,23,42,0.9)", color: "#f8fafc", fontSize: "12px" }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value: number, _name: string, props: any) => [`${value} days (${props.payload.percentage}%)`, "Frequency"]}
            />
            <ReferenceLine x={data.q1.toString()} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Q1", position: "top", fill: "#f59e0b", fontSize: 10 }} />
            <ReferenceLine x={data.q3.toString()} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: "Q3", position: "top", fill: "#8b5cf6", fontSize: 10 }} />
            <Bar dataKey="count" name="Frequency" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {data.buckets.map((bucket, i) => (
                <Cell key={i} fill={isOutlier(bucket.min) ? "#ef4444" : "#ec4899"} fillOpacity={isOutlier(bucket.min) ? 0.7 : 0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30">
        <Info className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
        <p className="text-xs text-pink-700 dark:text-pink-300 leading-relaxed">
          <strong>Learning tip:</strong> Red bars = outliers (beyond 1.5×IQR from Q1/Q3). Yellow & purple dashed lines mark Q1 and Q3. A normal distribution looks like a bell curve centered between Q1 and Q3. If your chart is skewed, check which side has a longer tail!
        </p>
      </div>
    </div>
  );
}
