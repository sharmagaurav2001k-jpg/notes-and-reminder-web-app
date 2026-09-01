"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { User as UserIcon, LogOut, Settings, ChevronDown } from "lucide-react";

export function UserNav() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0].toUpperCase() || "U";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all w-full text-left cursor-pointer shadow-2xs"
      >
        <div className="w-9 h-9 rounded-full bg-linear-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name || "Avatar"}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 hidden md:block">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {user?.name || "User"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {user?.email || "user@example.com"}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 hidden md:block ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Signed in as</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {user?.email}
            </p>
          </div>

          <div className="py-1 space-y-0.5">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              Settings & Profile
            </Link>
          </div>

          <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl w-full text-left transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
