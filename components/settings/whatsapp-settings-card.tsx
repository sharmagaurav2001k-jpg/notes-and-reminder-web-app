"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  Send,
  Bell,
  Sun,
  ShieldCheck,
  Trash2,
  Sparkles,
  KeyRound,
  RefreshCw,
  Info,
  QrCode,
  ExternalLink,
  Zap,
} from "lucide-react";

export function WhatsAppSettingsCard() {
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [whatsappNotifications, setWhatsappNotifications] = useState(true);
  const [whatsappDailyDigest, setWhatsappDailyDigest] = useState(true);
  const [isMetaConfigured, setIsMetaConfigured] = useState(false);

  // Magic Connect Details
  const [connectCode, setConnectCode] = useState<string>("");
  const [botPhone, setBotPhone] = useState<string>("15552045343");
  const [connectUrl, setConnectUrl] = useState<string>("");
  const [showQrCode, setShowQrCode] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(true);
  const [inputPhone, setInputPhone] = useState("");
  const [isDirectConnecting, setIsDirectConnecting] = useState(false);

  // Command Runner State
  const [testCommand, setTestCommand] = useState("today");
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [lastCommandReply, setLastCommandReply] = useState<string | null>(null);

  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load WhatsApp status
  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/user/whatsapp");
      if (res.ok) {
        const data = await res.json();
        setWhatsappNumber(data.whatsappNumber);
        setWhatsappVerified(data.whatsappVerified || false);
        setWhatsappNotifications(data.whatsappNotifications ?? true);
        setWhatsappDailyDigest(data.whatsappDailyDigest ?? true);
        setIsMetaConfigured(data.isMetaConfigured || false);
        setConnectCode(data.connectCode || "");
        setBotPhone(data.botPhone || "15552045343");
        setConnectUrl(data.connectUrl || "");
        if (data.whatsappNumber) {
          setInputPhone(`+${data.whatsappNumber}`);
        }
      }
    } catch (err) {
      console.error("Failed to load WhatsApp settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Poll for magic connection when on page and unverified
  useEffect(() => {
    if (whatsappVerified) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/user/whatsapp");
        if (res.ok) {
          const data = await res.json();
          if (data.whatsappVerified) {
            setWhatsappNumber(data.whatsappNumber);
            setWhatsappVerified(true);
            setSuccessMsg("🎉 WhatsApp connected successfully via Magic Link!");
            setTimeout(() => setSuccessMsg(null), 8000);
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [whatsappVerified]);

  // Direct 1-Click Connect (No OTP)
  const handleDirectConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPhone.trim() || isDirectConnecting) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsDirectConnecting(true);

    try {
      const res = await fetch("/api/user/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: inputPhone.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect phone number");
      }

      setWhatsappNumber(data.whatsappNumber);
      setWhatsappVerified(true);
      setSuccessMsg(`🎉 Connected successfully to +${data.whatsappNumber}!`);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to connect. Please check the number format.");
    } finally {
      setIsDirectConnecting(false);
    }
  };

  // Toggle Preferences
  const handleTogglePreference = async (field: "whatsappNotifications" | "whatsappDailyDigest") => {
    const newValue = field === "whatsappNotifications" ? !whatsappNotifications : !whatsappDailyDigest;

    if (field === "whatsappNotifications") setWhatsappNotifications(newValue);
    if (field === "whatsappDailyDigest") setWhatsappDailyDigest(newValue);

    setIsUpdatingPrefs(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
      });

      if (!res.ok) {
        throw new Error("Failed to update notification preferences");
      }

      setSuccessMsg("Preferences updated successfully");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Could not save preference");
      if (field === "whatsappNotifications") setWhatsappNotifications(!newValue);
      if (field === "whatsappDailyDigest") setWhatsappDailyDigest(!newValue);
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  // Send Test Reminder Message
  const handleSendTest = async () => {
    if (!whatsappNumber || isSendingTest) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSendingTest(true);

    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: whatsappNumber,
          type: "sample_reminder",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send test message");
      }

      setSuccessMsg(`Test reminder sent successfully to +${whatsappNumber}! Check your WhatsApp.`);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send test message");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Execute Command via Simulator
  const handleExecuteCommand = async (cmdToRun?: string) => {
    const cmd = (cmdToRun || testCommand).trim();
    if (!cmd || isExecutingCommand) return;

    setIsExecutingCommand(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setLastCommandReply(null);

    try {
      const res = await fetch("/api/whatsapp/simulate-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandText: cmd }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute command");
      }

      setLastCommandReply(data.replyText);
      setSuccessMsg(`Command executed & response delivered to +${whatsappNumber}! Check your WhatsApp.`);
      setTimeout(() => setSuccessMsg(null), 8000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute command");
    } finally {
      setIsExecutingCommand(false);
    }
  };

  // Unlink WhatsApp
  const handleUnlink = async () => {
    if (!window.confirm("Are you sure you want to unlink your WhatsApp number? You will no longer receive task reminders.")) {
      return;
    }

    setIsUnlinking(true);
    try {
      const res = await fetch("/api/user/whatsapp", { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg("WhatsApp number unlinked successfully.");
        setWhatsappNumber(null);
        setWhatsappVerified(false);
        setInputPhone("");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error("Failed to unlink WhatsApp:", err);
    } finally {
      setIsUnlinking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                WhatsApp 2-Way Reminders
              </h2>
              {whatsappVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Connected</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-3 h-3" />
                  <span>Not Connected</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Receive live task due alerts, morning digests, and create notes directly from WhatsApp.
            </p>
          </div>
        </div>

        {whatsappVerified && (
          <button
            type="button"
            onClick={handleUnlink}
            disabled={isUnlinking}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-all cursor-pointer"
          >
            {isUnlinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>Unlink WhatsApp</span>
          </button>
        )}
      </div>

      {/* Status Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3 text-emerald-800 dark:text-emerald-200 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-3 text-red-800 dark:text-red-200 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      {/* BODY */}
      {whatsappVerified ? (
        /* CONNECTED STATE */
        <div className="space-y-6">
          {/* Active Number Banner */}
          <div className="p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/60 via-emerald-50/20 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/10 dark:to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Active WhatsApp Number
                </p>
                <p className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                  +{whatsappNumber}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendTest}
              disabled={isSendingTest}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Reminder...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Reminder</span>
                </>
              )}
            </button>
          </div>

          {/* Preferences Toggles */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Notification Preferences
            </h3>

            {/* Toggle 1: Due Task Alerts */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Instant Task Reminders
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Get an instant WhatsApp notification when a scheduled task is due
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTogglePreference("whatsappNotifications")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  whatsappNotifications ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    whatsappNotifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Daily Digest */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Morning Daily Focus Digest
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Receive a clean 9:00 AM summary of all tasks and goals scheduled for today
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTogglePreference("whatsappDailyDigest")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  whatsappDailyDigest ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    whatsappDailyDigest ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Interactive WhatsApp Command Runner */}
          <div className="p-5 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/40 dark:from-indigo-950/20 dark:via-slate-950/40 dark:to-blue-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Interactive Command Tester (Sends Live to WhatsApp)
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                2-Way Live
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Click any quick command or type a custom command below to execute the DB action and deliver the live response to your WhatsApp!
            </p>

            {/* Quick Pills */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                { label: "📋 today", cmd: "today" },
                { label: "❓ help", cmd: "help" },
                { label: "🎯 goals", cmd: "goals" },
                { label: "📝 note Review UI", cmd: "note Review UI design and feedback" },
                { label: "⏰ remind me tomorrow", cmd: "remind me tomorrow at 5pm to call doctor" },
              ].map((item) => (
                <button
                  key={item.cmd}
                  type="button"
                  onClick={() => {
                    setTestCommand(item.cmd);
                    handleExecuteCommand(item.cmd);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-all cursor-pointer shadow-2xs"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Custom Command Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Type any command (e.g. note Buy domain, remind me at 6pm to drink water)"
                value={testCommand}
                onChange={(e) => setTestCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleExecuteCommand();
                  }
                }}
                className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => handleExecuteCommand()}
                disabled={!testCommand.trim() || isExecutingCommand}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
              >
                {isExecutingCommand ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Run & Send</span>
                  </>
                )}
              </button>
            </div>

            {/* Last Reply Preview */}
            {lastCommandReply && (
              <div className="mt-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Delivered to WhatsApp:
                </p>
                {lastCommandReply}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* UNVERIFIED / CONNECT NUMBER FLOW */
        <div className="space-y-6">
          {/* PRIMARY OPTION 1: 1-Click Magic Link (Zero OTP!) */}
          <div className="p-6 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>⚡ 1-Click Connect with WhatsApp</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold">
                      Recommended • No OTP
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Click the button below to open WhatsApp with your unique 1-tap verification code.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={connectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open WhatsApp & Connect (Code: {connectCode || "..."})</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-500 text-xs font-semibold transition-all cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>{showQrCode ? "Hide QR Code" : "Scan QR Code on Phone"}</span>
              </button>
            </div>

            {/* QR Code Container */}
            {showQrCode && connectUrl && (
              <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2.5 text-center animate-in fade-in">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Scan with your phone camera to connect:
                </p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(connectUrl)}`}
                  alt="WhatsApp Connect QR Code"
                  className="w-36 h-36 rounded-lg border border-slate-200 dark:border-slate-800 p-1 bg-white"
                />
                <p className="text-[11px] font-mono text-slate-400">
                  Unique Code: <span className="font-bold text-emerald-600">{connectCode}</span>
                </p>
              </div>
            )}
          </div>

          {/* DIVIDER */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              OR CONNECT MANUALLY WITHOUT OTP
            </span>
          </div>

          {/* SECONDARY OPTION 2: Manual Direct Connect */}
          <form onSubmit={handleDirectConnect} className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Mobile Number with Country Code
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210 (or 919876543210)"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Include country calling code (e.g. +91 for India, +1 for USA/Canada). Saves directly without sending OTP.
              </p>
            </div>

            <button
              type="submit"
              disabled={!inputPhone.trim() || isDirectConnecting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-md disabled:opacity-50 transition-all cursor-pointer"
            >
              {isDirectConnecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Save & Connect Directly</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
