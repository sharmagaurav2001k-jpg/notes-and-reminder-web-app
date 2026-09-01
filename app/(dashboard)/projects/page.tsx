"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Target,
  FileText,
  CheckSquare,
  TrendingUp,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  ChevronRight,
  Sliders,
  Sparkles,
} from "lucide-react";
import { ProjectModal, ProjectItem } from "@/components/projects/project-modal";

const STATUS_TABS = [
  { id: "all", label: "All Projects" },
  { id: "Active", label: "⚡ Active" },
  { id: "InProgress", label: "⏳ In Progress" },
  { id: "Completed", label: "✅ Completed" },
  { id: "Paused", label: "⏸️ Paused" },
  { id: "Archived", label: "📦 Archived" },
];

function ProjectsOverviewContent() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Views
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"updated" | "progress" | "name">("updated");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (e: React.MouseEvent, p: ProjectItem) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProject(p);
    setIsModalOpen(true);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "Active" || p.status === "InProgress").length;
    const completed = projects.filter((p) => p.status === "Completed").length;
    const avgProgress =
      total > 0
        ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / total)
        : 0;

    let totalTasks = 0;
    let completedTasks = 0;
    projects.forEach((p) => {
      totalTasks += p.tasksCount || 0;
      completedTasks += p.completedTasksCount || 0;
    });

    return { total, active, completed, avgProgress, totalTasks, completedTasks };
  }, [projects]);

  // Unique Goals in projects for dropdown filter
  const goalsInProjects = useMemo(() => {
    const goalMap = new Map<string, { id: string; name: string }>();
    projects.forEach((p) => {
      if (p.goal?.id && p.goal?.name) {
        goalMap.set(p.goal.id, { id: p.goal.id, name: p.goal.name });
      }
    });
    return Array.from(goalMap.values());
  }, [projects]);

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        // 1. Search Query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchesName = p.name.toLowerCase().includes(query);
          const matchesDesc = (p.description || "").toLowerCase().includes(query);
          const matchesGoal = (p.goal?.name || "").toLowerCase().includes(query);
          if (!matchesName && !matchesDesc && !matchesGoal) return false;
        }

        // 2. Status Filter
        if (statusFilter !== "all" && p.status !== statusFilter) return false;

        // 3. Goal Filter
        if (goalFilter === "standalone") {
          if (p.goalId) return false;
        } else if (goalFilter !== "all") {
          if (p.goalId !== goalFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "progress") {
          return (b.progress || 0) - (a.progress || 0);
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        // "updated"
        return new Date(b.updatedAt || "").getTime() - new Date(a.updatedAt || "").getTime();
      });
  }, [projects, searchQuery, statusFilter, goalFilter, sortBy]);

  return (
    <div className="space-y-8 max-w-7xl pb-16">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
            <Briefcase className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <span>Projects Workspace</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize complex initiatives, link tasks & documentation to overarching goals
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "grid"
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
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <ListIcon className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          {/* Create Project Button */}
          <button
            onClick={handleCreateProject}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Projects</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {metrics.total}
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              {metrics.active} in motion
            </span>
          </div>
        </div>

        {/* Avg Progress */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Task Completion</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {metrics.avgProgress}%
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Avg across projects
            </span>
          </div>
        </div>

        {/* Connected Tasks */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Connected Tasks</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {metrics.completedTasks}/{metrics.totalTasks}
            </span>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              Done ✅
            </span>
          </div>
        </div>

        {/* Completed Projects */}
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
              {metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}% rate
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
              placeholder="Search projects by name or scope..."
              className="w-full pl-8.5 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Goal & Sort Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Goal Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Goal:
              </span>
              <select
                value={goalFilter}
                onChange={(e) => setGoalFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Goals & Standalone</option>
                <option value="standalone">⚡ Standalone Only</option>
                {goalsInProjects.map((g) => (
                  <option key={g.id} value={g.id}>
                    🎯 {g.name}
                  </option>
                ))}
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
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="updated">Recently Updated</option>
                <option value="progress">Task Progress (%)</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Tabs Strip */}
        <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.id === "all" ? projects.length : projects.filter((p) => p.status === tab.id).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-750"
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Project List / Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            No projects found matching criteria
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-5 max-w-sm">
            Create standalone projects or organize initiatives under your Vision Goals.
          </p>
          <button
            onClick={handleCreateProject}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            + Create Your First Project
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* ================= GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => {
            const progress = p.progress || 0;
            const tasksCount = p.tasksCount || 0;
            const completedTasks = p.completedTasksCount || 0;
            const notesCount = p.notesCount || 0;

            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group flex flex-col justify-between p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xl hover:border-indigo-400/80 dark:hover:border-indigo-600 transition-all cursor-pointer relative"
              >
                <div>
                  {/* Card Top: Parent Goal Badge & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {p.goal ? (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg text-white shadow-xs max-w-[170px] truncate"
                        style={{ backgroundColor: p.goal.color || "#6366f1" }}
                      >
                        <Target className="w-3 h-3 shrink-0" />
                        <span className="truncate">{p.goal.name}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <span>⚡ Standalone</span>
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50">
                        {p.status || "Active"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleEditProject(e, p)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 rounded-md transition-opacity"
                        title="Edit project"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Project Name */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {p.name}
                  </h3>

                  {/* Description */}
                  {p.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>

                {/* Card Bottom: Progress Bar & Item Counts */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-850 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-500 dark:text-slate-400">Execution Progress</span>
                      <span className="text-slate-900 dark:text-slate-100 font-extrabold">{progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-indigo-600 to-violet-600 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer Counts */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                        <CheckSquare className="w-3 h-3 text-indigo-500" />
                        {completedTasks}/{tasksCount} Tasks
                      </span>
                      {notesCount > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                          <FileText className="w-3 h-3 text-violet-500" />
                          {notesCount} Notes
                        </span>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ================= LIST VIEW ================= */
        <div className="space-y-3">
          {filteredProjects.map((p) => {
            const progress = p.progress || 0;
            const tasksCount = p.tasksCount || 0;
            const completedTasks = p.completedTasksCount || 0;
            const notesCount = p.notesCount || 0;

            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md hover:border-indigo-400/80 transition-all cursor-pointer gap-4"
              >
                <div className="flex items-start md:items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                    <Briefcase className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.goal ? (
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold rounded-md text-white"
                          style={{ backgroundColor: p.goal.color || "#6366f1" }}
                        >
                          🎯 {p.goal.name}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          ⚡ Standalone
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {p.status || "Active"}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate mt-1">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xl">
                        {p.description}
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
                        className="h-full rounded-full bg-linear-to-r from-indigo-600 to-violet-600 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                    <p>✅ {completedTasks}/{tasksCount} Tasks</p>
                    {notesCount > 0 && <p className="text-[10px] text-slate-400 font-normal mt-0.5">📄 {notesCount} Notes</p>}
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Project Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={selectedProject}
        onSaved={fetchProjects}
        onDeleted={fetchProjects}
      />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ProjectsOverviewContent />
    </Suspense>
  );
}
