import { supabaseBrowser } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: RealtimeEvent;
  new: T;
  old: T;
  schema: string;
  table: string;
  commit_timestamp: string;
}

/* ------------------------------------------------------------------ */
/* Channel Management                                                  */
/* ------------------------------------------------------------------ */

const activeChannels = new Map<string, RealtimeChannel>();

/**
 * Subscribe to realtime changes on a Postgres table.
 * Returns an unsubscribe function.
 *
 * Usage in React:
 * ```tsx
 * useEffect(() => {
 *   const unsub = subscribeToTable<Task>("Task", userId, (payload) => {
 *     if (payload.eventType === "INSERT") setTasks(prev => [...prev, payload.new as Task]);
 *   });
 *   return unsub;
 * }, []);
 * ```
 */
export function subscribeToTable<T = Record<string, unknown>>(
  table: string,
  userId: string,
  callback: (payload: RealtimePayload<T>) => void,
  events: RealtimeEvent[] = ["*"],
): () => void {
  const channelName = `realtime:${table}:${userId}`;

  // Don't duplicate channels
  if (activeChannels.has(channelName)) {
    const existing = activeChannels.get(channelName)!;
    existing.unsubscribe();
    activeChannels.delete(channelName);
  }

  const channel = supabaseBrowser
    .channel(channelName)
    .on<T>(
      "postgres_changes",
      {
        event: events.length === 1 && events[0] === "*" ? "*" : (events as any),
        schema: "public",
        table,
        filter: `userId=eq.${userId}`,
      },
      (payload: any) => {
        callback({
          eventType: payload.eventType as RealtimeEvent,
          new: payload.new as T,
          old: payload.old as T,
          schema: payload.schema,
          table: payload.table,
          commit_timestamp: payload.commit_timestamp,
        });
      },
    )
    .subscribe();

  activeChannels.set(channelName, channel);

  // Return unsubscribe function
  return () => {
    channel.unsubscribe();
    activeChannels.delete(channelName);
  };
}

/**
 * Subscribe to presence (who's online).
 * Great for collaborative features.
 */
export function subscribeToPresence(
  room: string,
  userId: string,
  userName: string,
  onPresenceChange: (states: Record<string, any>) => void,
): () => void {
  const channelName = `presence:${room}`;

  const channel = supabaseBrowser
    .channel(channelName)
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      onPresenceChange(state);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: userId, user_name: userName, online_at: new Date().toISOString() });
      }
    });

  activeChannels.set(channelName, channel);

  return () => {
    channel.unsubscribe();
    activeChannels.delete(channelName);
  };
}

/**
 * Cleanup all active channels (call on app unmount).
 */
export function unsubscribeAll() {
  for (const channel of activeChannels.values()) {
    channel.unsubscribe();
  }
  activeChannels.clear();
}
