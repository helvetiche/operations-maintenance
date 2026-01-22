import { useState, useEffect } from "react";
import { TaskCompletion } from "@/types";
import { apiClient } from "@/lib/api-client";

interface UseCompletionsOptions {
  scheduleId?: string;
  startDate?: string;
  endDate?: string;
  autoFetch?: boolean;
}

export function useCompletions(options: UseCompletionsOptions = {}) {
  const { scheduleId, startDate, endDate, autoFetch = true } = options;
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompletions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (scheduleId) params.append("scheduleId", scheduleId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await apiClient.get<TaskCompletion[]>(
        `/completions?${params.toString()}`
      );

      if (response.success && response.data) {
        setCompletions(response.data);
      } else {
        setError(response.error || "Failed to fetch completions");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchCompletions();
    }
  }, [scheduleId, startDate, endDate, autoFetch]);

  return {
    completions,
    loading,
    error,
    refetch: fetchCompletions,
  };
}
