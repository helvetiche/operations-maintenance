"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Schedule, ScheduleDeadline, ReminderDate } from "@/types";
import { groupSchedulesByDate, getFirstDayOfMonth, getDaysInMonth, formatDateKey } from "@/lib/calendar-utils";
import { calculateNextDeadline, calculateReminderDate } from "@/lib/deadline-calculator";
import { CaretLeft, CaretRight, Calendar as CalendarIcon, X, Envelope, MagnifyingGlass, Funnel } from "phosphor-react";
import { useCachedCalendarSchedules } from "@/hooks/useCachedCalendarSchedules";
import { ToastContainer, ToastType } from "../ui/Toast";
import { CalendarViewSkeleton } from "./CalendarViewSkeleton";
import { Alert } from "../ui/Alert";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CalendarViewProps {
  // No longer needs schedules prop - will fetch from cache
}

interface CalendarDay {
  day: number;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_OF_WEEK_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatTimeTo12Hour = (time: string): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const getOrdinalSuffix = (n: number): string => {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const formatReminder = (reminderDate: ReminderDate): string => {
  const daysBefore = reminderDate.daysBefore ?? 1; // Use nullish coalescing to allow 0
  const timeStr = reminderDate.time ? ` at ${formatTimeTo12Hour(reminderDate.time)}` : "";
  
  if (daysBefore === 0) {
    return `Same day${timeStr}`;
  }
  
  return `${daysBefore} day${daysBefore !== 1 ? "s" : ""} before deadline${timeStr}`;
};

const formatUpcomingDate = (deadline: ScheduleDeadline): string => {
  const { days, hours } = calculateTimeUntilDeadline(deadline);
  
  if (days === 0 && hours < 24) {
    if (hours === 0) {
      return "today";
    }
    return hours === 1 ? "in 1 hour" : `in ${hours} hours`;
  }
  
  if (days === 1) {
    return "tomorrow";
  }
  
  if (days < 7) {
    return `next ${days} days`;
  }
  
  if (days < 14) {
    return "next week";
  }
  
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "next week" : `next ${weeks} weeks`;
  }
  
  if (days < 60) {
    return "next month";
  }
  
  const months = Math.floor(days / 30);
  return months === 1 ? "next month" : `next ${months} months`;
};

const calculateTimeUntilDeadline = (deadline: ScheduleDeadline): { days: number; hours: number } => {
  const now = new Date();
  
  let targetHour = 14;
  let targetMinute = 0;
  if (deadline.time) {
    const [hours, minutes] = deadline.time.split(":").map(Number);
    targetHour = hours || 14;
    targetMinute = minutes || 0;
  }
  
  let nextDeadline: Date;
  
  switch (deadline.type) {
    case "daily": {
      nextDeadline = new Date(now);
      nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      if (nextDeadline <= now) {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      }
      break;
    }
    case "weekly": {
      const targetDay = deadline.dayOfWeek || 0;
      const currentDay = now.getDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0) {
        nextDeadline = new Date(now);
        nextDeadline.setHours(targetHour, targetMinute, 0, 0);
        if (nextDeadline <= now) {
          daysUntil = 7;
        }
      }
      if (daysUntil > 0) {
        nextDeadline = new Date(now);
        nextDeadline.setDate(nextDeadline.getDate() + daysUntil);
        nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      } else {
        nextDeadline = new Date(now);
        nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      }
      break;
    }
    case "monthly": {
      const targetDay = deadline.dayOfMonth || 1;
      nextDeadline = new Date(now.getFullYear(), now.getMonth(), targetDay, targetHour, targetMinute, 0, 0);
      if (nextDeadline <= now) {
        nextDeadline.setMonth(nextDeadline.getMonth() + 1);
      }
      break;
    }
    case "monthly-specific": {
      const targetMonth = (deadline.month || 1) - 1;
      const targetDay = deadline.day || 1;
      nextDeadline = new Date(now.getFullYear(), targetMonth, targetDay, targetHour, targetMinute, 0, 0);
      if (nextDeadline <= now) {
        nextDeadline.setFullYear(nextDeadline.getFullYear() + 1);
      }
      break;
    }
    case "interval": {
      const days = deadline.days || 1;
      nextDeadline = new Date(now);
      nextDeadline.setDate(nextDeadline.getDate() + days);
      nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      break;
    }
    case "custom":
    default: {
      nextDeadline = new Date(now);
      nextDeadline.setDate(nextDeadline.getDate() + 30);
      nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      break;
    }
  }
  
