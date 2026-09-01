"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  User,
  Mail,
  Sun,
  Moon,
  Monitor,
  Globe,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Shield,
  Save,
  Clock,
  Database,
} from "lucide-react";

import { WhatsAppSettingsCard } from "@/components/settings/whatsapp-settings-card";

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST - UTC+5:30)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New York (EST - UTC-5:00)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST - UTC-8:00)" },
  { value: "America/Chicago", label: "America/Chicago (CST - UTC-6:00)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST - UTC+0:00)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET - UTC+1:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST - UTC+4:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT - UTC+8:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST - UTC+9:00)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST - UTC+10:00)" },
];

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">("system");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notesCount, setNotesCount] = useState<number>(0);
  const [createdAt, setCreatedAt] = useState<string>("");

  // Load user profile from DB
  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          const user = data.user;
          setName(user.name || "");
          setEmail(user.email || "");
          setAvatarUrl(user.avatarUrl || "");
          setTimezone(user.timezone || "UTC");
          if (user.theme) {
            setSelectedTheme(user.theme as "light" | "dark" | "system");
            setTheme(user.theme);
          }
          setNotesCount(user._count?.notes || 0);
          if (user.createdAt) {
            setCreatedAt(new Date(user.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }));
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [setTheme]);

  // Handle Theme Change
  const handleThemeSelect = async (newTheme: "light" | "dark" | "system") => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);

    // Persist immediately to Database
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });
      await updateSession({ theme: newTheme });
    } catch (e) {
      console.error("Failed to sync theme to DB:", e);
    }
  };

  // Handle Form Submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          avatarUrl: avatarUrl.trim() || null,
          timezone,
          theme: selectedTheme,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to update profile settings.");
        return;
      }

      // Update Client Session
      await updateSession({
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || null,
        timezone,
        theme: selectedTheme,
      });

      setSuccessMessage("Settings saved successfully and synced across all your devices!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = name
    ? name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "U";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm font-medium">Loading your profile preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Account Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your personal profile, regional timezone, and cross-device display preferences.
        </p>
      </div>

      {/* Success / Error Notification */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-sm font-medium animate-in fade-in duration-200 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 text-sm font-medium animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Personal Profile */}
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Personal Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your public identity across notes and workspaces
              </p>
            </div>
          </div>

          {/* Avatar Preview & URL */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-md overflow-hidden border-2 border-white dark:border-slate-800">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={name || "Avatar"}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarUrl("")}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
            </div>

            <div className="flex-1 w-full space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Avatar Image URL (Optional)
              </label>
              <div className="relative">
                <Camera className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or https://github.com/..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Paste any direct image URL (Unsplash, Gravatar, GitHub, etc.) to customize your profile picture.
              </p>
            </div>
          </div>

          {/* Name & Email Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-850/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Email address is linked to your primary account authentication.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Appearance & Cross-Device Theme Preference */}
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Display & Theme Preference
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Saved directly to PostgreSQL database to keep your theme in sync across all devices
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DB Synced</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Light Option */}
            <button
              type="button"
              onClick={() => handleThemeSelect("light")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-32 ${selectedTheme === "light"
                  ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm ring-2 ring-indigo-500/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30"
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Sun className="w-4 h-4" />
                </div>
                {selectedTheme === "light" && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Light Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Crisp clean light background</p>
              </div>
            </button>

            {/* Dark Option */}
            <button
              type="button"
              onClick={() => handleThemeSelect("dark")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-32 ${selectedTheme === "dark"
                  ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm ring-2 ring-indigo-500/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30"
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Moon className="w-4 h-4" />
                </div>
                {selectedTheme === "dark" && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Dark Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sleek, eye-friendly dark palette</p>
              </div>
            </button>

            {/* System Option */}
            <button
              type="button"
              onClick={() => handleThemeSelect("system")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-32 ${selectedTheme === "system"
                  ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm ring-2 ring-indigo-500/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30"
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <Monitor className="w-4 h-4" />
                </div>
                {selectedTheme === "system" && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">System Match</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Matches device OS theme</p>
              </div>
            </button>
          </div>
        </div>

        {/* Section 3: Timezone & Regional Localization */}
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Timezone & Regional Schedule
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ensures reminders trigger precisely at your local time
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Select Your Primary Timezone
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400">
              Current local time: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({timezone})
            </p>
          </div>
        </div>

        {/* Save Changes Floating Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Preferences</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Section 4: WhatsApp Integration & Verification */}
      <WhatsAppSettingsCard />

      {/* Section 5: Account Summary & Cloud Status */}
      <div className="p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 backdrop-blur-xl shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            <p className="text-xs text-slate-400">Total Notes Stored</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{notesCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            <p className="text-xs text-slate-400">Member Since</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{createdAt || "Today"}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            <p className="text-xs text-slate-400">Database Connection</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center justify-center sm:justify-start gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              PostgreSQL (Supabase)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
