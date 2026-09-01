"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  KeyRound,
} from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      // TODO: Connect to a real password reset backend (e.g., NextAuth email provider, SendGrid, Resend)
      // Currently this is a UI-only stub — no actual reset email is sent.
      // See: https://next-auth.js.org/configuration/providers/email
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
    } catch {
      // Handle error if needed
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to Login link */}
      <div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      {isSubmitted ? (
        /* Success Confirmation State */
        <div className="p-6 sm:p-8 rounded-3xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/30 text-center space-y-4 animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Check your inbox
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
              We have sent a password reset link to{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {submittedEmail}
              </span>
              . Follow the link in the email to reset your password.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setIsSubmitted(false)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Didn&apos;t receive the email? Try again
            </button>
          </div>
        </div>
      ) : (
        /* Form State */
        <>
          <div className="space-y-2 text-center sm:text-left">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <KeyRound className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Reset Password
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter your registered email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  {...register("email")}
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all ${
                    errors.email
                      ? "border-red-500 focus:ring-2 focus:ring-red-500/30"
                      : "border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-red-500 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none transition-all cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending instructions...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading...</span>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
