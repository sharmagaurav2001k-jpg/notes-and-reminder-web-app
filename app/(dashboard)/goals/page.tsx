"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  Target,
  Plus,
  Search,
  Calendar,
  Clock,
  Flag,
  Sparkles,
  Loader2,
  ChevronRight,
  TrendingUp,
  Layers,
  CheckCircle2,
  Filter,
  LayoutGrid,
  List as ListIcon,
  Flame,
  CheckSquare,
  Award,
  ArrowUpDown,
  MoreVertical,
  Sliders,
} from "lucide-react";
import { GoalModal, GoalItem } from "@/components/goals/goal-modal";

const GOAL_TYPES = [
  { id: "all", label: "All Types", icon: "🌐" },
  { id: "Short-term", label: "Short-term", icon: "🎯" },
  { id: "Long-term", label: "Long-term", icon: "🏔️" },
  { id: "Habit", label: "Habit", icon: "🔄" },
  { id: "Career", label: "Career", icon: "💼" },
  { id: "Learning", label: "Learning", icon: "📚" },
  { id: "Financial", label: "Financial", icon: "💰" },
  { id: "Personal", label: "Personal", icon: "🌟" },
];

const STATUS_TABS = [
  { id: "all", label: "All Goals" },
  { id: "Active", label: "⚡ Active" },
  { id: "InProgress", label: "⏳ In Progress" },
  { id: "Completed", label: "✅ Completed" },
  { id: "Paused", label: "⏸️ Paused" },
  { id: "Archived", label: "📦 Archived" },
];

