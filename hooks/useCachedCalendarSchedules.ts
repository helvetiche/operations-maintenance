import { useState, useEffect } from "react";
import { Schedule } from "@/types";

interface CachedCalendarData {
  schedules: Schedule[];
  cacheExists: boolean;
  lastSynced?: string;
  scheduleCount?: number;
  message?: string;
}

interface UseCachedCalendarSchedulesResult {
  schedules: Schedule[];
  loading: boolean;
  error: string | null;
  cacheExists: boolean;
  lastSynced?: Date;
  scheduleCount?: number;
  refetch: () => Promise<void>;
}

export const useCachedCalendarSchedules = (): UseCachedCalendarSchedulesResult => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheExists, setCacheExists] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | undefined>();
  const [scheduleCount, setScheduleCount] = useState<number | undefined>();

  const fetchCachedSchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/calendar/cached", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to fetch cached calendar schedules");
      }

      const cachedData = data.data as CachedCalendarData;

      setSchedules(cachedData.schedules || []);
      setCacheExists(cachedData.cacheExists);
      setLastSynced(cachedData.lastSynced ? new Date(cachedData.lastSynced) : undefined);
      setScheduleCount(cachedData.scheduleCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSchedules([]);
      setCacheExists(false);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchCachedSchedules();
  };

  useEffect(() => {
    fetchCachedSchedules();
  }, []);

  return {
    schedules,
    loading,
    error,
    cacheExists,
    lastSynced,
    scheduleCount,
    refetch,
  };
};