  const diffMs = nextDeadline.getTime() - now.getTime();
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  
  return { days: Math.max(0, days), hours: Math.max(0, hours) };
};

const getDeadlineDate = (deadline: ScheduleDeadline): Date => {
  const now = new Date();
  
  let targetHour = 14;
  let targetMinute = 0;
  if (deadline.time) {
    const [hours, minutes] = deadline.time.split(":").map(Number);
    targetHour = hours || 14;
    targetMinute = minutes || 0;
  }
  
  let nextDeadline: Date;
  
  switch (deadline.type) {
    case "daily": {
      nextDeadline = new Date(now);
      nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      if (nextDeadline <= now) {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      }
      break;
    }
    case "weekly": {
      const targetDay = deadline.dayOfWeek || 0;
      const currentDay = now.getDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0) {
        nextDeadline = new Date(now);
        nextDeadline.setHours(targetHour, targetMinute, 0, 0);
        if (nextDeadline <= now) {
          daysUntil = 7;
        }
      }
      if (daysUntil > 0) {
        nextDeadline = new Date(now);
        nextDeadline.setDate(nextDeadline.getDate() + daysUntil);
        nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      } else {
        nextDeadline = new Date(now);
        nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      }
      break;
    }
    case "monthly": {
      const targetDay = deadline.dayOfMonth || 1;
      nextDeadline = new Date(now.getFullYear(), now.getMonth(), targetDay, targetHour, targetMinute, 0, 0);
      if (nextDeadline <= now) {
        nextDeadline.setMonth(nextDeadline.getMonth() + 1);
      }
      break;
    }
    case "monthly-specific": {
      const targetMonth = (deadline.month || 1) - 1;
      const targetDay = deadline.day || 1;
      nextDeadline = new Date(now.getFullYear(), targetMonth, targetDay, targetHour, targetMinute, 0, 0);
      if (nextDeadline <= now) {
        nextDeadline.setFullYear(nextDeadline.getFullYear() + 1);
      }
      break;
    }
    case "interval": {
      const days = deadline.days || 1;
      nextDeadline = new Date(now);
      nextDeadline.setDate(nextDeadline.getDate() + days);
      nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      break;
    }
    case "custom":
    default: {
      nextDeadline = new Date(now);
      nextDeadline.setDate(nextDeadline.getDate() + 30);
      nextDeadline.setHours(targetHour, targetMinute, 0, 0);
      break;
    }
  }
  
  return nextDeadline;
};

const formatDeadlineDate = (deadline: ScheduleDeadline): string => {
  const deadlineDate = getDeadlineDate(deadline);
  const day = deadlineDate.getDate();
  const month = MONTHS[deadlineDate.getMonth()];
  const year = deadlineDate.getFullYear();
  
  return `Deadline: ${day}${getOrdinalSuffix(day)} of ${month}, ${year}`;
};

const calculateTimeUntilReminderEmail = (
  deadline: ScheduleDeadline,
  reminderDate: ReminderDate,
  createdAt: string | undefined,
  currentTime: Date
): { days: number; hours: number; minutes: number; seconds: number; reminderDate: Date; totalMs: number } => {
  // Keep finding the next reminder date until we get one in the future
  let nextDeadline = calculateNextDeadline(deadline, currentTime, createdAt);
  let reminderEmailDate = calculateReminderDate(reminderDate, nextDeadline);
  
  // If reminder date has passed, keep calculating next cycles until we find one in the future
  // Use a safety counter to prevent infinite loops
  let iterations = 0;
  const maxIterations = 100;
  
  while (reminderEmailDate <= currentTime && iterations < maxIterations) {
    // Calculate next deadline from the current deadline (not the reminder date)
    nextDeadline = calculateNextDeadline(deadline, nextDeadline, createdAt);
    reminderEmailDate = calculateReminderDate(reminderDate, nextDeadline);
    iterations++;
  }
  
  const diffMs = reminderEmailDate.getTime() - currentTime.getTime();
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;
  
  return { 
    days: Math.max(0, days), 
    hours: Math.max(0, hours),
    minutes: Math.max(0, minutes),
    seconds: Math.max(0, seconds),
    reminderDate: reminderEmailDate,
    totalMs: Math.max(0, diffMs)
  };
};

