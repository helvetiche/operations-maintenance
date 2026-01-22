import { Schedule } from "@/types";
import { calculateNextDeadline } from "./deadline-calculator";

/**
 * Get all dates in a month where a schedule should appear
 */
export const getScheduleDatesForMonth = (
  schedule: Schedule,
  year: number,
  month: number
): Date[] => {
  const dates: Date[] = [];
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const deadline = schedule.deadline;

  switch (deadline.type) {
    case "daily": {
      // Add every day of the month
      for (let day = 1; day <= endOfMonth.getDate(); day++) {
        const date = new Date(year, month, day);
        if (deadline.time) {
          const [hours, minutes] = deadline.time.split(":").map(Number);
          date.setHours(hours, minutes, 0, 0);
        }
        dates.push(date);
      }
      break;
    }

    case "weekly": {
      const targetDay = deadline.dayOfWeek ?? 0;
      // Find all occurrences of this day in the month
      for (let day = 1; day <= endOfMonth.getDate(); day++) {
        const date = new Date(year, month, day);
        if (date.getDay() === targetDay) {
          if (deadline.time) {
            const [hours, minutes] = deadline.time.split(":").map(Number);
            date.setHours(hours, minutes, 0, 0);
          }
          dates.push(date);
        }
      }
      break;
    }

    case "monthly": {
      const targetDay = deadline.dayOfMonth ?? 1;
      // Handle months with fewer days (e.g., Feb 30 -> Feb 28/29)
      const lastDayOfMonth = endOfMonth.getDate();
      const actualDay = Math.min(targetDay, lastDayOfMonth);
      const date = new Date(year, month, actualDay);
      if (deadline.time) {
        const [hours, minutes] = deadline.time.split(":").map(Number);
        date.setHours(hours, minutes, 0, 0);
      }
      dates.push(date);
      break;
    }

    case "monthly-specific": {
      const targetMonth = (deadline.month ?? 1) - 1; // 0-indexed
      const targetDay = deadline.day ?? 1;
      
      // Only add if this is the target month
      if (month === targetMonth) {
        const lastDayOfMonth = endOfMonth.getDate();
        const actualDay = Math.min(targetDay, lastDayOfMonth);
        const date = new Date(year, month, actualDay);
        if (deadline.time) {
          const [hours, minutes] = deadline.time.split(":").map(Number);
          date.setHours(hours, minutes, 0, 0);
        }
        dates.push(date);
      }
      break;
    }

    case "interval": {
      const intervalDays = deadline.days ?? 1;
      const createdAt = schedule.createdAt ? new Date(schedule.createdAt) : new Date();
      
      // Calculate all occurrences within the month
      const currentDate = new Date(startOfMonth);
      
      // Find the first occurrence in or before the month
      const daysSinceCreation = Math.floor(
        (currentDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const intervalsSinceCreation = Math.floor(daysSinceCreation / intervalDays);
      
      // Start from the first interval before or at the start of the month
      const checkDate = new Date(createdAt);
      checkDate.setDate(checkDate.getDate() + intervalsSinceCreation * intervalDays);
      
      // If we're before the month, move forward
      while (checkDate < startOfMonth) {
        checkDate.setDate(checkDate.getDate() + intervalDays);
      }
      
      // Add all occurrences within the month
      while (checkDate <= endOfMonth) {
        if (deadline.time) {
          const [hours, minutes] = deadline.time.split(":").map(Number);
          checkDate.setHours(hours, minutes, 0, 0);
        }
        dates.push(new Date(checkDate));
        checkDate.setDate(checkDate.getDate() + intervalDays);
      }
      break;
    }

    case "custom": {
      // For custom cron, we'll calculate the next few occurrences
      // This is a simplified version - in production, use a cron parser
      const nextDeadline = calculateNextDeadline(deadline, startOfMonth, schedule.createdAt);
      if (nextDeadline >= startOfMonth && nextDeadline <= endOfMonth) {
        dates.push(nextDeadline);
      }
      break;
    }
  }

  return dates;
};

/**
 * Group schedules by date for a given month
 */
export const groupSchedulesByDate = (
  schedules: Schedule[],
  year: number,
  month: number
): Map<string, Schedule[]> => {
  const scheduleMap = new Map<string, Schedule[]>();

  schedules.forEach((schedule) => {
    // Only process active schedules
    if (schedule.status !== "active") return;

    const dates = getScheduleDatesForMonth(schedule, year, month);
    
    dates.forEach((date) => {
      // Use YYYY-MM-DD as the key
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      
      if (!scheduleMap.has(dateKey)) {
        scheduleMap.set(dateKey, []);
      }
      scheduleMap.get(dateKey)!.push(schedule);
    });
  });

  return scheduleMap;
};

/**
 * Get the first day of the week for a month (0 = Sunday, 1 = Monday, etc.)
 */
export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

/**
 * Get the number of days in a month
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Format date to YYYY-MM-DD string
 */
export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
