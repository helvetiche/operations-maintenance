import { useState } from "react";
import { Schedule, ApiResponse, ScheduleDeadline, ReminderDate } from "@/types";

interface CreateScheduleData {
  title: string;
  description: string;
  deadline: ScheduleDeadline;
  reminderDate: ReminderDate;
  personAssigned: string;
  personEmail: string;
  status?: "active" | "inactive";
  hideFromCalendar?: boolean;
}

interface UseCreateScheduleResult {
  createSchedule: (data: CreateScheduleData) => Promise<Schedule | null>;
  loading: boolean;
  error: string | null;
}

export const useCreateSchedule = (): UseCreateScheduleResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSchedule = async (data: CreateScheduleData): Promise<Schedule | null> => {
    try {
      setLoading(true);
      setError(null);

      // Get CSRF token
      const csrfResponse = await fetch("/api/csrf", {
        credentials: "include",
        cache: "no-store", // Ensure fresh token
      });
      
      if (!csrfResponse.ok) {
        throw new Error(`Failed to get CSRF token: HTTP ${csrfResponse.status}`);
      }
      
      const csrfData: ApiResponse<{ csrfToken: string }> = await csrfResponse.json();
      
      if (!csrfData.success || !csrfData.data) {
        throw new Error("Failed to get CSRF token: " + (csrfData.error || "Unknown error"));
      }

      const response = await fetch("/api/schedules", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfData.data.csrfToken,
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<{ schedule: Schedule }> = await response.json();

      if (!response.ok || !result.success || !result.data) {
        const errorMsg = result.error || result.message || `HTTP ${response.status}: Failed to create schedule`;
        console.error("Schedule creation error:", {
          status: response.status,
          error: result.error,
          message: result.message,
          result,
        });
        throw new Error(errorMsg);
      }

      return result.data.schedule;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createSchedule,
    loading,
    error,
  };
};
