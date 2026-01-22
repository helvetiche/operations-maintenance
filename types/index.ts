export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Schedule Types
export type ScheduleDeadlineType = 
  | "daily"
  | "weekly"
  | "monthly"
  | "monthly-specific"
  | "interval"
  | "hourly"
  | "per-minute"
  | "custom";

export type ReminderDateType = "relative" | "absolute";

export interface ScheduleDeadline {
  type: ScheduleDeadlineType;
  // For weekly: 0-6 (0=Sunday)
  dayOfWeek?: number;
  // For monthly: 1-31
  dayOfMonth?: number;
  // For monthly-specific: 1-12 (month), 1-31 (day)
  month?: number;
  day?: number;
  // For interval: number of days
  days?: number;
  // For hourly: number of hours (e.g., 1 = every hour, 2 = every 2 hours)
  hours?: number;
  // For per-minute: number of minutes (e.g., 1 = every minute, 5 = every 5 minutes)
  minutes?: number;
  // For custom: cron expression
  cronExpression?: string;
  // For preset types: time in HH:mm format (24-hour)
  time?: string;
}

export interface ReminderDate {
  type: ReminderDateType;
  // For relative: days before deadline
  daysBefore?: number;
  // For relative: time in HH:mm format (24-hour)
  time?: string;
  // For absolute: ISO date string
  dateTime?: string;
}

export interface Schedule {
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: ScheduleDeadline;
  reminderDate: ReminderDate;
  personAssigned: string;
  personEmail: string;
  status: "active" | "inactive";
  hideFromCalendar?: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// Task Completion Types
export interface TaskCompletion {
  id: string;
  scheduleId: string;
  userId: string;
  completedAt: string; // ISO timestamp
  completedBy: string; // User email
  completedByName?: string; // User name
  periodStart: string; // ISO timestamp - start of the period (day/week/month)
  periodEnd: string; // ISO timestamp - end of the period
  deadlineType: ScheduleDeadlineType;
  notes?: string;
}

export interface ScheduleWithCompletion extends Schedule {
  currentPeriodCompleted?: boolean;
  lastCompletedAt?: string;
}

// Employee Types
export interface Employee {
  id: string;
  userId: string;
  name: string;
  email: string; // Optional - can be empty string
  position: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// Cron Log Types
export interface CronLog {
  id: string;
  timestamp: string; // ISO timestamp
  interval: number | null; // Interval in milliseconds from previous cron, null if first log
  checked: number; // Number of schedules checked
  sent: number; // Number of reminders sent
  skipped: number; // Number of reminders skipped
  errors: number; // Number of errors
  createdAt: string; // ISO timestamp
}
