import { useState } from "react";

interface SyncCacheResult {
  reminderCount: number;
  syncedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export const useSyncCache = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncCache = async (): Promise<SyncCacheResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/schedules/sync-cache", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result: ApiResponse<SyncCacheResult> = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to sync cache");
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sync cache";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syncCache,
    isLoading,
    error,
  };
};
