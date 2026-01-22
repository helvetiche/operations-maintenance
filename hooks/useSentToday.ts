"use client";

import { useState } from "react";
import { ApiResponse } from "@/types";

interface SentTodayData {
  [scheduleId: string]: string; // scheduleId -> sentAt ISO timestamp
}

interface UseSentTodayResult {
  sentToday: SentTodayData;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch today's sent reminders
 * OPTIMIZED: Doesn't auto-fetch to avoid blocking page load
 * Call refetch() manually when needed, or let it load in background
 */
export const useSentToday = (): UseSentTodayResult => {
  const [sentToday, setSentToday] = useState<SentTodayData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSentToday = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/schedules/sent-today", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data: ApiResponse<{ sentToday: SentTodayData }> = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to fetch sent reminders");
      }

      setSentToday(data.data.sentToday);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSentToday({});
    } finally {
      setLoading(false);
    }
  };

  // Don't auto-fetch - let parent component decide when to load
  // This prevents blocking the initial page load

  return {
    sentToday,
    loading,
    error,
    refetch: fetchSentToday,
  };
};
