"use client";

import { useState } from "react";
import { ScheduleDeadline } from "@/types";

interface DeadlineSelectorProps {
  value: ScheduleDeadline;
  onChange: (deadline: ScheduleDeadline) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const SCHEDULE_TYPES = [
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "monthly-specific", label: "Specific Date" },
  { value: "interval", label: "Every N days" },
] as const;

export const DeadlineSelector = ({ value, onChange }: DeadlineSelectorProps) => {
  const [mode, setMode] = useState<"preset" | "custom">(
    value.type === "custom" ? "custom" : "preset"
  );

  const handleTypeChange = (type: ScheduleDeadline["type"]) => {
    const defaultTime = "17:00"; // 5:00 PM default
    switch (type) {
      case "daily":
        onChange({ type: "daily", time: defaultTime });
        break;
      case "weekly":
        onChange({ type: "weekly", dayOfWeek: 1, time: defaultTime });
        break;
      case "monthly":
        onChange({ type: "monthly", dayOfMonth: 1, time: defaultTime });
        break;
      case "monthly-specific":
        onChange({ type: "monthly-specific", month: 1, day: 1, time: defaultTime });
        break;
      case "interval":
        onChange({ type: "interval", days: 1, time: defaultTime });
        break;
      case "custom":
        onChange({ type: "custom", cronExpression: "" });
        break;
    }
  };

  const handlePresetChange = (field: string, fieldValue: number | string) => {
    if (value.type === "weekly") {
      if (field === "dayOfWeek") {
        onChange({ ...value, dayOfWeek: fieldValue as number });
      } else if (field === "time") {
        onChange({ ...value, time: fieldValue as string });
      }
    } else if (value.type === "monthly") {
      if (field === "dayOfMonth") {
        onChange({ ...value, dayOfMonth: fieldValue as number });
      } else if (field === "time") {
        onChange({ ...value, time: fieldValue as string });
      }
    } else if (value.type === "monthly-specific") {
      if (field === "time") {
        onChange({ ...value, time: fieldValue as string });
      } else {
        onChange({ ...value, [field]: fieldValue });
      }
    } else if (value.type === "interval") {
      if (field === "days") {
        onChange({ ...value, days: fieldValue as number });
      } else if (field === "time") {
        onChange({ ...value, time: fieldValue as string });
      }
    } else if (value.type === "daily") {
      if (field === "time") {
        onChange({ ...value, time: fieldValue as string });
      }
    } else if (value.type === "custom") {
      onChange({ ...value, cronExpression: fieldValue as string });
    }
  };

  const formatTime = (time: string): string => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getPreviewText = (): string => {
    const timeStr = value.time ? ` at ${formatTime(value.time)}` : "";
    switch (value.type) {
      case "daily":
        return `Every day${timeStr}`;
      case "weekly":
        const dayName = DAYS_OF_WEEK.find((d) => d.value === value.dayOfWeek)?.label || "Monday";
        return `Every ${dayName}${timeStr}`;
      case "monthly":
        return `Every ${value.dayOfMonth || 1}${getOrdinalSuffix(value.dayOfMonth || 1)} of the month${timeStr}`;
      case "monthly-specific":
        const monthName = MONTHS.find((m) => m.value === value.month)?.label || "January";
        return `Every ${value.day || 1}${getOrdinalSuffix(value.day || 1)} of ${monthName}${timeStr}`;
      case "interval":
        return `Every ${value.days || 1} day${(value.days || 1) > 1 ? "s" : ""}${timeStr}`;
      case "custom":
        return value.cronExpression || "Custom cron expression";
      default:
        return "Select a schedule";
    }
  };

  const getOrdinalSuffix = (n: number): string => {
    const j = n % 10;
    const k = n % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("preset")}
          className={`px-4 py-2 text-sm font-regular rounded-md transition-colors ${
            mode === "preset"
              ? "bg-emerald-900 text-gray-50"
              : "bg-gray-100 text-emerald-900 border border-emerald-900/20"
          }`}
        >
          Preset
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("custom");
            if (value.type !== "custom") {
              onChange({ type: "custom", cronExpression: "" });
            }
          }}
          className={`px-4 py-2 text-sm font-regular rounded-md transition-colors ${
            mode === "custom"
              ? "bg-emerald-900 text-gray-50"
              : "bg-gray-100 text-emerald-900 border border-emerald-900/20"
          }`}
        >
          Custom
        </button>
      </div>

      {mode === "preset" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-regular text-emerald-900 mb-3">
              Schedule Type
            </label>
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value as ScheduleDeadline["type"])}
                  className={`px-4 py-2 rounded-full text-sm font-regular transition-colors ${
                    value.type === type.value
                      ? "bg-emerald-900 text-gray-50"
                      : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {value.type === "weekly" && (
            <div>
              <label className="block text-sm font-regular text-emerald-900 mb-2">
                Day of Week
              </label>
              <select
                value={value.dayOfWeek || 1}
                onChange={(e) => handlePresetChange("dayOfWeek", parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-100 border border-emerald-900/20 rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {value.type === "monthly" && (
            <div>
              <label className="block text-sm font-regular text-emerald-900 mb-2">
                Day of Month (1-31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={value.dayOfMonth || 1}
                onChange={(e) => handlePresetChange("dayOfMonth", parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 bg-gray-100 border border-emerald-900/20 rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900"
              />
            </div>
          )}

          {value.type === "monthly-specific" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-regular text-emerald-900 mb-2">
                  Month
                </label>
                <select
                  value={value.month || 1}
                  onChange={(e) => handlePresetChange("month", parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-100 border border-emerald-900/20 rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900"
                >
                  {MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-regular text-emerald-900 mb-2">
                  Day (1-31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={value.day || 1}
                  onChange={(e) => handlePresetChange("day", parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 bg-gray-100 border border-emerald-900/20 rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>
            </div>
          )}

          {value.type === "interval" && (
            <div>
              <label className="block text-sm font-regular text-emerald-900 mb-2">
                Number of Days
              </label>
              <input
                type="number"
                min="1"
                value={value.days || 1}
                onChange={(e) => handlePresetChange("days", parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 bg-gray-100 border border-emerald-900/20 rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900"
              />
            </div>
          )}

          {value.type !== "custom" && (
            <div>
              <label className="block text-sm font-regular text-emerald-900 mb-2">
                Time
              </label>
              <input
                type="time"
                value={value.time || "17:00"}
                onChange={(e) => handlePresetChange("time", e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 border border-emerald-900/20 rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900"
              />
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-regular text-emerald-900 mb-2">
            Cron Expression
          </label>
          <input
            type="text"
            value={value.cronExpression || ""}
            onChange={(e) => handlePresetChange("cronExpression", e.target.value)}
            placeholder="e.g., 0 9 * * 1 (every Monday at 9 AM)"
            className="w-full px-4 py-2 bg-gray-100 border border-emerald-900/20 rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900"
          />
          <p className="mt-2 text-xs font-regular text-emerald-900/60">
            Use standard cron syntax for advanced scheduling
          </p>
        </div>
      )}

      <div className="p-3 bg-emerald-900/10 rounded-md border border-emerald-900/20">
        <p className="text-sm font-regular text-emerald-900">
          <span className="font-medium">Preview:</span> {getPreviewText()}
        </p>
      </div>
    </div>
  );
};
