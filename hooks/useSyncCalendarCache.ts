import { useState } from "react";

interface SyncCalendarCacheResult {
  scheduleCount: number;
  message: string;
}

interface UseSyncCalendarCacheResult {
  syncCalendarCache: () => Promise<SyncCalendarCacheResult | null>;
  isLoading: boolean;
  error: string | null;
}

export const useSyncCalendarCache = (): UseSyncCalendarCacheResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncCalendarCache = async (): Promise<SyncCalendarCacheResult | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/calendar/sync-cache", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to sync calendar cache");
      }

      return data.data as SyncCalendarCacheResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syncCalendarCache,
    isLoading,
    error,
  };
};
