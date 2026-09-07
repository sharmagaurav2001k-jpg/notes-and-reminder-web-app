"use client";

import React, { useState, useCallback, useRef } from "react";
import { Play, Copy, Check, Database, AlertTriangle, Loader2 } from "lucide-react";

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
}

const EXAMPLE_QUERIES = [
  { label: "Last 10 scores", sql: 'SELECT score, taskScore, goalScore, noteScore, date FROM "ProductivityScore" ORDER BY date DESC LIMIT 10' },
  { label: "Tasks by status", sql: 'SELECT status, COUNT(*) as count, ROUND(AVG(priority), 1) as avg_priority FROM "Task" GROUP BY status ORDER BY count DESC' },
  { label: "Weekly avg score", sql: 'SELECT EXTRACT(WEEK FROM date) as week_num, ROUND(AVG(score), 1) as avg_score, COUNT(*) as days FROM "ProductivityScore" GROUP BY EXTRACT(WEEK FROM date) ORDER BY week_num DESC LIMIT 12' },
  { label: "Best day of week", sql: 'SELECT EXTRACT(DOW FROM date) as dow, ROUND(AVG(score), 1) as avg_score, COUNT(*) as data_points FROM "ProductivityScore" GROUP BY EXTRACT(DOW FROM date) ORDER BY avg_score DESC' },
  { label: "Goal progress", sql: 'SELECT name, category, status, progress, type FROM "Goal" ORDER BY progress DESC LIMIT 15' },
];

export function SqlPlayground() {
  const [sql, setSql] = useState(EXAMPLE_QUERIES[0].sql);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const runQuery = useCallback(async () => {
    if (!sql.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analytics-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Query failed");
      setResult(data.result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [sql]);

  const handleCopy = () => {
    if (result) {
      const headers = result.columns.join(",");
      const rows = result.rows.map(r => result.columns.map(c => JSON.stringify(r[c] ?? "")).join(",")).join("\n");
      navigator.clipboard.writeText(headers + "\n" + rows);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
            <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">SQL Query Playground</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Write SELECT queries on your own data • Only read-only queries allowed</p>
          </div>
        </div>
      </div>

      {/* Quick examples */}
      <div className="flex flex-wrap gap-2 mb-3">
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q.label}
            onClick={() => { setSql(q.sql); setResult(null); setError(null); }}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* SQL Editor */}
      <div className="relative mb-4">
        <textarea
          ref={editorRef}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) runQuery();
          }}
          placeholder='SELECT * FROM "ProductivityScore" LIMIT 10'
          className="w-full h-28 px-4 py-3 rounded-xl bg-slate-950 dark:bg-slate-950 text-emerald-400 font-mono text-sm border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-y placeholder:text-slate-600"
          spellCheck={false}
        />
        <button
          onClick={runQuery}
          disabled={isLoading || !sql.trim()}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {isLoading ? "Running..." : "Run"}
        </button>
        <span className="absolute bottom-3 right-20 text-[10px] text-slate-600">Ctrl+Enter</span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Table */}
      {result && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {result.rowCount} row{result.rowCount !== 1 ? "s" : ""} • {result.executionTimeMs}ms
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy CSV"}
            </button>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="bg-slate-100/80 dark:bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-12">#</th>
                  {result.columns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {result.rows.slice(0, 100).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2 text-[11px] text-slate-400 font-mono">{i + 1}</td>
                    {result.columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-slate-700 dark:text-slate-200 font-mono text-xs whitespace-nowrap">
                        {row[col] instanceof Date ? row[col].toISOString().slice(0, 10) : String(row[col] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {result.rowCount > 100 && (
              <div className="px-4 py-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-center">
                Showing 100 of {result.rowCount} rows
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
