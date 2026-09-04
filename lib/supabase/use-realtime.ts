"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToTable, unsubscribeAll, RealtimePayload } from "@/lib/supabase/realtime";

/**
 * React hook to subscribe to realtime changes on a Supabase table.
 * Automatically unsubscribes on component unmount.
 *
 * @example
 * ```tsx
 * const { payload, isConnected } = useRealtime<Task>("Task", userId);
 *
 * useEffect(() => {
 *   if (payload?.eventType === "INSERT") {
 *     setTasks(prev => [...prev, payload.new as Task]);
 *   }
 * }, [payload]);
 * ```
 */
export function useRealtime<T = Record<string, unknown>>(
  table: string,
  userId: string,
  options?: {
    events?: RealtimeEvent[];
    filter?: (payload: RealtimePayload<T>) => boolean;
  },
) {
  const [payload, setPayload] = useState<RealtimePayload<T> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) return;

    const unsub = subscribeToTable<T>(
      table,
      userId,
      (p) => {
        if (options?.filter && !options.filter(p)) return;
        setPayload(p);
      },
      options?.events,
    );

    unsubscribeRef.current = unsub;
    setIsConnected(true);

    return () => {
      unsub();
      setIsConnected(false);
      unsubscribeRef.current = null;
    };
  }, [table, userId]);

  return { payload, isConnected };
}

/**
 * Hook to get live task count for the current user.
 * Updates in real-time when tasks are added/completed/deleted.
 */
export function useLiveTaskCount(userId: string) {
  const [count, setCount] = useState<number | null>(null);
  const { payload } = useRealtime("Task", userId);

  useEffect(() => {
    if (!payload) return;
    // Re-fetch count from API whenever a change happens
    // This is simpler than maintaining local count state
    fetch("/api/tasks?count=true")
      .then((r) => r.json())
      .then((data) => setCount(data.count ?? 0))
      .catch(() => {});
  }, [payload]);

  return count;
}
