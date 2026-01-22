"use client";

import { useState, useRef, useEffect } from "react";
import { Schedule, ScheduleDeadline, ReminderDate } from "@/types";
import { Calendar, Envelope, Gear, Pencil, Trash, CheckCircle, User, ClockCounterClockwise, CheckSquare } from "phosphor-react";
import { calculateNextDeadline, calculateReminderDate } from "@/lib/deadline-calculator";

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ScheduleListProps {
  schedules: Schedule[];
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
  deleteLoading?: string | null; // ID of schedule being deleted
  sentToday?: Record<string, string>; // scheduleId -> sentAt ISO timestamp
  viewMode: "grid" | "table";
  pagination: PaginationInfo | null;
  onPageChange: (page: number) => Promise<void>;
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const formatTimeTo12Hour = (time: string): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const formatDeadline = (deadline: ScheduleDeadline): string => {
  const timeStr = deadline.time ? ` at ${formatTimeTo12Hour(deadline.time)}` : "";
  switch (deadline.type) {
    case "daily":
      return `Every day${timeStr}`;
    case "weekly":
      const dayName = DAYS_OF_WEEK[deadline.dayOfWeek || 0];
      return `Every ${dayName}${timeStr}`;
    case "monthly":
      return `Every ${deadline.dayOfMonth || 1}${getOrdinalSuffix(deadline.dayOfMonth || 1)} of the month${timeStr}`;
    case "monthly-specific":
      const monthName = MONTHS[(deadline.month || 1) - 1];
      return `Every ${deadline.day || 1}${getOrdinalSuffix(deadline.day || 1)} of ${monthName}${timeStr}`;
    case "interval":
      return `Every ${deadline.days || 1} day${(deadline.days || 1) > 1 ? "s" : ""}${timeStr}`;
    case "custom":
      return deadline.cronExpression || "Custom schedule";
    default:
      return "Unknown";
  }
};

const formatReminder = (reminderDate: ReminderDate): string => {
  const daysBefore = reminderDate.daysBefore ?? 1; // Use nullish coalescing to allow 0
  const timeStr = reminderDate.time ? ` at ${formatTimeTo12Hour(reminderDate.time)}` : "";
  
  if (daysBefore === 0) {
    return `Same day${timeStr}`;
  }
  
  return `${daysBefore} day${daysBefore !== 1 ? "s" : ""} before deadline${timeStr}`;
};

const getOrdinalSuffix = (n: number): string => {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const getDeadlineDate = (deadline: ScheduleDeadline): Date => {
  const now = new Date();
  
  // Parse time if available
  let targetHour = 14; // Default 2 PM
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

const formatUpcomingDate = (deadline: ScheduleDeadline): string => {
  const { days, hours } = calculateTimeUntilDeadline(deadline);
  
  if (days === 0 && hours < 24) {
    if (hours === 0) {
      return "today";
    }
    return hours === 1 ? "in 1hr" : `in ${hours}hrs`;
  }
  
  if (days === 1) {
    return "tomorrow";
  }
  
  if (days < 7) {
    return `in ${days}d`;
  }
  
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "in 1wk" : `in ${weeks}wks`;
  }
  
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "in 1mo" : `in ${months}mo`;
  }
  
  const years = Math.floor(days / 365);
  return years === 1 ? "in 1yr" : `in ${years}yrs`;
};

const calculateTimeUntilDeadline = (deadline: ScheduleDeadline): { days: number; hours: number } => {
  const now = new Date();
  
  // Parse time if available
  let targetHour = 14; // Default 2 PM
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
        // Same day, check if time has passed
        nextDeadline = new Date(now);
        nextDeadline.setHours(targetHour, targetMinute, 0, 0);
        if (nextDeadline <= now) {
          daysUntil = 7; // Next week
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
      const targetMonth = (deadline.month || 1) - 1; // 0-indexed
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
      // Default fallback: 30 days from now
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

const ScheduleCard = ({ 
  schedule, 
  onEdit, 
  onDelete, 
  deleteLoading,
  sentAt,
  currentTime // Receive current time from parent
}: { 
  schedule: Schedule; 
  onEdit: (schedule: Schedule) => void; 
  onDelete: (schedule: Schedule) => void; 
  deleteLoading: string | null;
  sentAt?: string; // ISO timestamp if sent today
  currentTime: Date; // Current time passed from parent
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Removed the setInterval - currentTime is now passed from parent

  const handleEdit = () => {
    setIsDropdownOpen(false);
    onEdit(schedule);
  };

  const handleDelete = () => {
    setIsDropdownOpen(false);
    onDelete(schedule);
  };

  return (
    <div className="bg-gray-50 shadow-xl rounded-sm hover:shadow-xl transition-shadow h-full flex flex-col">
      {/* Header with emerald-900 background */}
      <div className="bg-emerald-900 w-full py-3 px-4 relative flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-gray-50 p-2 rounded-md flex-shrink-0">
              <Envelope size={20} weight="fill" className="text-emerald-900" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-regular text-gray-50 line-clamp-1 mb-0.5">{schedule.title}</h3>
              <p className="text-xs font-regular text-gray-50/80">Deadline {formatUpcomingDate(schedule.deadline)}</p>
            </div>
          </div>
          
          {/* Gear Icon Button */}
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="absolute top-3 right-4 p-1.5 text-gray-50 hover:text-gray-100 hover:bg-emerald-800 rounded-md transition-colors"
            aria-label="Schedule options"
          >
            <Gear size={18} weight="light" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-12 right-4 bg-gray-50 border border-emerald-900/20 rounded-md shadow-lg z-50 min-w-[120px] overflow-hidden"
            >
              <button
                type="button"
                onClick={handleEdit}
                disabled={deleteLoading === schedule.id}
                className="w-full px-4 py-2.5 text-left text-sm font-regular text-emerald-900 hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pencil size={16} weight="light" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading === schedule.id}
                className="w-full px-4 py-2.5 text-left text-sm font-regular text-red-600 hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash size={16} weight="light" />
                <span>{deleteLoading === schedule.id ? "Deleting..." : "Delete"}</span>
              </button>
            </div>
          )}
        </div>

      {/* Card Body - Grows to fill space */}
      <div className="p-4 flex flex-col flex-1 bg-gray-100 min-h-0">
          {/* Reminder */}
          <div className="mb-4">
            <p className="text-sm font-regular text-emerald-900">
              {formatReminder(schedule.reminderDate)}
            </p>
          </div>

          {/* Sent Today Indicator */}
          {sentAt && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-300 rounded-md">
              <CheckCircle size={16} weight="fill" className="text-green-700 flex-shrink-0" />
              <span className="text-xs font-regular text-green-800">
                Email sent today at {new Date(sentAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          )}

          {/* Description */}
          {schedule.description && (
            <div className="mb-4 flex-1">
              <p className="text-sm font-regular text-emerald-900/60 text-justify line-clamp-3">
                {schedule.description}
              </p>
            </div>
          )}

          {/* Spacer to push footer down when no description */}
          {!schedule.description && <div className="flex-1" />}

        </div>

        {/* Profile Section - Always at bottom */}
        <div className="px-4 py-3 border-t border-emerald-900/10 flex items-center gap-3 bg-gray-100 flex-shrink-0">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-emerald-900 rounded-full flex items-center justify-center">
              <span className="text-sm font-regular text-gray-50 uppercase">
                {schedule.personAssigned.charAt(0) || schedule.personEmail.charAt(0)}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-regular text-emerald-900 truncate">{schedule.personAssigned}</p>
            <p className="text-xs font-regular text-emerald-900/60 truncate">{schedule.personEmail}</p>
          </div>
      </div>

      {/* Progress Bar - Days Until Deadline - Always at bottom */}
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
          
          // Determine color class: green-700 (high percentage) to red-700 (low percentage)
          // Smooth transition: 100-50% = green-700, 50-0% = red-700
          const progressColorClass = percentage >= 50 
            ? 'bg-green-700' 
            : 'bg-red-700';
          
          const timeText = hours > 0 
            ? `${days}d ${hours}h left`
            : days > 0
              ? `${days}d left`
              : "Due today";
          
          return (
            <div className="bg-emerald-900 px-4 py-2 flex-shrink-0">
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
          
          // Format time text with abbreviated units
          let timeText = '';
          if (totalMs <= 0 || (days === 0 && hours === 0 && minutes === 0 && seconds === 0)) {
            timeText = 'Waiting Next Deadline';
          } else if (days >= 30) {
            // Show months for long periods
            const months = Math.floor(days / 30);
            const remainingDays = days % 30;
            timeText = remainingDays > 0 
              ? `${months}mo ${remainingDays}d until email`
              : `${months}mo until email`;
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
            <div className="bg-emerald-900 px-4 py-2 border-t border-emerald-800 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-regular text-gray-50">{timeText}</span>
                <span className="text-xs font-regular text-gray-50/60">{reminderDateText}</span>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

export const ScheduleList = ({ schedules, onEdit, onDelete, deleteLoading, sentToday = {}, viewMode, pagination, onPageChange }: ScheduleListProps) => {
  // Single interval for all cards - much more efficient!
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (schedules.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg text-center py-8 lg:py-12 px-4">
        <Calendar size={40} weight="light" className="mx-auto text-emerald-900/40 mb-3 lg:mb-4 lg:w-12 lg:h-12" />
        <h3 className="text-base lg:text-lg font-regular text-emerald-900 mb-2">No schedules yet</h3>
        <p className="text-xs lg:text-sm font-regular text-emerald-900/60">
          Create your first schedule to get started
        </p>
      </div>
    );
  }

  if (viewMode === "table") {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg border border-emerald-900/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-emerald-900 border-b border-emerald-900/20">
                  <th className="w-1/5 px-4 py-3 text-left text-sm font-light text-gray-50 border-r border-emerald-900/20">
                    <div className="flex items-center gap-2">
                      <Envelope size={16} weight="light" />
                      <span>Title</span>
                    </div>
                  </th>
                  <th className="w-1/5 px-4 py-3 text-left text-sm font-light text-gray-50 border-r border-emerald-900/20">
                    <div className="flex items-center gap-2">
                      <User size={16} weight="light" />
                      <span>Assigned To</span>
                    </div>
                  </th>
                  <th className="w-1/5 px-4 py-3 text-left text-sm font-light text-gray-50 border-r border-emerald-900/20">
                    <div className="flex items-center gap-2">
                      <ClockCounterClockwise size={16} weight="light" />
                      <span>Schedule</span>
                    </div>
                  </th>
                  <th className="w-1/5 px-4 py-3 text-left text-sm font-light text-gray-50 border-r border-emerald-900/20">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} weight="light" />
                      <span>Next Deadline</span>
                    </div>
                  </th>
                  <th className="w-1/10 px-4 py-3 text-left text-sm font-light text-gray-50 border-r border-emerald-900/20">
                    <div className="flex items-center gap-2">
                      <CheckSquare size={16} weight="light" />
                      <span>Status</span>
                    </div>
                  </th>
                  <th className="w-1/10 px-4 py-3 text-right text-sm font-light text-gray-50">
                    <div className="flex items-center justify-end gap-2">
                      <Gear size={16} weight="light" />
                      <span>Actions</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => {
                const nextDeadline = calculateNextDeadline(schedule.deadline, currentTime, schedule.createdAt);
                calculateTimeUntilDeadline(schedule.deadline);
                const timeUntil = formatUpcomingDate(schedule.deadline);
                const deadlineDate = nextDeadline.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                });
                
                return (
                  <tr
                    key={schedule.id}
                    className="hover:bg-gray-100/50 transition-colors border-b border-emerald-900/10"
                  >
                    <td className="px-4 py-3 border-r border-emerald-900/10">
                      <span className="text-sm font-regular text-emerald-900 truncate block">{schedule.title}</span>
                    </td>
                    <td className="px-4 py-3 border-r border-emerald-900/10">
                      <div className="flex flex-col">
                        <span className="text-sm font-regular text-emerald-900 truncate">{schedule.personAssigned}</span>
                        <span className="text-xs font-regular font-mono text-emerald-900/60 truncate">{schedule.personEmail}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r border-emerald-900/10">
                      <span className="text-sm font-regular text-emerald-900 truncate block">
                        {formatDeadline(schedule.deadline)}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-emerald-900/10">
                      <div className="flex flex-col">
                        <span className="text-sm font-regular text-emerald-900">{deadlineDate}</span>
                        <span className="text-xs font-regular text-emerald-900/60 capitalize">{timeUntil}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r border-emerald-900/10">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-regular capitalize ${
                          schedule.status === "active"
                            ? "bg-emerald-900 text-gray-50"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {schedule.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(schedule)}
                          className="p-1.5 text-emerald-900 hover:bg-emerald-900/10 rounded-md transition-colors"
                          title="Edit"
                          aria-label={`Edit ${schedule.title}`}
                        >
                          <Pencil size={16} weight="light" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(schedule)}
                          disabled={deleteLoading === schedule.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                          aria-label={`Delete ${schedule.title}`}
                        >
                          <Trash size={16} weight="light" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination for Table View */}
      {pagination && pagination.totalPages > 1 && (
        <>
          {/* Mobile Pagination - Simplified */}
          <div className="lg:hidden flex items-center justify-center gap-2 px-4">
            <button
              type="button"
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-2 text-sm font-regular rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-900 text-gray-50 disabled:bg-gray-300"
            >
              ←
            </button>
            
            <span className="px-3 py-2 text-sm font-regular text-emerald-900">
              {pagination.currentPage} of {pagination.totalPages}
            </span>
            
            <button
              type="button"
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-2 text-sm font-regular rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-900 text-gray-50 disabled:bg-gray-300"
            >
              →
            </button>
          </div>

          {/* Desktop Pagination - Full */}
          <div className="hidden lg:flex items-center justify-between px-4">
            <p className="text-sm font-regular text-emerald-900/60">
              Showing {((pagination.currentPage - 1) * 6) + 1} to {Math.min(pagination.currentPage * 6, pagination.totalCount)} of {pagination.totalCount} schedules
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onPageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="px-3 py-1.5 text-sm font-regular rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200 disabled:hover:bg-gray-100"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {(() => {
                  const maxButtons = 5;
                  const pages = [];
                  
                  // Calculate which pages to show
                  let startPage = Math.max(1, pagination.currentPage - Math.floor(maxButtons / 2));
                  const endPage = Math.min(pagination.totalPages, startPage + maxButtons - 1);
                  
                  // Adjust if we're near the end
                  if (endPage - startPage < maxButtons - 1) {
                    startPage = Math.max(1, endPage - maxButtons + 1);
                  }
                  
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                  }
                  
                  return pages.map(page => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => onPageChange(page)}
                      className={`px-3 py-1.5 text-sm font-regular rounded-md transition-colors ${
                        pagination.currentPage === page
                          ? "bg-emerald-900 text-gray-50"
                          : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                      }`}
                    >
                      {page}
                    </button>
                  ));
                })()}
              </div>
              <button
                type="button"
                onClick={() => onPageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1.5 text-sm font-regular rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200 disabled:hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {schedules.map((schedule) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            onEdit={onEdit}
            onDelete={onDelete}
            deleteLoading={deleteLoading ?? null}
            sentAt={sentToday[schedule.id]}
            currentTime={currentTime}
          />
        ))}
      </div>

      {/* Pagination for Grid View */}
      {pagination && pagination.totalPages > 1 && (
        <>
          {/* Mobile Pagination - Simplified */}
          <div className="lg:hidden flex items-center justify-center gap-2 px-4">
            <button
              type="button"
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-2 text-sm font-regular rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-900 text-gray-50 disabled:bg-gray-300"
            >
              ←
            </button>
            
            <span className="px-3 py-2 text-sm font-regular text-emerald-900">
              {pagination.currentPage} of {pagination.totalPages}
            </span>
            
            <button
              type="button"
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-2 text-sm font-regular rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-900 text-gray-50 disabled:bg-gray-300"
            >
              →
            </button>
          </div>

          {/* Desktop Pagination - Full */}
          <div className="hidden lg:flex items-center justify-between px-4">
            <p className="text-sm font-regular text-emerald-900/60">
              Showing {((pagination.currentPage - 1) * 6) + 1} to {Math.min(pagination.currentPage * 6, pagination.totalCount)} of {pagination.totalCount} schedules
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onPageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="px-3 py-1.5 text-sm font-regular rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200 disabled:hover:bg-gray-100"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {(() => {
                  const maxButtons = 5;
                  const pages = [];
                  
                  // Calculate which pages to show
                  let startPage = Math.max(1, pagination.currentPage - Math.floor(maxButtons / 2));
                  const endPage = Math.min(pagination.totalPages, startPage + maxButtons - 1);
                  
                  // Adjust if we're near the end
                  if (endPage - startPage < maxButtons - 1) {
                    startPage = Math.max(1, endPage - maxButtons + 1);
                  }
                  
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                  }
                  
                  return pages.map(page => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => onPageChange(page)}
                      className={`px-3 py-1.5 text-sm font-regular rounded-md transition-colors ${
                        pagination.currentPage === page
                          ? "bg-emerald-900 text-gray-50"
                          : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                      }`}
                    >
                      {page}
                    </button>
                  ));
                })()}
              </div>
              <button
                type="button"
                onClick={() => onPageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1.5 text-sm font-regular rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200 disabled:hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
