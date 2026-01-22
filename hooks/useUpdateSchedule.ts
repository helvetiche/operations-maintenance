import { useState } from "react";
import { Schedule, ApiResponse, ScheduleDeadline, ReminderDate } from "@/types";

interface UpdateScheduleData {
  title?: string;
  description?: string;
  deadline?: ScheduleDeadline;
  reminderDate?: ReminderDate;
  personAssigned?: string;
  personEmail?: string;
  status?: "active" | "inactive";
  hideFromCalendar?: boolean;
}

interface UseUpdateScheduleResult {
  updateSchedule: (id: string, data: UpdateScheduleData) => Promise<Schedule | null>;
  loading: boolean;
  error: string | null;
}

export const useUpdateSchedule = (): UseUpdateScheduleResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSchedule = async (
    id: string,
    data: UpdateScheduleData
  ): Promise<Schedule | null> => {
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
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfData.data.csrfToken,
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<{ schedule: Schedule }> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to update schedule");
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
    updateSchedule,
    loading,
    error,
  };
};
