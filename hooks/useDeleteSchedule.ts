import { useState } from "react";
import { ApiResponse } from "@/types";

interface UseDeleteScheduleResult {
  deleteSchedule: (id: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const useDeleteSchedule = (): UseDeleteScheduleResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSchedule = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Get CSRF token
      const csrfResponse = await fetch("/api/csrf", {
        credentials: "include",
      });
      const csrfData: ApiResponse<{ csrfToken: string }> = await csrfResponse.json();
      
      if (!csrfData.success || !csrfData.data) {
        throw new Error("Failed to get CSRF token");
      }

      const response = await fetch(`/api/schedules/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfData.data.csrfToken,
        },
      });

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to delete schedule");
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteSchedule,
    loading,
    error,
  };
};
