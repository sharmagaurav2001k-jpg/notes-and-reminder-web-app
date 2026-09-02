"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  GraduationCap,
  Code,
  BarChart3,
  ChevronRight,
  Play,
  X,
} from "lucide-react";

interface Resource {
  id: string;
  title: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  description: string;
  content: string;
  exampleQuery?: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
  intermediate: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  advanced: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "SQL Fundamentals": Code,
  Statistics: BarChart3,
  "Applied Analytics": GraduationCap,
};

export function LearningHub({ onRunQuery }: { onRunQuery?: (sql: string) => void }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [diffFilter, setDiffFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/analytics-learning?view=resources");
        if (res.ok) setResources((await res.json()).resources);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const selected = resources.find(r => r.id === selectedId);
  const filtered = resources.filter(r =>
    (filter === "all" || r.category === filter) &&
    (diffFilter === "all" || r.difficulty === diffFilter)
  );

  const categories = [...new Set(resources.map(r => r.category))];

  // Simple markdown-ish renderer for learning content
  const renderContent = (md: string) => {
    return md.split("\n").map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-5 mb-2">{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4 mb-1">{line.slice(4)}</h3>;
      if (line.startsWith("- **")) {
        const m = line.match(/^- \*\*(.+?)\*\* (.+)$/);
        return m ? <li key={i} className="ml-4 text-sm text-slate-600 dark:text-slate-300"><strong>{m[1]}</strong> {m[2]}</li> : <li key={i} className="ml-4 text-sm text-slate-600 dark:text-slate-300">{line.slice(2)}</li>;
      }
      if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm text-slate-600 dark:text-slate-300">{line.slice(2)}</li>;
      if (line.startsWith("| ") && line.includes("|")) {
        const cells = line.split("|").filter(c => c.trim()).map(c => c.trim());
        if (cells.every(c => /^[-:]+$/.test(c))) return null; // separator row
        return (
          <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
            {cells.map((c, j) => (
              <td key={j} className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300">{c.replace(/\*\*(.+?)\*\*/g, "$1")}</td>
            ))}
          </tr>
        );
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      // Bold text
      const parts = line.split(/(\*\*.+?\*\*)/g);
      return (
        <p key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {parts.map((p, j) => {
            if (p.startsWith("**") && p.endsWith("**")) return <strong key={j} className="text-slate-800 dark:text-slate-200">{p.slice(2, -2)}</strong>;
            return <span key={j}>{p}</span>;
          })}
        </p>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm animate-pulse">
        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800 mb-4" />
        <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  // Modal view for selected resource
  if (selected) {
    const IconComp = CATEGORY_ICONS[selected.category] || BookOpen;
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            ← Back to Resources
          </button>
          <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
            <IconComp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selected.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">{selected.category}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${DIFFICULTY_COLORS[selected.difficulty]}`}>{selected.difficulty}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{selected.description}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
          {renderContent(selected.content)}
          <table className="w-full text-sm mt-2 border-collapse">
            <tbody>{renderContent(selected.content).filter((el: any) => el?.type === "tr")}</tbody>
          </table>
        </div>

        {selected.exampleQuery && onRunQuery && (
          <div className="mt-5 p-4 rounded-xl bg-slate-950 dark:bg-slate-950 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase">Try it in SQL Playground</span>
              <button onClick={() => { onRunQuery(selected.exampleQuery!); setSelectedId(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors">
                <Play className="w-3.5 h-3.5" /> Run Query
              </button>
            </div>
            <pre className="text-xs text-emerald-400/80 font-mono whitespace-pre-wrap">{selected.exampleQuery}</pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Learning Hub</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">SQL, statistics, and analytics concepts — learn by doing</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <button onClick={() => setFilter("all")} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filter === "all" ? "bg-cyan-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
          All
        </button>
        {categories.map(c => {
          const Icon = CATEGORY_ICONS[c] || BookOpen;
          return (
            <button key={c} onClick={() => setFilter(c)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${filter === c ? "bg-cyan-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
              <Icon className="w-3 h-3" /> {c}
            </button>
          );
        })}
        <span className="mx-1 text-slate-300">|</span>
        {["beginner", "intermediate", "advanced"].map(d => (
          <button key={d} onClick={() => setDiffFilter(d)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${diffFilter === d ? DIFFICULTY_COLORS[d] + " ring-1 ring-current" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
            {d}
          </button>
        ))}
      </div>

      {/* Resource cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(r => {
          const Icon = CATEGORY_ICONS[r.category] || BookOpen;
          return (
            <button key={r.id} onClick={() => setSelectedId(r.id)}
              className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 hover:shadow-sm transition-all text-left group">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${DIFFICULTY_COLORS[r.difficulty].split(" ")[0]}`}>
                <Icon className={`w-4 h-4 ${DIFFICULTY_COLORS[r.difficulty].split(" ")[1]}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{r.title}</h4>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${DIFFICULTY_COLORS[r.difficulty]}`}>{r.difficulty}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{r.description}</p>
                <span className="text-[10px] text-indigo-500 font-semibold mt-1 inline-flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                  Read more <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
