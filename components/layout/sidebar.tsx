"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  CheckSquare,
  Target,
  Briefcase,
  Bell,
  Star,
  Archive,
  Settings,
  Plus,
  Sparkles,
} from "lucide-react";
import { UserNav } from "@/components/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  {
    label: "All Notes",
    href: "/dashboard",
    icon: FileText,
    badge: null,
  },
  {
    label: "Tasks & Todos",
    href: "/tasks",
    icon: CheckSquare,
    badge: "Kanban",
  },
  {
    label: "Projects",
    href: "/projects",
    icon: Briefcase,
    badge: "Pro",
  },
  {
    label: "Goals & Vision",
    href: "/goals",
    icon: Target,
    badge: "Track",
  },
  {
    label: "Reminders",
    href: "/reminders",
    icon: Bell,
    badge: "Active",
  },
  {
    label: "Favorites",
    href: "/favorites",
    icon: Star,
    badge: null,
  },
  {
    label: "Archive",
    href: "/archive",
    icon: Archive,
    badge: null,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    badge: null,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen border-r border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shrink-0 transition-all duration-300 sticky top-0">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-slate-100 dark:border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <span className="font-bold text-base bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-slate-200 bg-clip-text text-transparent">
              RemindNotes
            </span>
            <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 font-bold tracking-wider uppercase">
              Pro Workspace
            </span>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      {/* Quick Action Button */}
      <div className="p-4">
        <Link
          href="/dashboard?new=true"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create New Note</span>
        </Link>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Workspace
        </p>
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
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold border-l-3 border-indigo-600 dark:border-indigo-500 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive
                      ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <UserNav />
      </div>
    </aside>
  );
}
