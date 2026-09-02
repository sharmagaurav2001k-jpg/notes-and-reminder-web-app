"use client";

import React, { useEffect, useState } from "react";
import { Sigma, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

interface StatsSummary {
  field: string;
  count: number;
  mean: number;
  median: number;
  mode: number;
  stdDev: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
  p90: number;
  p95: number;
  range: number;
  skewness: number;
}

function SkewBadge({ skewness }: { skewness: number }) {
  const abs = Math.abs(skewness);
  let label = "Symmetric";
  let color = "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
  if (skewness > 0.5) { label = "Right-skewed"; color = "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"; }
  else if (skewness < -0.5) { label = "Left-skewed"; color = "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"; }
  else if (abs > 0.2) { label = "Slight skew"; color = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"; }
  return <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold \${color}\`}>{label}</span>;
}

export function StatisticalSummaryPanel() {
  const [stats, setStats] = useState<StatsSummary[]>([]);
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const fetchStats = async (d: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(\`/api/analytics-learning?view=stats&days=\${d}\`);
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      setStats(data.stats);
      if (!selected && data.stats.length > 0) setSelected(data.stats[0].field);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchStats(days); }, [days]);

  const current = stats.find(s => s.field === selected);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm animate-pulse">
        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800 mb-4" />
        <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (error || stats.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm text-center">
        <Sigma className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">{error || "No productivity data yet. Complete some tasks to see statistics!"}</p>
      </div>
    );
  }

  const metricCards = current ? [
    { label: "Mean", value: current.mean, sub: "Average" },
    { label: "Median", value: current.median, sub: "Middle value" },
    { label: "Mode", value: current.mode, sub: "Most frequent" },
    { label: "Std Dev", value: current.stdDev, sub: "Spread" },
    { label: "Min", value: current.min, sub: "Lowest" },
    { label: "Max", value: current.max, sub: "Highest" },
    { label: "P25", value: current.p25, sub: "25th percentile" },
    { label: "P75", value: current.p75, sub: "75th percentile" },
    { label: "P90", value: current.p90, sub: "90th percentile" },
    { label: "P95", value: current.p95, sub: "95th percentile" },
    { label: "Range", value: current.range, sub: "Max - Min" },
    { label: "Skewness", value: current.skewness, sub: "Asymmetry" },
  ] : [];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
            <Sigma className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Statistical Summary</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Descriptive statistics of your productivity data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={\`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors \${days === d ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}\`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Field selector tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {stats.map(s => (
          <button key={s.field} onClick={() => setSelected(s.field)}
            className={\`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors \${selected === s.field ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}\`}>
            {s.field}
          </button>
        ))}
      </div>

      {current && (
        <>
          {/* Key metrics row */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Mean</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">{current.mean}</div>
              <div className="text-[10px] text-slate-400">{current.count} data points</div>
            </div>
            <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Median</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">{current.median}</div>
              <div className="flex items-center gap-1 mt-0.5">
                {current.median > current.mean ? <TrendingUp className="w-3 h-3 text-green-500" /> : current.median < current.mean ? <TrendingDown className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3 text-slate-400" />}
                <span className="text-[10px] text-slate-400">vs mean</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Std Dev</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">{current.stdDev}</div>
              <div className="text-[10px] text-slate-400">spread</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Range</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">{current.range}</div>
              <div className="text-[10px] text-slate-400">{current.min} — {current.max}</div>
            </div>
            <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-950/40">
              <div className="text-[10px] font-bold text-slate-400 uppercase">IQR</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">{current.p75 - current.p25}</div>
              <div className="text-[10px] text-slate-400">P75-P25</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Skewness</div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">{current.skewness}</div>
              <SkewBadge skewness={current.skewness} />
            </div>
          </div>

          {/* Percentile table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  {metricCards.map(m => (
                    <th key={m.label} className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="divide-x divide-slate-100 dark:divide-slate-800">
                  {metricCards.map(m => (
                    <td key={m.label} className="px-3 py-3 text-center">
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">{m.value}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{m.sub}</div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Learning tip */}
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              <strong>Learning tip:</strong> If Mean &gt; Median, your data is right-skewed — a few high-score days pull the average up. The median better represents your typical performance. Check the Skewness value: &gt;0.5 means significant right skew, &lt;-0.5 means left skew.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
