"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-850/80 backdrop-blur-sm">
      <button
        onClick={() => setTheme("light")}
        aria-label="Light theme"
        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
          theme === "light"
            ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        }`}
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        aria-label="Dark theme"
        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
          theme === "dark"
            ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        }`}
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        aria-label="System theme"
        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
          theme === "system"
            ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
            : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        }`}
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
}
