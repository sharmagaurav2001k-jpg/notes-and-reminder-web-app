import React from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-600 selection:text-white">
      {/* Left Column: Ambient Showcase (Visible on Large Screens) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-linear-to-br from-indigo-950 via-slate-950 to-violet-950 text-white relative overflow-hidden border-r border-slate-800">
        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-white">
                RemindNotes
              </span>
              <span className="block text-[11px] text-indigo-400 font-bold tracking-wider uppercase">
                Pro Cloud Workspace
              </span>
            </div>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 space-y-8 my-auto max-w-lg">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Elevate your focus. <br />
              <span className="bg-linear-to-r from-indigo-400 via-sky-400 to-violet-300 bg-clip-text text-transparent">
                Never drop a priority.
              </span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Capture instant notes, schedule time-critical reminders, track multi-level vision goals, and manage Kanban tasks in one unified high-performance cloud hub.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Zap className="w-4 h-4" />
              </div>
              <span>Sub-100ms real-time cloud synchronization & PostgreSQL</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span>End-to-end security with Auth.js & encrypted credentials</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span>Kanban board, milestone progress rings & smart widgets</span>
            </div>
          </div>
        </div>

        {/* Footer Quote */}
        <div className="relative z-10 pt-6 border-t border-slate-800 text-xs text-slate-400">
          © 2026 RemindNotes Workspace. All rights reserved.
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="flex flex-col justify-between p-6 sm:p-12 md:p-16 relative">
        {/* Top Navbar: Mobile Logo & Theme Toggle */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-8">
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4 fill-white/20" />
            </div>
            <span className="font-bold text-base text-slate-900 dark:text-white">
              RemindNotes
            </span>
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Auth Form Card */}
        <div className="w-full max-w-md mx-auto my-auto">
          {children}
        </div>

        {/* Bottom helper */}
        <div className="w-full max-w-md mx-auto mt-8 text-center text-xs text-slate-400">
          Need help? Contact{" "}
          <a href="mailto:support@remindnotes.app" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            support@remindnotes.app
          </a>
        </div>
      </div>
    </div>
  );
}
