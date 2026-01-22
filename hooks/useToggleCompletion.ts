import { useState } from "react";
import { TaskCompletion, ApiResponse } from "@/types";

export function useToggleCompletion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markComplete = async (data: {
    scheduleId: string;
    periodStart: string;
    periodEnd: string;
    deadlineType: string;
    notes?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      // Get CSRF token
      const csrfResponse = await fetch("/api/csrf", {
        credentials: "include",
        cache: "no-store",
      });

      if (!csrfResponse.ok) {
        throw new Error(`Failed to get CSRF token: HTTP ${csrfResponse.status}`);
      }

      const csrfData: ApiResponse<{ csrfToken: string }> = await csrfResponse.json();

      if (!csrfData.success || !csrfData.data) {
        throw new Error("Failed to get CSRF token: " + (csrfData.error || "Unknown error"));
      }

      // Mark task as complete
      const response = await fetch("/api/completions", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfData.data.csrfToken,
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<TaskCompletion> = await response.json();

      if (!response.ok || !result.success || !result.data) {
        const errorMsg = result.error || result.message || `HTTP ${response.status}: Failed to mark task as complete`;
        setError(errorMsg);
        return null;
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const markIncomplete = async (completionId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get CSRF token
      const csrfResponse = await fetch("/api/csrf", {
        credentials: "include",
        cache: "no-store",
      });

      if (!csrfResponse.ok) {
        throw new Error(`Failed to get CSRF token: HTTP ${csrfResponse.status}`);
      }

      const csrfData: ApiResponse<{ csrfToken: string }> = await csrfResponse.json();

      if (!csrfData.success || !csrfData.data) {
        throw new Error("Failed to get CSRF token: " + (csrfData.error || "Unknown error"));
      }

      // Delete completion
      const response = await fetch(`/api/completions/${completionId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfData.data.csrfToken,
        },
      });

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || result.message || `HTTP ${response.status}: Failed to uncheck task`;
        setError(errorMsg);
        return false;
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
    markComplete,
    markIncomplete,
    loading,
    error,
  };
}
