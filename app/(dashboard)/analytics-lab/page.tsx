"use client";

import React, { useState, useCallback } from "react";
import {
  Database,
  Sigma,
  GitBranch,
  BarChart3,
  Download,
  BookOpen,
} from "lucide-react";
import { SqlPlayground } from "@/components/analytics/sql-playground";
import { StatisticalSummaryPanel } from "@/components/analytics/statistical-summary-panel";
import { CorrelationMatrix } from "@/components/analytics/correlation-matrix";
import { DistributionChart } from "@/components/analytics/distribution-chart";
import { DataExportPanel } from "@/components/analytics/data-export-panel";
import { LearningHub } from "@/components/analytics/learning-hub";

type TabId = "playground" | "stats" | "correlations" | "distribution" | "export" | "learn";

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType; badge?: string }> = [
  { id: "playground", label: "SQL Playground", icon: Database, badge: "Try it!" },
  { id: "stats", label: "Statistics", icon: Sigma },
  { id: "correlations", label: "Correlations", icon: GitBranch },
  { id: "distribution", label: "Distributions", icon: BarChart3 },
  { id: "export", label: "Data Export", icon: Download },
  { id: "learn", label: "Learning Hub", icon: BookOpen, badge: "New" },
];

export default function AnalyticsLearningPage() {
  const [activeTab, setActiveTab] = useState<TabId>("playground");

  const handleRunQuery = useCallback((sql: string) => {
    setActiveTab("playground");
    // The SQL Playground has its own state, so we use a simple event approach
    window.dispatchEvent(new CustomEvent("sql-playground:load", { detail: sql }));
  }, []);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-blue-500 to-violet-500 flex items-center justify-center text-white shadow-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Data Analytics Lab
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Learn data analytics hands-on with your own productivity data
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-violet-50 dark:from-emerald-950/40 dark:to-violet-950/40 border border-emerald-200/50 dark:border-emerald-900/30">
          <span className="text-xs font-bold bg-gradient-to-r from-emerald-600 to-violet-600 bg-clip-text text-transparent">
            🎓 For Data Analytics Learners
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "playground" && <SqlPlaygroundWithEvents />}
      {activeTab === "stats" && <StatisticalSummaryPanel />}
      {activeTab === "correlations" && <CorrelationMatrix />}
      {activeTab === "distribution" && <DistributionChart />}
      {activeTab === "export" && <DataExportPanel />}
      {activeTab === "learn" && <LearningHub onRunQuery={handleRunQuery} />}
    </div>
  );
}

// Wrapper to handle cross-component SQL loading via custom event
function SqlPlaygroundWithEvents() {
  const [initialSql, setInitialSql] = useState<string | null>(null);
  
  React.useEffect(() => {
    const handler = (e: Event) => {
      const sql = (e as CustomEvent).detail;
      if (typeof sql === "string") setInitialSql(sql);
    };
    window.addEventListener("sql-playground:load", handler);
    return () => window.removeEventListener("sql-playground:load", handler);
  }, []);

  return (
    <div>
      {initialSql && (
        <div className="mb-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30">
          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
            📎 Query loaded from Learning Hub — click <strong>Run</strong> to execute!
          </p>
        </div>
      )}
      <SqlPlayground />
    </div>
  );
}