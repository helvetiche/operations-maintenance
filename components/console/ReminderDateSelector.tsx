"use client";

import { useState, useEffect } from "react";
import { ReminderDate } from "@/types";

interface ReminderDateSelectorProps {
  value: ReminderDate;
  onChange: (reminderDate: ReminderDate) => void;
}

export const ReminderDateSelector = ({ value, onChange }: ReminderDateSelectorProps) => {
  const [daysBefore, setDaysBefore] = useState(value.daysBefore ?? 1);
  const [time, setTime] = useState(value.time || "08:00"); // 8:00 AM default

  useEffect(() => {
    onChange({ type: "relative", daysBefore, time });
  }, [daysBefore, time]);

  const formatTime = (time: string): string => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-regular text-emerald-900 mb-2">
          Days Before Deadline
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={daysBefore}
            onChange={(e) => setDaysBefore(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 bg-gray-100 border border-emerald-900/20 rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900"
          />
          <span className="text-sm font-regular text-emerald-900 whitespace-nowrap">
            day{daysBefore !== 1 ? "s" : ""} before
          </span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-regular text-emerald-900 mb-2">
          Send Email At (Time)
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full px-4 py-2 bg-gray-100 border border-emerald-900/20 rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900"
        />
        <p className="mt-2 text-xs font-regular text-emerald-900/60">
          {daysBefore === 0 
            ? "For same-day reminders (0 days before), the time should be BEFORE the deadline time."
            : `The email will be sent at ${formatTime(time)} on the reminder day.`}
        </p>
      </div>
      <div className="p-3 bg-emerald-900/10 rounded-md border border-emerald-900/20">
        <p className="text-sm font-regular text-emerald-900">
          <span className="font-medium">Reminder:</span>{" "}
          {daysBefore === 0 
            ? `Same day at ${formatTime(time)}` 
            : `${daysBefore} day${daysBefore !== 1 ? "s" : ""} before deadline at ${formatTime(time)}`}
        </p>
      </div>
    </div>
  );
};
