"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50),
    email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    timezone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userTimezone, setUserTimezone] = useState("UTC");

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setUserTimezone(tz);
    } catch {
      setUserTimezone("UTC");
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      timezone: "UTC",
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      setIsLoading(true);
      setServerError(null);

      // Call signup API
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.toLowerCase().trim(),
          password: data.password,
          timezone: userTimezone,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        setServerError(responseData.error || "Failed to create account. Please try again.");
        return;
      }

      // Automatically log the user in
      const loginResult = await signIn("credentials", {
        email: data.email.toLowerCase().trim(),
        password: data.password,
        redirect: false,
      });

      if (loginResult?.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push("/login?message=Account created successfully! Please sign in.");
      }
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Create Account
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Join thousands of productive thinkers organizing notes & reminders.
        </p>
      </div>

      {/* Server Error Alert Banner */}
      {serverError && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1 font-medium">{serverError}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {/* Full Name Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Karan Sharma"
              {...register("name")}
              disabled={isLoading}
              className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all ${
                errors.name
                  ? "border-red-500 focus:ring-2 focus:ring-red-500/30"
                  : "border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              }`}
            />
          </div>
          {errors.name && (
            <p className="text-xs font-medium text-red-500 dark:text-red-400">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              placeholder="karan@example.com"
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

        {/* Password Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="At least 6 characters"
              {...register("password")}
              disabled={isLoading}
              className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all ${
                errors.password
                  ? "border-red-500 focus:ring-2 focus:ring-red-500/30"
                  : "border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs font-medium text-red-500 dark:text-red-400">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              {...register("confirmPassword")}
              disabled={isLoading}
              className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all ${
                errors.confirmPassword
                  ? "border-red-500 focus:ring-2 focus:ring-red-500/30"
                  : "border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs font-medium text-red-500 dark:text-red-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none transition-all cursor-pointer mt-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating your account...</span>
            </>
          ) : (
            <>
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer link to login */}
      <div className="text-center pt-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading signup form...</span>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
