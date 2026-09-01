"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Search, Bell, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Top Header & Drawer & Bottom Nav */}
      <MobileNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 h-16 border-b border-slate-200/60 dark:border-slate-850/60 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md sticky top-0 z-30">
          {/* Global Search Bar */}
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search notes, reminders, tags... (Press ⌘K)"
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/reminders"
              className="relative p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors shadow-2xs"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Welcome back,{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {session?.user?.name?.split(" ")[0] || "User"}
              </span>
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
