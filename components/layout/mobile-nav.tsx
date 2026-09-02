"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  CheckSquare,
  Target,
  Briefcase,
  Bell,
  Star,
  Settings,
  Plus,
  Menu,
  X,
  Sparkles,
  Archive,
  BarChart3,
  Database,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSession, signOut } from "next-auth/react";

const NAV_ITEMS = [
  { label: "Notes", href: "/dashboard", icon: FileText },
  { label: "Tasks & Todos", href: "/tasks", icon: CheckSquare },
  { label: "Projects", href: "/projects", icon: Briefcase },
  { label: "Goals & Vision", href: "/goals", icon: Target },
  { label: "Reminders", href: "/reminders", icon: Bell },
  { label: "Favorites", href: "/favorites", icon: Star },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Analytics Lab", href: "/analytics-lab", icon: Database },
  { label: "Archive", href: "/archive", icon: Archive },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* Mobile Top App Bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-15 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4 fill-white/20" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
            RemindNotes
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Navigation Menu"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-850/80 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-out Drawer Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-4/5 max-w-xs h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-xs">
                    <Sparkles className="w-4 h-4 fill-white/20" />
                  </div>
                  <span className="font-bold text-base text-slate-900 dark:text-white">
                    RemindNotes
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Add Button */}
              <div className="py-4">
                <Link
                  href="/dashboard?new=true"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm shadow-md shadow-indigo-500/20"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>New Note</span>
                </Link>
              </div>

              {/* Nav Links */}
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/" || pathname === "/dashboard"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold border-l-2 border-indigo-600"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User Footer in Drawer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                  {session?.user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {session?.user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2 w-full py-2 px-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-4 flex items-center justify-around shadow-lg">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-0.5 text-xs font-medium ${
            pathname === "/" || pathname === "/dashboard"
              ? "text-indigo-600 dark:text-indigo-400 font-bold"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>Notes</span>
        </Link>

        <Link
          href="/tasks"
          className={`flex flex-col items-center gap-0.5 text-xs font-medium ${
            pathname.startsWith("/tasks")
              ? "text-indigo-600 dark:text-indigo-400 font-bold"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          <span>Tasks</span>
        </Link>

        {/* Center Floating Indigo Plus Button */}
        <Link
          href="/dashboard?new=true"
          className="-mt-5 w-12 h-12 rounded-full bg-linear-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/35 hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </Link>

        <Link
          href="/projects"
          className={`flex flex-col items-center gap-0.5 text-xs font-medium ${
            pathname.startsWith("/projects")
              ? "text-indigo-600 dark:text-indigo-400 font-bold"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Briefcase className="w-5 h-5" />
          <span>Projects</span>
        </Link>

        <Link
          href="/goals"
          className={`flex flex-col items-center gap-0.5 text-xs font-medium ${
            pathname.startsWith("/goals")
              ? "text-indigo-600 dark:text-indigo-400 font-bold"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Target className="w-5 h-5" />
          <span>Goals</span>
        </Link>
      </nav>
    </>
  );
}