function GoalsOverviewContent() {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View & Filter States
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"targetDate" | "progress" | "priority" | "newest">("targetDate");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(null);

  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/goals");
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      }
    } catch (err) {
      console.error("Failed to load goals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = () => {
    setSelectedGoal(null);
    setIsModalOpen(true);
  };

  const handleEditGoal = (e: React.MouseEvent, goal: GoalItem) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedGoal(goal);
    setIsModalOpen(true);
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = goals.length;
    const active = goals.filter((g) => g.status === "Active" || g.status === "InProgress").length;
    const completed = goals.filter((g) => g.status === "Completed").length;
    const avgProgress =
      total > 0 ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / total) : 0;

    let totalMilestones = 0;
    let completedMilestones = 0;
    goals.forEach((g) => {
      totalMilestones += g.milestones?.length || 0;
      completedMilestones += g.milestones?.filter((m) => m.isCompleted).length || 0;
    });

    return { total, active, completed, avgProgress, totalMilestones, completedMilestones };
  }, [goals]);

  // Filter & Sort Pipeline
  const filteredGoals = useMemo(() => {
    return goals
      .filter((g) => {
        // 1. Search Query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchesName = g.name.toLowerCase().includes(query);
          const matchesDesc = (g.description || "").toLowerCase().includes(query);
          const matchesCategory = (g.category || "").toLowerCase().includes(query);
          if (!matchesName && !matchesDesc && !matchesCategory) return false;
        }

        // 2. Type Filter
        if (typeFilter !== "all" && g.type !== typeFilter) return false;

        // 3. Status Filter
        if (statusFilter !== "all" && g.status !== statusFilter) return false;

        // 4. Priority Filter
        if (priorityFilter !== "all" && g.priority !== priorityFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "targetDate") {
          if (!a.targetDate) return 1;
          if (!b.targetDate) return -1;
          return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
        }
        if (sortBy === "progress") {
          return (b.progress || 0) - (a.progress || 0);
        }
        if (sortBy === "priority") {
          const weights: Record<string, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
          return (weights[b.priority || "Medium"] || 0) - (weights[a.priority || "Medium"] || 0);
        }
        // "newest"
        return new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime();
      });
  }, [goals, searchQuery, typeFilter, statusFilter, priorityFilter, sortBy]);

  return (
    <div className="space-y-8 max-w-7xl pb-16">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
            <Target className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <span>Goals & Vision Overview</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track long-term ambitions, milestone roadmaps, and execution progress
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === "grid"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List View"
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === "list"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
            >
              <ListIcon className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          {/* Create Goal Button */}
          <button
            onClick={handleCreateGoal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Goals */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Goals</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {metrics.total}
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              {metrics.active} active
            </span>
          </div>
        </div>

        {/* Avg Progress */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg Progress</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {metrics.avgProgress}%
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Across all goals
            </span>
          </div>
        </div>

        {/* Milestones Achieved */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Milestones</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {metrics.completedMilestones}/{metrics.totalMilestones}
            </span>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              Reached 🚩
            </span>
          </div>
        </div>

        {/* Completed Goals */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {metrics.completed}
            </span>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              {metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}% success
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search goals by name or vision..."
              className="w-full pl-8.5 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Type:
              </span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {GOAL_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Priority:
              </span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="Urgent">🔴 Urgent</option>
                <option value="High">🟠 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">⚪ Low</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="targetDate">Target Date (Earliest)</option>
                <option value="progress">Progress (High to Low)</option>
                <option value="priority">Priority (High to Low)</option>
                <option value="newest">Recently Created</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Tab Strip */}
        <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.id === "all" ? goals.length : goals.filter((g) => g.status === tab.id).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${statusFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content: Grid View or List View */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center">
          <Target className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            No goals found matching criteria
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-5 max-w-sm">
            Set ambitious targets, break them into milestones, and track execution.
          </p>
          <button
            onClick={handleCreateGoal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            + Create Your First Goal
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* ================= GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGoals.map((g) => {
            const progress = g.progress || 0;
            const completedM = g.milestones?.filter((m) => m.isCompleted).length || 0;
            const totalM = g.milestones?.length || 0;

            let remainingText = "";
            if (g.targetDate) {
              const diffTime = new Date(g.targetDate).getTime() - new Date().getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays < 0) remainingText = `⚠️ Overdue by ${Math.abs(diffDays)}d`;
              else if (diffDays === 0) remainingText = "📅 Due Today";
              else remainingText = `⏳ ${diffDays}d left`;
            }

            return (
              <Link
                key={g.id}
                href={`/goals/${g.id}`}
                className="group flex flex-col justify-between p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xl hover:border-indigo-400/80 dark:hover:border-indigo-600 transition-all cursor-pointer relative"
              >
                <div>
                  {/* Card Top: Type Pill & Category */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className="px-2.5 py-0.5 text-[10px] font-bold rounded-md text-white shadow-xs"
                      style={{ backgroundColor: g.color || "#6366f1" }}
                    >
                      {g.type || "Short-term"}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {g.category || "General"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleEditGoal(e, g)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-opacity"
                        title="Edit goal"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Goal Name */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {g.name}
                  </h3>

                  {/* Vision Preview */}
                  {g.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {g.description}
                    </p>
                  )}
                </div>

                {/* Card Bottom: Progress & Stats */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-850 space-y-3">
                  {/* Progress Bar & Number */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">Progress</span>
                      <span className="text-slate-900 dark:text-slate-100 font-extrabold">{progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: g.color || "#6366f1",
                        }}
                      />
                    </div>
                  </div>

                  {/* Footer Timelines & Counts */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {g.targetDate ? (
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {new Date(g.targetDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                          {remainingText ? ` • ${remainingText}` : ""}
                        </span>
                      ) : (
                        "No deadline"
                      )}
                    </span>

                    <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                      🚩 {completedM}/{totalM}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ================= LIST VIEW ================= */
        <div className="space-y-3">
          {filteredGoals.map((g) => {
            const progress = g.progress || 0;
            const completedM = g.milestones?.filter((m) => m.isCompleted).length || 0;
            const totalM = g.milestones?.length || 0;

            return (
              <Link
                key={g.id}
                href={`/goals/${g.id}`}
                className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md hover:border-indigo-400/80 transition-all cursor-pointer gap-4"
              >
                <div className="flex items-start md:items-center gap-4 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: g.color || "#6366f1" }}
                  >
                    <Target className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {g.type || "Short-term"}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50">
                        {g.priority || "Medium"}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {g.status || "Active"}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate mt-1">
                      {g.name}
                    </h3>
                    {g.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xl">
                        {g.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress & Actions on Right */}
                <div className="flex items-center gap-6 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="w-36 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-slate-900 dark:text-slate-100">{progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: g.color || "#6366f1",
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                    <p>🚩 {completedM}/{totalM} Milestones</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      {g.targetDate ? new Date(g.targetDate).toLocaleDateString([], { month: "short", day: "numeric" }) : "No deadline"}
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Goal Modal */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        goal={selectedGoal}
        onSaved={fetchGoals}
        onDeleted={fetchGoals}
      />
    </div>
  );
}

export default function GoalsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <GoalsOverviewContent />
    </Suspense>
  );
}