export const CalendarView = ({ }: CalendarViewProps) => {
  // Fetch cached schedules
  const { schedules, loading, error, cacheExists, lastSynced } = useCachedCalendarSchedules();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<Schedule[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<{ x: number; y: number } | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [typeFilter, setTypeFilter] = useState<"all" | "daily" | "weekly" | "monthly" | "other">("all");
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Track if component is mounted for portal
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Update current time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Filter schedules based on search and filters
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      // Status filter
      if (statusFilter !== "all" && schedule.status !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== "all") {
        if (typeFilter === "other") {
          if (["daily", "weekly", "monthly", "monthly-specific"].includes(schedule.deadline.type)) {
            return false;
          }
        } else if (schedule.deadline.type !== typeFilter) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          schedule.title.toLowerCase().includes(query) ||
          schedule.description.toLowerCase().includes(query) ||
          schedule.personAssigned.toLowerCase().includes(query) ||
          schedule.personEmail.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [schedules, searchQuery, statusFilter, typeFilter]);

  // Group schedules by date for the current month
  const schedulesByDate = useMemo(() => {
    return groupSchedulesByDate(filteredSchedules.filter(s => !s.hideFromCalendar), year, month);
  }, [filteredSchedules, year, month]);

  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  const handleCloseModal = useCallback(() => {
    setSelectedDate(null);
    setSelectedSchedules([]);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedDate) {
        if (e.key === "Escape") {
          handleCloseModal();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDate, handleCloseModal]);

  // Focus trap in modal
  useEffect(() => {
    if (selectedDate && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      modalRef.current.addEventListener("keydown", handleTab);
      firstElement?.focus();

      return () => {
        modalRef.current?.removeEventListener("keydown", handleTab);
      };
    }
  }, [selectedDate]);

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
    setSelectedSchedules([]);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
    setSelectedSchedules([]);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(null);
    setSelectedSchedules([]);
  };

  const handleDateClick = (dateKey: string) => {
    const schedulesForDate = schedulesByDate.get(dateKey) || [];
    setSelectedDate(dateKey);
    setSelectedSchedules(schedulesForDate);
  };

  // Generate calendar days
  const calendarDays: CalendarDay[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    const day = daysInPrevMonth - firstDayOfMonth + i + 1;
    const dateKey = formatDateKey(new Date(prevYear, prevMonth, day));
    calendarDays.push({ day, dateKey, isCurrentMonth: false, isToday: false });
  }

  // Add days of the current month
  const today = new Date();
  const todayKey = formatDateKey(today);
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(new Date(year, month, day));
    const isToday = dateKey === todayKey;
    calendarDays.push({ day, dateKey, isCurrentMonth: true, isToday });
  }

  // Add empty cells for days after the last day of the month
  const remainingCells = 42 - calendarDays.length; // 6 weeks * 7 days
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateKey = formatDateKey(new Date(nextYear, nextMonth, day));
    calendarDays.push({ day, dateKey, isCurrentMonth: false, isToday: false });
  }

  // Calculate total schedules count for the month
  const totalSchedulesThisMonth = useMemo(() => {
    let count = 0;
    schedulesByDate.forEach((schedules) => {
      count += schedules.length;
    });
    return count;
  }, [schedulesByDate]);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header with Sync Button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="bg-emerald-900 p-3 rounded-md flex-shrink-0">
            <CalendarIcon size={24} weight="light" className="text-gray-50" />
          </div>
          <div>
            <h1 className="text-2xl font-regular text-emerald-900">Overview</h1>
            <p className="text-sm font-regular text-emerald-900/60">
              View all schedules throughout the year
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && <CalendarViewSkeleton />}

      {/* Error State */}
      {error && (
        <Alert type="error">{error}</Alert>
      )}

      {/* Cache Warning */}
      {!loading && !cacheExists && (
        <Alert type="warning">
          Calendar cache not found. Please click &quot;Sync Cache&quot; button above to load schedules.
        </Alert>
      )}

      {/* Search and Filters */}
      {!loading && cacheExists && (
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlass 
              size={18} 
              weight="light" 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-900/60 lg:w-5 lg:h-5"
            />
            <input
              type="text"
              placeholder="Search schedules by title, description, or person..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full shadow-lg pl-9 lg:pl-10 pr-4 py-2 text-sm lg:text-base bg-gray-100 border border-emerald-900/20 rounded-full text-emerald-900 font-regular placeholder-emerald-900/40 focus:outline-none focus:ring-2 focus:ring-emerald-900"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-regular rounded-full transition-colors ${
                  statusFilter === "all"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-regular rounded-full transition-colors ${
                  statusFilter === "active"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-regular rounded-full transition-colors ${
                  statusFilter === "inactive"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                Inactive
              </button>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2 border-l border-emerald-900/20 pl-2">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-regular rounded-full transition-colors ${
                  typeFilter === "all"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                All Types
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("daily")}
                className={`px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-regular rounded-full transition-colors ${
                  typeFilter === "daily"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("weekly")}
                className={`px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-regular rounded-full transition-colors ${
                  typeFilter === "weekly"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("monthly")}
                className={`px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-regular rounded-full transition-colors ${
                  typeFilter === "monthly"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("other")}
                className={`px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-regular rounded-full transition-colors ${
                  typeFilter === "other"
                    ? "bg-emerald-900 text-gray-50"
                    : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                }`}
              >
                Other
              </button>
            </div>
          </div>

          {/* Results Count */}
          {(searchQuery || statusFilter !== "active" || typeFilter !== "all") && (
            <div className="text-xs lg:text-sm font-regular text-emerald-900/60">
              Found {filteredSchedules.length} schedule{filteredSchedules.length !== 1 ? "s" : ""}
              {searchQuery && ` matching &quot;${searchQuery}&quot;`}
            </div>
          )}
        </div>
      )}

      {/* Calendar Content */}
      {!loading && cacheExists && (
        <>
          {/* Month Navigation */}
          <div className="bg-gray-50 p-3 lg:p-4 border border-emerald-900/20 rounded-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 lg:mb-4">
              <div className="flex items-center gap-2 lg:gap-4 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={handlePreviousMonth}
                  className="p-2 bg-emerald-900 hover:bg-emerald-800 text-gray-50 transition-colors rounded-md"
                  aria-label="Previous month"
                  tabIndex={0}
                >
                  <CaretLeft size={18} weight="light" className="lg:w-5 lg:h-5" />
                </button>
                
                <h2 className="text-lg lg:text-xl font-regular text-emerald-900 min-w-[160px] lg:min-w-[200px] text-center">
                  {MONTHS[month]} {year}
                </h2>
                
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 bg-emerald-900 hover:bg-emerald-800 text-gray-50 transition-colors rounded-md"
                  aria-label="Next month"
                  tabIndex={0}
                >
                  <CaretRight size={18} weight="light" className="lg:w-5 lg:h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {lastSynced && (
                  <div className="text-xs lg:text-sm font-regular text-emerald-900/60">
                    Last synced: {lastSynced.toLocaleTimeString()}
                  </div>
                )}
                {totalSchedulesThisMonth > 0 && (
                  <div className="text-xs lg:text-sm font-regular text-emerald-900/60">
                    {totalSchedulesThisMonth} schedule{totalSchedulesThisMonth !== 1 ? "s" : ""} this month
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 lg:px-4 py-1.5 lg:py-2 bg-gray-100 hover:bg-gray-200 text-emerald-900 border border-emerald-900/20 text-xs lg:text-sm font-regular transition-colors rounded-md whitespace-nowrap"
                  tabIndex={0}
                >
                  Today
                </button>
              </div>
            </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0 rounded-lg overflow-hidden border border-emerald-900/10 shadow-sm">
          {/* Day Headers */}
          {DAYS_OF_WEEK_SHORT.map((day) => (
            <div
              key={day}
              className="text-center py-3 px-2 text-xs font-medium text-emerald-900/70 bg-gray-100 border-r border-b border-emerald-900/5 last:border-r-0 hidden sm:block"
            >
              {day}
            </div>
          ))}
          {/* Mobile day headers - single letter */}
          {DAYS_OF_WEEK_SHORT.map((day) => (
            <div
              key={`mobile-${day}`}
              className="text-center py-2 px-1 text-xs font-medium text-emerald-900/70 bg-gray-100 border-r border-b border-emerald-900/5 last:border-r-0 sm:hidden"
            >
              {day.charAt(0)}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map(({ day, dateKey, isCurrentMonth, isToday }, index) => {
            const schedulesForDate = schedulesByDate.get(dateKey) || [];
            const scheduleCount = schedulesForDate.length;
            const hasSchedules = scheduleCount > 0;
            const isSelected = selectedDate === dateKey;
            const isLastRow = index >= calendarDays.length - 7;
            const isLastColumn = (index + 1) % 7 === 0;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => handleDateClick(dateKey)}
                onMouseEnter={(e) => {
                  if (hasSchedules) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredDateKey(dateKey);
                    setHoveredPosition({
                      x: rect.left + rect.width / 2,
                      y: rect.top
                    });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredDateKey(null);
                  setHoveredPosition(null);
                }}
                className={`
                  min-h-[90px] lg:min-h-[110px] p-2 lg:p-3 border-r border-b border-emerald-900/5 transition-all text-left relative flex flex-col group
                  ${isLastRow ? "border-b-0" : ""}
                  ${isLastColumn ? "border-r-0" : ""}
                  ${isCurrentMonth 
                    ? "bg-white hover:bg-gray-50/80" 
                    : "bg-red-50/30 hover:bg-red-50/50"
                  }
                  ${isToday 
                    ? "bg-emerald-50/50" 
                    : ""
                  }
                  ${isSelected 
                    ? "bg-emerald-50 ring-1 ring-inset ring-emerald-900/20" 
                    : ""
                  }
                  focus:outline-none focus:ring-2 focus:ring-emerald-900/30 focus:ring-inset
                `}
                aria-label={`${isToday ? "Today, " : ""}${MONTHS[month]} ${day}, ${year}${hasSchedules ? `, ${scheduleCount} schedule${scheduleCount !== 1 ? "s" : ""}` : ""}`}
                tabIndex={0}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`
                    text-sm lg:text-base font-medium transition-colors
                    ${isToday 
                      ? "flex items-center justify-center w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-emerald-900 text-white" 
                      : isSelected
                        ? "text-emerald-900"
                        : isCurrentMonth 
                          ? "text-emerald-900/80 group-hover:text-emerald-900" 
                          : "text-red-400/60"
                    }
                  `}>
                    {day}
                  </div>
                </div>
                
                {hasSchedules && (
                  <div className="space-y-1 mt-auto">
                    {schedulesForDate.slice(0, 3).map((schedule) => {
                      // Color coding based on deadline type using emerald shades
                      const colorClass = 
                        schedule.deadline.type === "daily" ? "bg-emerald-700" :
                        schedule.deadline.type === "weekly" ? "bg-emerald-800" :
                        schedule.deadline.type === "monthly" || schedule.deadline.type === "monthly-specific" ? "bg-emerald-900" :
                        "bg-emerald-800";
                      
                      const timeStr = schedule.deadline.time ? formatTimeTo12Hour(schedule.deadline.time) : "";
                      
                      return (
                        <div
                          key={schedule.id}
                          className={`
                            ${colorClass} text-white text-[10px] lg:text-xs px-2 py-0.5 rounded truncate font-medium
                            transition-all group-hover:shadow-sm
                            ${!isCurrentMonth ? "opacity-40" : ""}
                          `}
                          title={`${schedule.title} - ${schedule.personAssigned}${timeStr ? ` at ${timeStr}` : ""}`}
                        >
                          <span className="hidden sm:inline">{timeStr && `${timeStr} `}</span>
                          {schedule.title}
                        </div>
                      );
                    })}
                    {scheduleCount > 3 && (
                      <div className={`text-[10px] lg:text-xs text-emerald-900/60 font-medium px-2 ${!isCurrentMonth ? "opacity-40" : ""}`}>
                        +{scheduleCount - 3} more
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
        </>
      )}

      {/* Schedule Details Modal */}
      {mounted && selectedDate && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div 
            ref={modalRef}
            className="bg-gray-50 shadow-xl max-w-2xl w-full max-h-[85vh] lg:max-h-[80vh] overflow-hidden flex flex-col rounded-lg animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-emerald-900 px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between border-b border-emerald-800">
              <div className="flex-1 min-w-0">
                <h3 id="modal-title" className="text-lg lg:text-xl font-regular text-gray-50 mb-1">
                  {selectedDate && (() => {
                    const [y, m, d] = selectedDate.split("-").map(Number);
                    const date = new Date(y, m - 1, d);
                    const dayOfWeek = DAYS_OF_WEEK_LONG[date.getDay()];
                    return `${dayOfWeek}, ${MONTHS[m - 1]} ${d}, ${y}`;
                  })()}
                </h3>
                <p className="text-xs lg:text-sm font-regular text-gray-50/80">
                  {selectedSchedules.length} schedule{selectedSchedules.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 hover:bg-emerald-800 transition-colors text-gray-50 rounded-md ml-4 flex-shrink-0"
                aria-label="Close modal"
                tabIndex={0}
              >
                <X size={20} weight="light" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              {selectedSchedules.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <CalendarIcon size={40} weight="light" className="mx-auto text-emerald-900/40 mb-3 lg:mb-4 lg:w-12 lg:h-12" />
                  <p className="text-sm lg:text-base font-regular text-emerald-900/60">
                    No schedules for this date
                  </p>
                </div>
              ) : (
                <div className="space-y-3 lg:space-y-4">
                  {selectedSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="bg-gray-50 shadow-xl rounded-sm hover:shadow-lg transition-shadow overflow-hidden h-full flex flex-col"
                    >
                      <div className="flex flex-col flex-1">
                        {/* Header with emerald-900 background */}
                        <div className="bg-emerald-900 w-full py-3 px-4">
                          <div className="flex items-center gap-3 mb-1">
                            <div className="bg-gray-50 p-2 rounded-md flex-shrink-0">
                              <Envelope size={20} weight="fill" className="text-emerald-900" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-regular text-gray-50 line-clamp-1 mb-0.5">
                                {schedule.title}
                              </h3>
                              <p className="text-xs font-regular text-gray-50/80">
                                Deadline {formatUpcomingDate(schedule.deadline)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 flex flex-col flex-1 bg-gray-100">
                          {/* Reminder */}
                          <div className="mb-4">
                            <p className="text-sm font-regular text-emerald-900">
                              {formatReminder(schedule.reminderDate)}
                            </p>
                          </div>

                          {/* Description */}
                          {schedule.description && (
                            <div className="mb-4">
                              <p className="text-sm font-regular text-emerald-900/60 text-justify line-clamp-3">
                                {schedule.description}
                              </p>
                            </div>
                          )}

                          {/* Details */}
                          <div className="space-y-3 mb-4 flex-1">
                          </div>
                        </div>

                        {/* Profile Section */}
                        <div className="px-4 py-3 border-t border-emerald-900/10 flex items-center gap-3 bg-gray-100">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-emerald-900 rounded-full flex items-center justify-center">
                              <span className="text-sm font-regular text-gray-50 uppercase">
                                {schedule.personAssigned.charAt(0) || schedule.personEmail.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-regular text-emerald-900 truncate">
                              {schedule.personAssigned}
                            </p>
                            <p className="text-xs font-regular text-emerald-900/60 truncate">
                              {schedule.personEmail}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar - Days Until Deadline */}
                        {(() => {
                          const { days, hours } = calculateTimeUntilDeadline(schedule.deadline);
                          const maxDays = schedule.deadline.type === "interval" 
                            ? (schedule.deadline.days || 30) 
                            : schedule.deadline.type === "daily" 
                              ? 1 
                              : schedule.deadline.type === "weekly" 
                                ? 7 
                                : 30;
                          const totalHours = days * 24 + hours;
                          const maxHours = maxDays * 24;
                          const percentage = Math.min((totalHours / maxHours) * 100, 100);
                          
                          const progressColorClass = percentage >= 50 
                            ? 'bg-green-700' 
                            : 'bg-red-700';
                          
                          const timeText = hours > 0 
                            ? `${days}d ${hours}h left`
                            : `${days}d left`;
                          
                          return (
                            <div className="bg-emerald-900 px-4 py-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-regular text-gray-50">{timeText}</span>
                                <span className="text-xs font-regular text-gray-50/60">{formatDeadlineDate(schedule.deadline)}</span>
                              </div>
                              <div className="w-full bg-white rounded-full h-2 border border-emerald-900/20 overflow-hidden relative">
                                <div 
                                  className={`absolute top-0 left-0 h-full rounded-full transition-all ${progressColorClass}`}
                                  style={{ 
                                    width: `${percentage}%`,
                                    minWidth: percentage > 0 ? '2px' : '0'
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Time Until Email is Sent */}
                        {(() => {
                          const { days, hours, minutes, seconds, reminderDate, totalMs } = calculateTimeUntilReminderEmail(
                            schedule.deadline,
                            schedule.reminderDate,
                            schedule.createdAt,
                            currentTime
                          );
                          
                          let timeText = '';
                          if (totalMs <= 0 || (days === 0 && hours === 0 && minutes === 0 && seconds === 0)) {
                            timeText = 'Waiting Next Deadline';
                          } else if (days > 0) {
                            timeText = `${days}d ${hours}h ${minutes}m ${seconds}s until email`;
                          } else if (hours > 0) {
                            timeText = `${hours}h ${minutes}m ${seconds}s until email`;
                          } else if (minutes > 0) {
                            timeText = `${minutes}m ${seconds}s until email`;
                          } else {
                            timeText = `${seconds}s until email`;
                          }
                          
                          const reminderDateText = reminderDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          });
                          
                          return (
                            <div className="bg-emerald-900 px-4 py-2 border-t border-emerald-800">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-regular text-gray-50">{timeText}</span>
                                <span className="text-xs font-regular text-gray-50/60">{reminderDateText}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Hover Popover Portal */}
      {mounted && hoveredDateKey && hoveredPosition && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: `${hoveredPosition.x}px`,
            top: `${hoveredPosition.y}px`,
            transform: 'translate(-50%, calc(-100% - 12px))'
          }}
        >
          <div className="bg-white text-emerald-900 shadow-xl rounded-lg p-3 lg:p-4 min-w-[240px] lg:min-w-[280px] border border-emerald-900/10 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="space-y-2">
              {(() => {
                const schedulesForDate = schedulesByDate.get(hoveredDateKey) || [];
                return (
                  <>
                    {schedulesForDate.slice(0, 5).map((schedule) => {
                      const colorClass = 
                        schedule.deadline.type === "daily" ? "bg-emerald-700" :
                        schedule.deadline.type === "weekly" ? "bg-emerald-800" :
                        schedule.deadline.type === "monthly" || schedule.deadline.type === "monthly-specific" ? "bg-emerald-900" :
                        "bg-emerald-800";
                      
                      return (
                        <div key={schedule.id} className="flex items-start gap-2">
                          <div className={`flex-shrink-0 w-2 h-2 rounded-full ${colorClass} mt-1`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs lg:text-sm font-medium text-emerald-900 line-clamp-1">
                              {schedule.title}
                            </p>
                            <p className="text-[10px] lg:text-xs text-emerald-900/60 mt-0.5">
                              {schedule.personAssigned}
                              {schedule.deadline.time && ` • ${formatTimeTo12Hour(schedule.deadline.time)}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {schedulesForDate.length > 5 && (
                      <div className="text-xs text-emerald-900/50 pt-1 border-t border-emerald-900/10">
                        +{schedulesForDate.length - 5} more
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            {/* Arrow pointer */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white"></div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
