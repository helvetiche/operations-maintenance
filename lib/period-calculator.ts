import { ScheduleDeadlineType } from "@/types";

export interface Period {
  start: string; // ISO timestamp
  end: string; // ISO timestamp
}

/**
 * Calculate the current period boundaries for a given deadline type
 */
export function getCurrentPeriod(deadlineType: ScheduleDeadlineType): Period {
  const now = new Date();
  
  switch (deadlineType) {
    case "daily": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      end.setMilliseconds(-1);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }

    case "weekly": {
      const start = new Date(now);
      const day = start.getDay();
      start.setDate(start.getDate() - day); // Start of week (Sunday)
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      end.setMilliseconds(-1);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }

    case "monthly": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      end.setMilliseconds(-1);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }

    case "monthly-specific": {
      // Treat as yearly period
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      end.setMilliseconds(-1);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }

    case "interval":
    case "hourly":
    case "per-minute":
    case "custom":
    default: {
      // For custom/interval types, use daily period as default
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      end.setMilliseconds(-1);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }
  }
}

/**
 * Get a human-readable label for the period
 */
export function getPeriodLabel(deadlineType: ScheduleDeadlineType): string {
  switch (deadlineType) {
    case "daily":
      return "Today";
    case "weekly":
      return "This Week";
    case "monthly":
      return "This Month";
    case "monthly-specific":
      return "This Year";
    default:
      return "Current Period";
  }
}
