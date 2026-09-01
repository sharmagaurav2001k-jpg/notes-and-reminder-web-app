"use client";

import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileText,
  CheckSquare,
  Target,
  Bell,
  Star,
  Plus,
  Sparkles,
  Loader2,
  Zap,
  CornerDownLeft,
  Check,
  TrendingUp,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  AlertCircle,
  Pin,
} from "lucide-react";
import { NoteModal, NoteItem } from "@/components/notes/note-modal";
import { NotesList } from "@/components/notes/notes-list";
import { ReminderModal } from "@/components/reminders/reminder-modal";
import { TodayWidget } from "@/components/dashboard/today-widget";
import { UpcomingWidget } from "@/components/dashboard/upcoming-widget";
import { GoalsWidget } from "@/components/dashboard/goals-widget";
import { RecentNotesWidget } from "@/components/dashboard/recent-notes-widget";

interface GoalSummaryItem {
  id: string;
  name: string;
  type: string;
  category: string;
  color: string;
  progress: number;
  targetDate: string | null;
  milestonesCount: number;
  completedMilestonesCount: number;
  tasksCount: number;
}

interface TodayTaskSummary {
  totalToday: number;
  completedToday: number;
  pendingToday: number;
  overdueCount: number;
  completionRate: number;
}

function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const userName = session?.user?.name?.split(" ")[0] || "there";

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [goals, setGoals] = useState<GoalSummaryItem[]>([]);
  const [todaySummary, setTodaySummary] = useState<TodayTaskSummary>({
    totalToday: 0,
    completedToday: 0,
    pendingToday: 0,
    overdueCount: 0,
    completionRate: 0,
  });
  const [stats, setStats] = useState({
    totalNotes: 0,
    starredNotes: 0,
    totalTasks: 0,
    activeReminders: 0,
    activeGoals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Quick Capture State & Ref
  const quickInputRef = useRef<HTMLInputElement>(null);
  const [quickText, setQuickText] = useState("");
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);

  // Modal states
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  // Time-of-day Dynamic Greeting & Formatted Date
  const greetingData = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();

    let greeting = "Good morning";
    let icon = Sunrise;
    let periodColor = "text-amber-400";

    if (hour >= 12 && hour < 17) {
      greeting = "Good afternoon";
      icon = Sun;
      periodColor = "text-amber-400";
    } else if (hour >= 17 && hour < 21) {
      greeting = "Good evening";
      icon = Sunset;
      periodColor = "text-orange-400";
    } else if (hour >= 21 || hour < 5) {
      greeting = "Good night";
      icon = Moon;
      periodColor = "text-indigo-300";
    }

    const formattedDate = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return { greeting, icon, periodColor, formattedDate };
  }, []);

  // Open note modal if query param ?new=true is present
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setSelectedNote(null);
      setIsNoteModalOpen(true);
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  // Global Keyboard Shortcut: Focus Quick Capture on 'c' or 'k' with Cmd/Ctrl
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        quickInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Single Aggregate Fetch from /api/dashboard
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
        setGoals(data.goals || []);
        setTodaySummary(data.today?.summary || {
          totalToday: 0,
          completedToday: 0,
          pendingToday: 0,
          overdueCount: 0,
          completionRate: 0,
        });
        setStats(data.stats || {
          totalNotes: 0,
          starredNotes: 0,
          totalTasks: 0,
          activeReminders: 0,
          activeGoals: 0,
        });
      }
    } catch (err) {
      console.error("Failed to load aggregate dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Optimistic Quick Capture Handler
  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToCapture = quickText.trim();
    if (!textToCapture || isQuickSaving) return;

    // 1. Prepare Optimistic Note Item
    const tempId = `temp-${Date.now()}`;
    const lines = textToCapture.split("\n").map((l) => l.trim()).filter(Boolean);
    const optimisticTitle =
      lines.length > 1
        ? lines[0].slice(0, 120)
        : textToCapture.length > 60
        ? textToCapture.slice(0, 60) + "..."
        : textToCapture;
    const optimisticContent = lines.length > 1 ? lines.slice(1).join("\n") : textToCapture;

    const optimisticNote: NoteItem = {
      id: tempId,
      title: optimisticTitle,
      content: optimisticContent,
      category: "Quick Notes",
      color: "default",
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      updatedAt: new Date().toISOString(),
    };

    // 2. Instant Optimistic UI Update
    setNotes((prev) => [optimisticNote, ...prev]);
    setQuickText("");
    setQuickFeedback("Captured! ⚡");
    setTimeout(() => setQuickFeedback(null), 2500);

    // 3. Call API in Background
    try {
      setIsQuickSaving(true);
      const res = await fetch("/api/notes/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToCapture }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes((prev) =>
          prev.map((n) => (n.id === tempId ? data.note : n))
        );
      } else {
        setNotes((prev) => prev.filter((n) => n.id !== tempId));
        setQuickText(textToCapture);
        setQuickFeedback("Failed to save. Try again.");
        setTimeout(() => setQuickFeedback(null), 3000);
      }
    } catch (err) {
      console.error("Quick capture error:", err);
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
      setQuickText(textToCapture);
    } finally {
      setIsQuickSaving(false);
    }
  };

  // Handlers for Note Modal
  const handleOpenNote = (note: NoteItem) => {
    setSelectedNote(note);
    setIsNoteModalOpen(true);
  };

  const handleCreateNote = () => {
    setSelectedNote(null);
    setIsNoteModalOpen(true);
  };

  const GreetingIcon = greetingData.icon;

  // Stat Metric Cards
  const statCards = [
    {
      label: "Today's Tasks",
      value: `${todaySummary.completedToday}/${todaySummary.totalToday}`,
      change: todaySummary.overdueCount > 0 ? `${todaySummary.overdueCount} overdue ⚠️` : `${todaySummary.pendingToday} pending`,
      icon: CheckSquare,
      color: "from-indigo-600 to-violet-600",
      bgColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      href: "/tasks",
    },
    {
      label: "Active Reminders",
      value: stats.activeReminders.toString(),
      change: `${stats.activeReminders} active alerts`,
      icon: Bell,
      color: "from-amber-500 to-orange-600",
      bgColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      href: "/reminders",
    },
    {
      label: "Active Goals",
      value: stats.activeGoals.toString(),
      change: "Tracking vision",
      icon: Target,
      color: "from-blue-600 to-cyan-600",
      bgColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      href: "/goals",
    },
    {
      label: "Total Notes",
      value: stats.totalNotes.toString(),
      change: stats.totalNotes > 0 ? `${stats.totalNotes} in cloud` : "Ready to create",
      icon: FileText,
      color: "from-slate-700 to-slate-900",
      bgColor: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
      href: "/dashboard",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Date-Aware Dynamic Hero Welcome Banner (Royal Indigo & Blue Theme) */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-linear-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-8 shadow-xl shadow-indigo-950/20">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-12 w-48 h-48 rounded-full bg-violet-500/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Live Date Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 border border-white/10">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-300" />
              <span>{greetingData.formattedDate}</span>
            </div>

            {/* Time-of-Day Greeting Heading */}
            <div className="flex items-center gap-2.5">
              <GreetingIcon className={`w-7 h-7 sm:w-8 sm:h-8 ${greetingData.periodColor}`} />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {greetingData.greeting}, {userName}!
              </h1>
            </div>

            {/* Today Context Summary Row */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Today at a glance:{" "}
              <span className="font-bold text-white">
                {todaySummary.totalToday} task{todaySummary.totalToday === 1 ? "" : "s"} scheduled
              </span>
              {todaySummary.overdueCount > 0 ? (
                <span className="text-rose-400 font-bold ml-1">
                  ({todaySummary.overdueCount} overdue ⚠️)
                </span>
              ) : null}
              ,{" "}
              <span className="font-bold text-white">
                {stats.activeReminders} reminder{stats.activeReminders === 1 ? "" : "s"}
              </span>
              , and{" "}
              <span className="font-bold text-white">
                {stats.activeGoals} vision goal{stats.activeGoals === 1 ? "" : "s"}
              </span>{" "}
              in flight.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateNote}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Note</span>
            </button>
            <button
              onClick={() => setIsReminderModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md text-white font-semibold text-sm border border-white/15 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>Add Reminder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Capture UI Widget */}
      <div className="relative group">
        <form
          onSubmit={handleQuickCapture}
          className="relative flex items-center p-2 rounded-2xl border-2 border-indigo-500/20 dark:border-indigo-500/30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg shadow-indigo-500/5 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all"
        >
          <div className="flex items-center gap-2 pl-3 pr-2 text-indigo-600 dark:text-indigo-400 shrink-0">
            <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
              <Zap className="w-4 h-4 fill-indigo-600/30 animate-pulse" />
            </div>
          </div>

          <input
            ref={quickInputRef}
            type="text"
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            placeholder="What's on your mind? Type a thought, task, or meeting note and press Enter ↵"
            className="flex-1 bg-transparent px-2 py-2.5 text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />

          <div className="flex items-center gap-2 pr-1.5 shrink-0">
            {quickFeedback && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                {quickFeedback}
              </span>
            )}

            <button
              type="submit"
              disabled={!quickText.trim() || isQuickSaving}
              title="Save Note (Press Enter)"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
            >
              {isQuickSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CornerDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span className="hidden sm:inline">Capture</span>
            </button>
          </div>
        </form>
      </div>

      {/* Pinned Top Section: Today's Tasks Focus Widget */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Pin className="w-4 h-4 text-indigo-600 dark:text-indigo-400 -rotate-45" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Pinned Today&apos;s Focus
          </h2>
        </div>
        <TodayWidget />
      </div>

      {/* Today's Summary Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Link
              key={i}
              href={stat.href}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs hover:shadow-md hover:border-indigo-400/80 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {stat.label}
                </span>
                <div className={`p-2 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  {stat.value}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Full Notes Workspace */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <NotesList
              notes={notes}
              isLoading={isLoading}
              onOpenNote={handleOpenNote}
              onCreateNote={handleCreateNote}
              onRefresh={fetchDashboardData}
            />
          )}
        </div>

        {/* Right 1 Column: Recent Notes Widget + Goals Progress Widget + Upcoming 7 Days Widget */}
        <div className="space-y-6">
          {/* Recent Notes Snippet Widget */}
          <RecentNotesWidget
            notes={notes}
            isLoading={isLoading}
            onOpenNote={handleOpenNote}
            onCreateNote={handleCreateNote}
            onRefresh={fetchDashboardData}
            maxDisplay={4}
          />

          {/* Goals Progress Widget */}
          <GoalsWidget initialGoals={goals as any} maxDisplay={3} />

          {/* Upcoming 7 Days Timeline Widget */}
          <UpcomingWidget />
        </div>
      </div>

      {/* Note Edit / Create Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        note={selectedNote}
        onSaved={fetchDashboardData}
        onDeleted={fetchDashboardData}
      />

      {/* Reminder Create Modal */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSaved={fetchDashboardData}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
