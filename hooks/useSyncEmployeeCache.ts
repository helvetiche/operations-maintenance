import { useState } from "react";

interface SyncEmployeeCacheResult {
  employeeCount: number;
  message: string;
}

interface UseSyncEmployeeCacheResult {
  syncEmployeeCache: () => Promise<SyncEmployeeCacheResult | null>;
  isLoading: boolean;
  error: string | null;
}

export const useSyncEmployeeCache = (): UseSyncEmployeeCacheResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncEmployeeCache = async (): Promise<SyncEmployeeCacheResult | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/employees/sync-cache", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to sync employee cache");
      }

      return data.data as SyncEmployeeCacheResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syncEmployeeCache,
    isLoading,
    error,
  };
};
