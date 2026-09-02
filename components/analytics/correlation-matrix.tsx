"use client";

import React, { useEffect, useState } from "react";
import { GitBranch, ArrowUpRight, ArrowDownLeft, Minus, Info } from "lucide-react";

interface CorrelationResult {
  variableA: string;
  variableB: string;
  pearsonR: number;
  strength: string;
  direction: string;
  n: number;
}

function getStrengthColor(strength: string, direction: string) {
  if (strength === "none") return "bg-slate-100 dark:bg-slate-800 text-slate-500";
  if (strength === "weak") return direction === "positive" ? "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400";
  if (strength === "moderate") return direction === "positive" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" : "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400";
  if (strength === "strong") return direction === "positive" ? "bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400" : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400";
  return direction === "positive" ? "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400" : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400";
}

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === "positive") return <ArrowUpRight className="w-3.5 h-3.5" />;
  if (direction === "negative") return <ArrowDownLeft className="w-3.5 h-3.5" />;
  return <Minus className="w-3.5 h-3.5" />;
}

export function CorrelationMatrix() {
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([]);
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/analytics-learning?view=correlations&days=${days}`);
        if (!res.ok) throw new Error((await res.json()).error || "Failed");
        const data = await res.json();
        setCorrelations(data.correlations);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [days]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm animate-pulse">
        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />)}
        </div>
      </div>
    );
  }

  if (error || correlations.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm text-center">
        <GitBranch className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">{error || "Need at least 5 days of data to find correlations. Keep using the app!"}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Correlation Analysis</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pearson correlations between your productivity variables</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${days === d ? "bg-violet-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Correlation rows */}
      <div className="space-y-2.5">
        {correlations.map((c, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.variableA}</span>
                <span className="text-slate-400">↔</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.variableB}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">n = {c.n} data points</div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${getStrengthColor(c.strength, c.direction)}`}>
              <DirectionIcon direction={c.direction} />
              r = {c.pearsonR}
            </div>
            <div className="w-20 shrink-0 hidden sm:block">
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${c.direction === "positive" ? "bg-emerald-500" : "bg-red-500"}`}
                  style={{ width: `${Math.abs(c.pearsonR) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30">
        <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
        <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
          <strong>Learning tip:</strong> Pearson's r ranges from -1 to +1. |r| &gt; 0.6 = strong correlation. Remember: <strong>correlation ≠ causation!</strong> High tasks-score correlation doesn't mean tasks cause good scores — it could be a third factor (like motivation) driving both.
        </p>
      </div>
    </div>
  );
}
