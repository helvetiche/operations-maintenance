import { useState, useEffect } from "react";
import { Schedule, ApiResponse } from "@/types";

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface UseSchedulesResult {
  schedules: Schedule[];
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo | null;
  refetch: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  addSchedule: (schedule: Schedule) => void;
  updateScheduleInList: (schedule: Schedule) => void;
  removeSchedule: (id: string) => void;
}

export const useSchedules = (limit: number = 6): UseSchedulesResult => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSchedules = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/schedules?limit=${limit}&page=${page}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data: ApiResponse<{ schedules: Schedule[]; pagination: PaginationInfo }> = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to fetch schedules");
      }

      setSchedules(data.data?.schedules || []);
      setPagination(data.data?.pagination || null);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = async (page: number) => {
    await fetchSchedules(page);
  };

  const addSchedule = (schedule: Schedule) => {
    setSchedules((prev) => [schedule, ...prev]);
    if (pagination) {
      setPagination({
        ...pagination,
        totalCount: pagination.totalCount + 1,
        totalPages: Math.ceil((pagination.totalCount + 1) / limit),
      });
    }
  };

  const updateScheduleInList = (schedule: Schedule) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === schedule.id ? schedule : s))
    );
  };

  const removeSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    if (pagination) {
      const newTotal = pagination.totalCount - 1;
      const newTotalPages = Math.ceil(newTotal / limit);
      setPagination({
        ...pagination,
        totalCount: newTotal,
        totalPages: newTotalPages,
        hasNextPage: currentPage < newTotalPages,
      });
    }
  };

  const refetch = async () => {
    await fetchSchedules(currentPage);
  };

  useEffect(() => {
    fetchSchedules(1);
  }, []);

  return {
    schedules,
    loading,
    error,
    pagination,
    refetch,
    goToPage,
    addSchedule,
    updateScheduleInList,
    removeSchedule,
  };
};
