"use client";

import React, { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Calendar, Loader2, CheckCircle2 } from "lucide-react";

const TABLES = [
  { value: "ProductivityScore", label: "Productivity Scores", icon: "📊", desc: "Daily scores with task/goal/note breakdown" },
  { value: "Task", label: "Tasks", icon: "✅", desc: "All tasks with status, priority, due dates" },
  { value: "Note", label: "Notes", icon: "📝", desc: "Notes with categories, pins, favorites" },
  { value: "Goal", label: "Goals", icon: "🎯", desc: "Goals with progress, milestones, categories" },
  { value: "Reminder", label: "Reminders", icon: "🔔", desc: "Reminders with completion status" },
  { value: "WeeklyReview", label: "Weekly Reviews", icon: "📋", desc: "Auto-generated weekly summaries" },
];

export function DataExportPanel() {
  const [table, setTable] = useState("ProductivityScore");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [days, setDays] = useState(90);
  const [isExporting, setIsExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setDone(false);
    try {
      const res = await fetch(`/api/analytics-learning?view=export&table=${table}&format=${format}&days=${days}`);
      if (!res.ok) throw new Error((await res.json()).error || "Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${table.toLowerCase()}_${days}d.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch {
      alert("Export failed. Make sure you have data for the selected period.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
          <Download className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Data Export</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Download your data for external analysis in Excel, Python, or R</p>
        </div>
      </div>

      {/* Table selector */}
      <div className="mb-4">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Select Data</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TABLES.map(t => (
            <button key={t.value} onClick={() => setTable(t.value)}
              className={`p-3 rounded-xl text-left border transition-all ${table === t.value
                  ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-200 dark:ring-indigo-800"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}>
              <div className="text-lg">{t.icon}</div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{t.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Format + days row */}
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Format</label>
          <div className="flex gap-2">
            <button onClick={() => setFormat("csv")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${format === "csv" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}>
              <FileSpreadsheet className="w-4 h-4" /> CSV
            </button>
            <button onClick={() => setFormat("json")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${format === "json" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}>
              <FileJson className="w-4 h-4" /> JSON
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Time Range</label>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Last</span>
            {[30, 60, 90, 180, 365].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${days === d ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleExport} disabled={isExporting}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors ml-auto">
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          {isExporting ? "Exporting..." : done ? "Downloaded!" : "Export"}
        </button>
      </div>

      {/* Learning tip */}
      <div className="mt-4 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <strong>💡 Data science tip:</strong> Use CSV for Excel/Google Sheets, R (read.csv), or Python (pandas.read_csv). Use JSON for JavaScript/Python (json.load) or NoSQL tools. After downloading, try: <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">df.describe()</code> in pandas for instant stats!
        </p>
      </div>
    </div>
  );
}
