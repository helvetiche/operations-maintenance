"use client";

import { useState } from "react";
import { Schedule, ScheduleDeadline, ReminderDate } from "@/types";
import { DeadlineSelector } from "./DeadlineSelector";
import { ReminderDateSelector } from "./ReminderDateSelector";
import { EmployeeSelector } from "./EmployeeSelector";
import { Button } from "../ui/Button";

interface ScheduleFormProps {
  schedule?: Schedule;
  onSubmit: (data: {
    title: string;
    description: string;
    deadline: ScheduleDeadline;
    reminderDate: ReminderDate;
    personAssigned: string;
    personEmail: string;
    status: "active" | "inactive";
    hideFromCalendar?: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const ScheduleForm = ({
  schedule,
  onSubmit,
  onCancel,
  loading = false,
}: ScheduleFormProps) => {
  const [title, setTitle] = useState(schedule?.title || "");
  const [description, setDescription] = useState(schedule?.description || "");
  const [deadline, setDeadline] = useState<ScheduleDeadline>(
    schedule?.deadline || { type: "daily", time: "17:00" }
  );
  const [reminderDate, setReminderDate] = useState<ReminderDate>(
    schedule?.reminderDate || { type: "relative", daysBefore: 1, time: "08:00" }
  );
  const [personAssigned, setPersonAssigned] = useState(schedule?.personAssigned || "");
  const [personEmail, setPersonEmail] = useState(schedule?.personEmail || "");
  const [status, setStatus] = useState<"active" | "inactive">(schedule?.status || "active");
  const [hideFromCalendar, setHideFromCalendar] = useState(schedule?.hideFromCalendar || false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!personAssigned.trim()) {
      newErrors.personAssigned = "Person assigned is required";
    }

    if (!personEmail.trim()) {
      newErrors.personEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personEmail)) {
      newErrors.personEmail = "Invalid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      deadline,
      reminderDate,
      personAssigned: personAssigned.trim(),
      personEmail: personEmail.trim(),
      status,
      hideFromCalendar,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-regular text-emerald-900 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full px-4 py-2 bg-gray-100 border ${
              errors.title ? "border-red-500" : "border-emerald-900/20"
            } rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900`}
            placeholder="e.g., Submit Weekly Status Report"
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-regular text-emerald-900 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 bg-gray-100 border border-emerald-900/20 rounded-md text-emerald-900 font-regular focus:outline-none focus:ring-2 focus:ring-emerald-900 resize-none"
            placeholder="Additional details about this schedule..."
          />
        </div>

        <div>
          <label className="block text-sm font-regular text-emerald-900 mb-2">
            Schedule Deadline
          </label>
          <DeadlineSelector value={deadline} onChange={setDeadline} />
        </div>

        <div>
          <label className="block text-sm font-regular text-emerald-900 mb-2">
            Reminder Date
          </label>
          <ReminderDateSelector value={reminderDate} onChange={setReminderDate} />
        </div>

        <div>
          <label className="block text-sm font-regular text-emerald-900 mb-2">
            Person Assigned <span className="text-red-500">*</span>
          </label>
          <EmployeeSelector
            value={personAssigned && personEmail ? { name: personAssigned, email: personEmail } : undefined}
            onChange={(employee) => {
              setPersonAssigned(employee.name);
              setPersonEmail(employee.email);
            }}
            error={errors.personAssigned || errors.personEmail}
          />
        </div>

        <div>
          <label className="block text-sm font-regular text-emerald-900 mb-2">
            Hide from Calendar
          </label>
          <button
            type="button"
            onClick={() => setHideFromCalendar(!hideFromCalendar)}
            className={`px-4 py-2 rounded-full text-sm font-regular transition-colors ${
              hideFromCalendar
                ? "bg-emerald-900 text-gray-50"
                : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
            }`}
          >
            {hideFromCalendar ? "Hidden from Calendar" : "Visible in Calendar"}
          </button>
          <p className="text-xs font-regular text-emerald-900/60 mt-2">
            {hideFromCalendar 
              ? "This schedule will not appear in the calendar view."
              : "This schedule will appear in the calendar view."}
          </p>
        </div>

        <div>
          <label className="block text-sm font-regular text-emerald-900 mb-2">
            Status
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setStatus("active")}
              className={`px-4 py-2 rounded-full text-sm font-regular transition-colors ${
                status === "active"
                  ? "bg-emerald-900 text-gray-50"
                  : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatus("inactive")}
              className={`px-4 py-2 rounded-full text-sm font-regular transition-colors ${
                status === "inactive"
                  ? "bg-emerald-900 text-gray-50"
                  : "bg-gray-100 text-emerald-900 border border-emerald-900/20 hover:bg-gray-200"
              }`}
            >
              Inactive
            </button>
          </div>
          <p className="text-xs font-regular text-emerald-900/60">
            {status === "active" 
              ? "Email reminders will be sent automatically according to the schedule after creation."
              : "Email reminders are disabled. The schedule will not send any emails."}
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="bg-emerald-900 hover:bg-emerald-800 text-gray-50"
          >
            {loading ? "Saving..." : schedule ? "Update Schedule" : "Create Schedule"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 text-emerald-900 border border-emerald-900/20"
          >
            Cancel
          </Button>
        </div>
      </form>
  );
};
